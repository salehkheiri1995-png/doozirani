/**
 * Native Android RFCOMM transport for two-phone Bluetooth play.
 *
 * There is exactly one transport instance. UI components subscribe to it;
 * they never install or replace the message receiver. The host is the single
 * authoritative executor: guests send commands, the host applies them and
 * broadcasts the resulting snapshot.
 */

import type { MatchCommand, MatchState, MatchVariant } from '../game/match';
import {
  PROTOCOL_VERSION,
  createCommandMessage,
  encodeWireMessage,
  parseWireMessage,
  type PlayerRole,
  type SessionInfo,
  type WireMessage,
} from '../multiplayer/protocol';

export type BluetoothPhase =
  | 'unsupported'
  | 'permission_required'
  | 'bluetooth_disabled'
  | 'idle'
  | 'hosting'
  | 'connecting'
  | 'handshaking'
  | 'ready'
  | 'disconnected'
  | 'error';

export interface RemoteDevice {
  name: string;
  address: string;
}

export interface MultiplayerState {
  phase: BluetoothPhase;
  isSupported: boolean;
  isNative: boolean;
  isHost: boolean;
  deviceName: string | null;
  statusText: string;
  isScanning: boolean;
  pairedDevices: RemoteDevice[];
  error: string | null;
  matchId: string | null;
  role: PlayerRole | null;
  remoteStoneSkinId: string | null;
  remoteProfileFrameId: string | null;
  remoteName: string | null;
}

export type RematchEvent =
  | { type: 'requested' }
  | { type: 'accepted' }
  | { type: 'declined' }
  | { type: 'started'; state: MatchState };

export interface NativeStatus {
  supported: boolean;
  enabled: boolean;
  permission: 'granted' | 'required' | 'denied' | 'permanently_denied';
}

interface LocalIdentity {
  displayName: string;
  stoneSkinId: string;
  profileFrameId: string;
}

export interface SessionStart {
  variant: MatchVariant;
  identity: LocalIdentity;
}

const HANDSHAKE_TIMEOUT_MS = 15_000;
const ACK_TIMEOUT_MS = 4_000;
const MAX_REMEMBERED_COMMANDS = 100;

function createId(prefix: string): string {
  const api = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (api && typeof api.randomUUID === 'function') return `${prefix}-${api.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function initialState(nativeSupported: boolean): MultiplayerState {
  return {
    phase: nativeSupported ? 'idle' : 'unsupported',
    isSupported: nativeSupported,
    isNative: nativeSupported,
    isHost: false,
    deviceName: null,
    statusText: nativeSupported
      ? 'برای شروع، یک گوشی میزبان شود و گوشی دیگر به آن وصل شود.'
      : 'بلوتوث مستقیم فقط در نسخه اندروید در دسترس است.',
    isScanning: false,
    pairedDevices: [],
    error: null,
    matchId: null,
    role: null,
    remoteStoneSkinId: null,
    remoteProfileFrameId: null,
    remoteName: null,
  };
}

type NativeBridge = {
  isNative?: () => boolean;
  isSupported?: () => boolean;
  isEnabled?: () => boolean;
  getStatus?: () => string;
  requestPermissions?: () => void;
  requestEnable?: () => void;
  getPairedDevices?: () => string;
  startServer?: () => void;
  cancelServer?: () => void;
  connectToDevice?: (address: string) => void;
  sendData?: (message: string) => void;
  disconnect?: () => void;
};

function getBridge(): NativeBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { AndroidBluetooth?: NativeBridge }).AndroidBluetooth;
}

export class DirectMultiplayerManager {
  constructor(private readonly bridgeProvider: () => NativeBridge | undefined = getBridge) {}

  private bridge(): NativeBridge | undefined {
    return this.bridgeProvider();
  }

  private state: MultiplayerState = initialState(false);
  private stateListeners = new Set<(state: MultiplayerState) => void>();
  private sessionListeners = new Set<(session: SessionInfo) => void>();
  private commandListeners = new Set<
    (payload: { command: MatchCommand; commandId: string }) => void
  >();
  private snapshotListeners = new Set<(state: MatchState) => void>();
  private rematchListeners = new Set<(event: RematchEvent) => void>();
  private errorListeners = new Set<(error: { code: string; messageFa: string }) => void>();
  private resyncListeners = new Set<() => void>();

  private initialized = false;
  private localIdentity: LocalIdentity = {
    displayName: 'بازیکن',
    stoneSkinId: 'skin_classic',
    profileFrameId: 'frame_simple',
  };
  private desiredVariant: MatchVariant = 'three_dooz';
  private pendingAction: (() => void) | null = null;
  private session: SessionInfo | null = null;
  private handshakeTimer: ReturnType<typeof setTimeout> | null = null;
  private ackTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingAck: { commandId: string; version: number; retried: boolean } | null = null;
  private lastSnapshot: MatchState | null = null;
  private lastSentVersion = -1;
  private seenCommandIds = new Set<string>();
  private commandOrder: string[] = [];
  private rematchState: 'none' | 'requested' | 'accepted' = 'none';

  public init(): void {
    if (this.initialized) {
      this.installNativeCallbacks();
      return;
    }
    this.initialized = true;
    const bridge = this.bridge();
    this.update({
      isNative: !!bridge,
      isSupported: !!bridge,
      phase: bridge ? (this.state.phase === 'unsupported' ? 'idle' : this.state.phase) : 'unsupported',
      statusText: bridge
        ? 'برای شروع، یک گوشی میزبان شود و گوشی دیگر به آن وصل شود.'
        : 'بلوتوث مستقیم فقط در نسخه اندروید در دسترس است.',
    });
    this.installNativeCallbacks();
  }

  public subscribeState(listener: (state: MultiplayerState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeSession(listener: (session: SessionInfo) => void): () => void {
    this.sessionListeners.add(listener);
    if (this.session) listener(this.session);
    return () => this.sessionListeners.delete(listener);
  }

  public subscribeCommands(
    listener: (payload: { command: MatchCommand; commandId: string }) => void
  ): () => void {
    this.commandListeners.add(listener);
    return () => this.commandListeners.delete(listener);
  }

  public subscribeSnapshots(listener: (state: MatchState) => void): () => void {
    this.snapshotListeners.add(listener);
    return () => this.snapshotListeners.delete(listener);
  }

  public subscribeRematch(
    listener: (event: RematchEvent) => void
  ): () => void {
    this.rematchListeners.add(listener);
    return () => this.rematchListeners.delete(listener);
  }

  public subscribeErrors(listener: (error: { code: string; messageFa: string }) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  public subscribeResyncRequests(listener: () => void): () => void {
    this.resyncListeners.add(listener);
    return () => this.resyncListeners.delete(listener);
  }

  public getState(): MultiplayerState {
    return this.state;
  }

  public getSession(): SessionInfo | null {
    return this.session;
  }

  public isNativeAvailable(): boolean {
    return !!this.bridge();
  }

  public setIdentity(identity: Partial<LocalIdentity>): void {
    this.localIdentity = { ...this.localIdentity, ...identity };
  }

  public async refreshStatus(): Promise<NativeStatus | null> {
    const bridge = this.bridge();
    if (!bridge) {
      this.update({ phase: 'unsupported', isSupported: false, isNative: false });
      return null;
    }
    const status = this.readStatus();
    if (!status) return null;
    if (!status.supported) {
      this.update({
        phase: 'unsupported',
        isSupported: false,
        statusText: 'این گوشی بلوتوث کلاسیک ندارد.',
      });
      return status;
    }
    if (status.permission !== 'granted') {
      this.update({
        phase: 'permission_required',
        statusText: 'برای اتصال دو گوشی، مجوز «دستگاه‌های نزدیک» لازم است.',
      });
    } else if (!status.enabled) {
      this.update({
        phase: 'bluetooth_disabled',
        statusText: 'بلوتوث گوشی خاموش است. آن را روشن کنید.',
      });
    } else if (this.state.phase === 'unsupported' || this.state.phase === 'permission_required' || this.state.phase === 'bluetooth_disabled') {
      this.update({ phase: 'idle', statusText: 'آماده اتصال بلوتوث' });
    }
    return status;
  }

  public requestPermission(): void {
    const bridge = this.bridge();
    if (!bridge) return;
    this.update({
      phase: 'permission_required',
      statusText: 'در انتظار تأیید مجوز بلوتوث...',
    });
    bridge.requestPermissions?.();
  }

  public requestEnableBluetooth(): void {
    const bridge = this.bridge();
    if (!bridge) return;
    this.update({
      phase: 'bluetooth_disabled',
      statusText: 'در انتظار روشن‌شدن بلوتوث...',
    });
    bridge.requestEnable?.();
  }

  public loadPairedDevices(): RemoteDevice[] {
    const bridge = this.bridge();
    if (!bridge) return [];
    try {
      const raw = bridge.getPairedDevices?.() || '[]';
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const devices: RemoteDevice[] = [];
      for (const entry of parsed) {
        if (!entry || typeof entry !== 'object') continue;
        const device = entry as Partial<RemoteDevice>;
        if (typeof device.name !== 'string' || typeof device.address !== 'string') continue;
        if (!/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(device.address)) continue;
        devices.push({ name: device.name.slice(0, 80), address: device.address });
      }
      this.update({ pairedDevices: devices });
      return devices;
    } catch {
      return [];
    }
  }

  public async startHost(options: SessionStart): Promise<boolean> {
    const bridge = this.bridge();
    if (!bridge) {
      this.fail('unsupported', 'بلوتوث مستقیم فقط در نسخه اندروید در دسترس است.');
      return false;
    }
    this.localIdentity = options.identity;
    this.desiredVariant = options.variant;
    const status = await this.refreshStatus();
    if (!status) return false;
    if (status.permission !== 'granted') {
      this.pendingAction = () => void this.startHost(options);
      this.update({ statusText: 'مجوز بلوتوث تأیید نشد. پس از تأیید، میزبانی ادامه می‌یابد.' });
      bridge.requestPermissions?.();
      return false;
    }
    if (!status.enabled) {
      this.pendingAction = () => void this.startHost(options);
      bridge.requestEnable?.();
      return false;
    }
    this.resetSessionState();
    const matchId = createId('bt-match');
    this.update({
      phase: 'hosting',
      isHost: true,
      role: 'host',
      matchId,
      statusText: 'در انتظار اتصال گوشی دوم...',
      error: null,
    });
    try {
      bridge.startServer?.();
      return true;
    } catch (error) {
      this.fail('native_error', this.describe(error));
      return false;
    }
  }

  public async joinDevice(address: string, options: SessionStart): Promise<boolean> {
    const bridge = this.bridge();
    if (!bridge) {
      this.fail('unsupported', 'بلوتوث مستقیم فقط در نسخه اندروید در دسترس است.');
      return false;
    }
    if (!/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(address)) {
      this.fail('invalid_address', 'آدرس دستگاه بلوتوث معتبر نیست.');
      return false;
    }
    this.localIdentity = options.identity;
    this.desiredVariant = options.variant;
    const status = await this.refreshStatus();
    if (!status) return false;
    if (status.permission !== 'granted') {
      this.pendingAction = () => void this.joinDevice(address, options);
      bridge.requestPermissions?.();
      return false;
    }
    if (!status.enabled) {
      this.pendingAction = () => void this.joinDevice(address, options);
      bridge.requestEnable?.();
      return false;
    }
    this.resetSessionState();
    const matchId = createId('bt-match');
    this.update({
      phase: 'connecting',
      isHost: false,
      role: 'guest',
      matchId,
      statusText: 'در حال اتصال به گوشی میزبان...',
      error: null,
    });
    try {
      bridge.connectToDevice?.(address);
      return true;
    } catch (error) {
      this.fail('native_error', this.describe(error));
      return false;
    }
  }

  public sendCommand(match: MatchState, command: MatchCommand): boolean {
    if (this.state.phase !== 'ready') return false;
    if (this.state.role !== 'guest') return false;
    const commandId = createId('cmd');
    const message = createCommandMessage(match, command, commandId);
    return this.send(message);
  }

  public sendSnapshot(state: MatchState, ackFor?: string): boolean {
    if (this.state.phase !== 'ready' || this.state.role !== 'host') return false;
    this.lastSnapshot = state;
    this.lastSentVersion = state.version;
    return this.send({
      kind: 'state',
      protocolVersion: PROTOCOL_VERSION,
      matchId: state.matchId,
      version: state.version,
      state,
      ackFor,
    });
  }

  public requestSnapshot(): void {
    if (this.state.phase !== 'ready' || !this.session) return;
    this.send({
      kind: 'state_request',
      protocolVersion: PROTOCOL_VERSION,
      matchId: this.session.matchId,
    });
  }

  public requestRematch(): void {
    if (this.state.phase !== 'ready' || !this.session) return;
    this.rematchState = 'requested';
    this.send({
      kind: 'rematch_request',
      protocolVersion: PROTOCOL_VERSION,
      matchId: this.session.matchId,
    });
  }

  public acceptRematch(): void {
    if (this.state.phase !== 'ready' || !this.session) return;
    this.rematchState = 'accepted';
    this.send({
      kind: 'rematch_accept',
      protocolVersion: PROTOCOL_VERSION,
      matchId: this.session.matchId,
    });
  }

  public declineRematch(): void {
    if (this.state.phase !== 'ready' || !this.session) return;
    this.rematchState = 'none';
    this.send({
      kind: 'rematch_decline',
      protocolVersion: PROTOCOL_VERSION,
      matchId: this.session.matchId,
    });
  }

  public beginRematch(state: MatchState): boolean {
    if (this.state.phase !== 'ready' || !this.session || this.state.role !== 'host') return false;
    if (this.rematchState !== 'accepted') return false;
    this.rematchState = 'none';
    this.seenCommandIds.clear();
    this.commandOrder = [];
    this.lastSentVersion = state.version;
    this.lastSnapshot = state;
    if (!this.send({
      kind: 'rematch_start',
      protocolVersion: PROTOCOL_VERSION,
      matchId: state.matchId,
      state,
    })) {
      return false;
    }
    const session: SessionInfo = { ...this.session, matchId: state.matchId };
    this.session = session;
    this.update({ matchId: state.matchId });
    this.emitSession(session);
    return true;
  }

  public disconnect(): void {
    const bridge = this.bridge();
    try {
      bridge?.disconnect?.();
    } catch {
      // Native teardown is best-effort.
    }
    this.clearTimers();
    this.session = null;
    this.lastSnapshot = null;
    this.lastSentVersion = -1;
    this.seenCommandIds.clear();
    this.commandOrder = [];
    this.rematchState = 'none';
    this.update({
      phase: 'disconnected',
      isHost: false,
      role: null,
      deviceName: null,
      matchId: null,
      statusText: 'اتصال قطع شد',
      remoteName: null,
      remoteStoneSkinId: null,
      remoteProfileFrameId: null,
    });
  }

  public shutdown(): void {
    this.disconnect();
    this.stateListeners.clear();
    this.sessionListeners.clear();
    this.commandListeners.clear();
    this.snapshotListeners.clear();
    this.rematchListeners.clear();
    this.errorListeners.clear();
    this.resyncListeners.clear();
  }

  /**
   * Single entry point for native callbacks. Keeping it as a method makes the
   * transport directly testable with two simulated phones.
   */
  public handleNativeEvent(event: string, ...args: unknown[]): void {
    switch (event) {
      case 'status':
        this.update({ statusText: String(args[0] ?? '').slice(0, 200) });
        break;
      case 'connected': {
        const name = this.sanitizeName(args[0], 'گوشی حریف');
        this.update({
          deviceName: name,
          statusText: `اتصال برقرار شد؛ هماهنگی با ${name}...`,
          error: null,
          phase: 'handshaking',
        });
        if (this.state.isHost) this.sendHello();
        this.startHandshakeTimeout();
        break;
      }
      case 'disconnected':
        this.clearTimers();
        this.session = null;
        this.update({
          phase: 'disconnected',
          deviceName: null,
          role: null,
          matchId: null,
          statusText: 'اتصال بلوتوث قطع شد. برای ادامه دوباره وصل شوید.',
        });
        break;
      case 'data':
        if (typeof args[0] === 'string') this.handleRawData(args[0]);
        break;
      case 'device': {
        const name = this.sanitizeName(args[0], 'دستگاه ناشناس');
        const address = args[1];
        if (typeof address !== 'string') return;
        if (!/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(address)) return;
        if (this.state.pairedDevices.some((device) => device.address === address)) return;
        this.update({
          pairedDevices: [...this.state.pairedDevices, { name, address }],
        });
        break;
      }
      case 'error':
        this.fail('native_error', this.sanitizeName(args[0], 'خطای بلوتوث'));
        break;
      case 'permission': {
        let granted = false;
        let permanentlyDenied = false;
        try {
          const parsed = JSON.parse(String(args[0])) as {
            granted?: boolean;
            permanentlyDenied?: boolean;
          };
          granted = parsed.granted === true;
          permanentlyDenied = parsed.permanentlyDenied === true;
        } catch {
          granted = false;
        }
        if (granted) {
          this.update({
            phase: 'idle',
            statusText: 'مجوز بلوتوث تأیید شد.',
            error: null,
          });
          const action = this.pendingAction;
          this.pendingAction = null;
          action?.();
        } else {
          this.pendingAction = null;
          this.fail(
            permanentlyDenied ? 'permission_permanently_denied' : 'permission_denied',
            permanentlyDenied
              ? 'مجوز بلوتوث برای همیشه رد شده است. از تنظیمات اندروید، مجوز «دستگاه‌های نزدیک» را برای این برنامه فعال کنید.'
              : 'مجوز بلوتوث رد شد. برای اتصال دو گوشی به آن نیاز است.'
          );
        }
        break;
      }
      case 'enabled': {
        this.update({ phase: 'idle', statusText: 'بلوتوث روشن شد.', error: null });
        const action = this.pendingAction;
        this.pendingAction = null;
        action?.();
        break;
      }
      default:
        break;
    }
  }

  private installNativeCallbacks(): void {
    if (typeof window === 'undefined') return;
    const target = window as unknown as Record<string, unknown>;
    target.onAndroidBluetoothStatus = (status: string) =>
      this.handleNativeEvent('status', status);
    target.onAndroidBluetoothConnected = (deviceName: string) =>
      this.handleNativeEvent('connected', deviceName);
    target.onAndroidBluetoothDisconnected = () => this.handleNativeEvent('disconnected');
    target.onAndroidBluetoothData = (rawJson: string) => this.handleNativeEvent('data', rawJson);
    target.onAndroidBluetoothDeviceFound = (name: string, address: string) =>
      this.handleNativeEvent('device', name, address);
    target.onAndroidBluetoothError = (message: string) =>
      this.handleNativeEvent('error', message);
    target.onAndroidBluetoothPermission = (raw: string) =>
      this.handleNativeEvent('permission', raw);
    target.onAndroidBluetoothEnabled = () => this.handleNativeEvent('enabled');
  }

  private readStatus(): NativeStatus | null {
    const bridge = this.bridge();
    if (!bridge) return null;
    try {
      if (typeof bridge.getStatus === 'function') {
        const parsed = JSON.parse(bridge.getStatus()) as Partial<NativeStatus>;
        return {
          supported: parsed.supported === true,
          enabled: parsed.enabled === true,
          permission:
            parsed.permission === 'granted' ||
            parsed.permission === 'denied' ||
            parsed.permission === 'permanently_denied'
              ? parsed.permission
              : 'required',
        };
      }
      return {
        supported: bridge.isSupported?.() === true,
        enabled: bridge.isEnabled?.() === true,
        permission: 'granted',
      };
    } catch {
      return null;
    }
  }

  private sendHello(): void {
    if (!this.session && this.state.role === 'host') {
      const matchId = this.state.matchId || createId('bt-match');
      this.session = {
        protocolVersion: PROTOCOL_VERSION,
        matchId,
        role: 'host',
        variant: this.desiredVariant,
        remoteName: this.state.deviceName || 'گوشی حریف',
        remoteStoneSkinId: null,
        remoteProfileFrameId: null,
      };
    }
    if (!this.session) return;
    this.send({
      kind: 'hello',
      protocolVersion: PROTOCOL_VERSION,
      matchId: this.session.matchId,
      role: 'host',
      variant: this.session.variant,
      displayName: this.localIdentity.displayName.slice(0, 32),
      stoneSkinId: this.localIdentity.stoneSkinId,
      profileFrameId: this.localIdentity.profileFrameId,
    });
  }

  private handleRawData(rawJson: string): void {
    const message = parseWireMessage(rawJson);
    if (!message) {
      this.emitError({
        code: 'bad_message',
        messageFa: 'پیام نامعتبر یا ناقص بلوتوث نادیده گرفته شد.',
      });
      return;
    }
    if (message.kind === 'error') {
      this.emitError({ code: message.code, messageFa: message.messageFa });
      return;
    }
    if (message.kind === 'hello') {
      this.handleHello(message);
      return;
    }
    if (!this.session || message.matchId !== this.session.matchId) {
      this.emitError({ code: 'match_mismatch', messageFa: 'پیام متعلق به این مسابقه نیست.' });
      return;
    }
    switch (message.kind) {
      case 'hello_ack':
        this.handleHelloAck(message);
        break;
      case 'command':
        this.handleRemoteCommand(message);
        break;
      case 'state':
        this.handleRemoteSnapshot(message);
        break;
      case 'ack':
        if (this.pendingAck && message.version >= this.pendingAck.version) {
          this.clearAckTimer();
        }
        break;
      case 'state_request':
        if (this.state.role === 'host' && this.lastSnapshot) {
          this.sendSnapshot(this.lastSnapshot);
        }
        for (const listener of this.resyncListeners) listener();
        break;
      case 'rematch_request':
        this.rematchState = 'requested';
        for (const listener of this.rematchListeners) listener({ type: 'requested' });
        break;
      case 'rematch_accept':
        this.rematchState = 'accepted';
        for (const listener of this.rematchListeners) listener({ type: 'accepted' });
        break;
      case 'rematch_decline':
        this.rematchState = 'none';
        for (const listener of this.rematchListeners) listener({ type: 'declined' });
        break;
      case 'rematch_start':
        this.applyRematchStart(message.state);
        break;
      default:
        break;
    }
  }

  private handleHello(message: Extract<WireMessage, { kind: 'hello' }>): void {
    if (this.state.role !== 'guest') {
      this.emitError({ code: 'unexpected_hello', messageFa: 'پیام هماهنگی در نقش نامناسب دریافت شد.' });
      return;
    }
    if (message.variant !== this.desiredVariant) {
      this.fail(
        'variant_mismatch',
        'نوع دوز انتخاب‌شده در دو گوشی یکسان نیست. هر دو گوشی را روی یک نوع دوز بگذارید و دوباره وصل شوید.'
      );
      this.disconnect();
      return;
    }
    const session: SessionInfo = {
      protocolVersion: PROTOCOL_VERSION,
      matchId: message.matchId,
      role: 'guest',
      variant: message.variant,
      remoteName: message.displayName,
      remoteStoneSkinId: message.stoneSkinId,
      remoteProfileFrameId: message.profileFrameId,
    };
    this.session = session;
    this.update({
      matchId: message.matchId,
      remoteName: message.displayName,
      remoteStoneSkinId: message.stoneSkinId,
      remoteProfileFrameId: message.profileFrameId,
      statusText: `هماهنگی با ${message.displayName} انجام شد.`,
    });
    this.send({
      kind: 'hello_ack',
      protocolVersion: PROTOCOL_VERSION,
      matchId: message.matchId,
      role: 'guest',
      variant: this.desiredVariant,
      displayName: this.localIdentity.displayName.slice(0, 32),
      stoneSkinId: this.localIdentity.stoneSkinId,
      profileFrameId: this.localIdentity.profileFrameId,
    });
    this.markReady(session);
  }

  private handleHelloAck(message: Extract<WireMessage, { kind: 'hello_ack' }>): void {
    if (this.state.role !== 'host' || !this.session) return;
    if (message.matchId !== this.session.matchId || message.variant !== this.session.variant) {
      this.fail('handshake_mismatch', 'هماهنگی اولیه دو گوشی با هم نخواند. دوباره تلاش کنید.');
      this.disconnect();
      return;
    }
    const session: SessionInfo = {
      ...this.session,
      remoteName: message.displayName,
      remoteStoneSkinId: message.stoneSkinId,
      remoteProfileFrameId: message.profileFrameId,
    };
    this.session = session;
    this.update({
      remoteName: message.displayName,
      remoteStoneSkinId: message.stoneSkinId,
      remoteProfileFrameId: message.profileFrameId,
      statusText: `اتصال به ${message.displayName} آماده است.`,
    });
    this.markReady(session);
  }

  private markReady(session: SessionInfo): void {
    this.clearHandshakeTimer();
    this.update({ phase: 'ready', statusText: 'اتصال آماده است. بازی شروع می‌شود.' });
    this.emitSession(session);
  }

  private emitSession(session: SessionInfo): void {
    for (const listener of this.sessionListeners) listener(session);
  }

  private handleRemoteCommand(message: Extract<WireMessage, { kind: 'command' }>): void {
    if (this.state.role !== 'host') {
      this.emitError({ code: 'not_host', messageFa: 'فقط میزبان می‌تواند فرمان را اجرا کند.' });
      return;
    }
    if (this.seenCommandIds.has(message.commandId)) return;
    this.seenCommandIds.add(message.commandId);
    this.commandOrder.push(message.commandId);
    if (this.commandOrder.length > MAX_REMEMBERED_COMMANDS) {
      const oldest = this.commandOrder.shift();
      if (oldest) this.seenCommandIds.delete(oldest);
    }
    if (message.expectedVersion !== this.lastSentVersion) {
      this.emitError({
        code: 'stale_command',
        messageFa: 'فرمان با نسخه قدیمی رسید؛ وضعیت معتبر دوباره ارسال می‌شود.',
      });
      if (this.lastSnapshot) this.sendSnapshot(this.lastSnapshot);
      return;
    }
    for (const listener of this.commandListeners) {
      listener({ command: message.command, commandId: message.commandId });
    }
  }

  private handleRemoteSnapshot(message: Extract<WireMessage, { kind: 'state' }>): void {
    if (this.state.role !== 'guest') return;
    const lastSeen = this.lastReceivedVersion;
    if (message.state.version < lastSeen) {
      this.send({ kind: 'ack', protocolVersion: PROTOCOL_VERSION, matchId: message.matchId, version: lastSeen });
      return;
    }
    if (message.ackFor && this.pendingAck && message.ackFor === this.pendingAck.commandId) {
      this.clearAckTimer();
    }
    this.lastReceivedVersion = message.state.version;
    this.lastSnapshot = message.state;
    if (this.session && this.session.matchId !== message.matchId) {
      this.session = { ...this.session, matchId: message.matchId };
      this.update({ matchId: message.matchId });
      this.emitSession(this.session);
    }
    for (const listener of this.snapshotListeners) listener(message.state);
    this.send({
      kind: 'ack',
      protocolVersion: PROTOCOL_VERSION,
      matchId: message.matchId,
      version: message.state.version,
    });
  }

  private lastReceivedVersion = -1;

  private applyRematchStart(state: MatchState): void {
    this.lastSnapshot = state;
    this.lastReceivedVersion = state.version;
    this.seenCommandIds.clear();
    this.commandOrder = [];
    this.rematchState = 'none';
    if (this.session) {
      this.session = { ...this.session, matchId: state.matchId };
      this.update({ matchId: state.matchId });
      this.emitSession(this.session);
    }
    for (const listener of this.rematchListeners) listener({ type: 'started', state });
  }

  private send(message: WireMessage): boolean {
    const bridge = this.bridge();
    if (!bridge) return false;
    try {
      const encoded = encodeWireMessage(message);
      bridge.sendData?.(encoded);
      if (message.kind === 'state') {
        this.lastSentVersion = message.version;
        this.lastSnapshot = message.state;
        const ackFor = message.ackFor;
        if (ackFor) {
          this.pendingAck = { commandId: ackFor, version: message.version, retried: false };
          this.clearAckTimer();
          this.ackTimer = setTimeout(() => this.retryAck(), ACK_TIMEOUT_MS);
        }
      }
      return true;
    } catch (error) {
      this.emitError({ code: 'send_failed', messageFa: this.describe(error) });
      return false;
    }
  }

  private retryAck(): void {
    if (!this.pendingAck || this.state.phase !== 'ready') return;
    if (!this.pendingAck.retried && this.lastSnapshot) {
      this.pendingAck.retried = true;
      this.send({
        kind: 'state',
        protocolVersion: PROTOCOL_VERSION,
        matchId: this.lastSnapshot.matchId,
        version: this.lastSnapshot.version,
        state: this.lastSnapshot,
        ackFor: this.pendingAck.commandId,
      });
      this.ackTimer = setTimeout(() => this.retryAck(), ACK_TIMEOUT_MS);
      return;
    }
    this.clearAckTimer();
    this.emitError({
      code: 'ack_timeout',
      messageFa: 'گوشی حریف وضعیت جدید را تأیید نکرد. اتصال را دوباره بررسی کنید.',
    });
    this.update({
      phase: 'error',
      error: 'همگام‌سازی مسابقه قطع شد. اتصال را دوباره برقرار کنید.',
    });
  }

  private startHandshakeTimeout(): void {
    this.clearHandshakeTimer();
    this.handshakeTimer = setTimeout(() => {
      if (this.state.phase !== 'handshaking') return;
      this.fail('handshake_timeout', 'هماهنگی اولیه دو گوشی انجام نشد. دوباره تلاش کنید.');
      this.disconnect();
    }, HANDSHAKE_TIMEOUT_MS);
  }

  private clearHandshakeTimer(): void {
    if (this.handshakeTimer) clearTimeout(this.handshakeTimer);
    this.handshakeTimer = null;
  }

  private clearAckTimer(): void {
    if (this.ackTimer) clearTimeout(this.ackTimer);
    this.ackTimer = null;
    this.pendingAck = null;
  }

  private clearTimers(): void {
    this.clearHandshakeTimer();
    this.clearAckTimer();
  }

  private resetSessionState(): void {
    this.clearTimers();
    this.session = null;
    this.lastSnapshot = null;
    this.lastSentVersion = -1;
    this.lastReceivedVersion = -1;
    this.seenCommandIds.clear();
    this.commandOrder = [];
    this.rematchState = 'none';
  }

  private fail(code: string, messageFa: string): void {
    this.update({ phase: 'error', error: messageFa, statusText: messageFa });
    this.emitError({ code, messageFa });
  }

  private emitError(error: { code: string; messageFa: string }): void {
    for (const listener of this.errorListeners) listener(error);
  }

  private describe(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    return 'خطای نامشخص در ارتباط بلوتوث';
  }

  private sanitizeName(value: unknown, fallback: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) return fallback;
    return value.replace(/[<>"'`]/g, '').slice(0, 80);
  }

  private update(partial: Partial<MultiplayerState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.stateListeners) listener(this.state);
  }
}

export const directMultiplayer = new DirectMultiplayerManager();
