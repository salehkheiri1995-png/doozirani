import { GameVariant, Player } from '../game/doozTypes';

/**
 * مدیریت اتصال دو گوشی.
 *
 * دو مسیر واقعی وجود دارد:
 * 1. پل بلوتوث نیتیو اندروید (window.AndroidBluetooth) — داخل APK، بدون اینترنت.
 * 2. سرور اتاق با کد ۴ رقمی — فقط وقتی برنامه از یک سرور HTTP سرو شود (نسخهٔ وب).
 *
 * در APK هیچ سروری وجود ندارد؛ بنابراین `isRoomServerAvailable()` نادرست است و
 * رابط کاربری باید فقط بلوتوث را پیشنهاد کند. این کار جلوی وعدهٔ «بدون اینترنت»
 * الکی و اتاق‌های ساختگی را می‌گیرد.
 */

export interface RemoteDevice {
  name: string;
  address: string;
}

export type ConnectionKind = 'none' | 'native_bluetooth' | 'room_code';

export interface MultiplayerState {
  isConnected: boolean;
  isHost: boolean;
  kind: ConnectionKind;
  roomCode: string | null;
  deviceName: string | null;
  statusText: string;
  isScanning: boolean;
  pairedDevices: RemoteDevice[];
  discoveredDevices: RemoteDevice[];
  error: string | null;
}

export type NetMessageType =
  | 'HELLO'
  | 'START'
  | 'PLACE'
  | 'MOVE'
  | 'REMOVE'
  | 'RESTART'
  | 'REMATCH_REQUEST'
  | 'REMATCH_ACCEPT'
  | 'RESIGN'
  | 'SYNC_REQUEST'
  | 'SYNC_STATE'
  | 'PING'
  | 'PONG'
  | 'BYE';

export interface NetEnvelope {
  v: 2;
  type: NetMessageType;
  side: Player;
  variant: GameVariant | null;
  moveCount: number;
  payload?: unknown;
  ts: number;
}

const ROOM_BASE = (import.meta as any)?.env?.VITE_ROOM_SERVER_URL?.replace(/\/$/, '') ?? '';

/** آیا سرور اتاق (کد ۴ رقمی) در دسترس است؟ */
export function isRoomServerAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (ROOM_BASE) return true;
  const { protocol, hostname } = window.location;
  // APK صفحه را از میزبان محلی سرو می‌کند و هیچ سروری پشت آن نیست
  if (hostname === 'dooz.game.local') return false;
  if (protocol === 'file:') return false;
  return protocol === 'http:' || protocol === 'https:';
}

function endpoint(path: string): string {
  return `${ROOM_BASE}${path}`;
}

type StateListener = (state: MultiplayerState) => void;
type MessageListener = (message: NetEnvelope) => void;

export class DirectMultiplayerManager {
  private state: MultiplayerState = {
    isConnected: false,
    isHost: false,
    kind: 'none',
    roomCode: null,
    deviceName: null,
    statusText: 'آماده اتصال',
    isScanning: false,
    pairedDevices: [],
    discoveredDevices: [],
    error: null,
  };

  private stateListeners = new Set<StateListener>();
  private messageListeners = new Set<MessageListener>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private waitTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMessageIndex = 0;
  private myPlayerId = Math.random().toString(36).substring(2, 9);
  /** آخرین زمانی که پیامی از حریف رسید (برای تشخیص قطعی) */
  public lastIncomingAt = 0;

  constructor() {
    this.setupNativeCallbacks();
  }

  // --- اشتراک شنونده‌ها (بدون بازنویسی) ---

  public onState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  /** فقط برای سازگاری با کد قدیمی؛ در کد جدید از onState/onMessage استفاده کن */
  public setCallbacks(onState: StateListener, onMessage: (data: any) => void): void {
    this.stateListeners.clear();
    this.messageListeners.clear();
    if (onState) this.stateListeners.add(onState);
    if (onMessage) this.messageListeners.add(onMessage as MessageListener);
  }

  public getState(): MultiplayerState {
    return this.state;
  }

  /** سمت این گوشی در بازی: میزبان همیشه player1 و مهمان player2 است */
  public getMySide(): Player {
    return this.state.isHost ? 'player1' : 'player2';
  }

  public getOpponentSide(): Player {
    return this.getMySide() === 'player1' ? 'player2' : 'player1';
  }

  private update(partial: Partial<MultiplayerState>) {
    this.state = { ...this.state, ...partial };
    this.stateListeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('خطا در شنوندهٔ وضعیت اتصال:', error);
      }
    });
  }

  private dispatch(envelope: NetEnvelope) {
    this.lastIncomingAt = Date.now();
    if (this.messageListeners.size === 0) {
      console.warn('پیام شبکه رسید اما هیچ شنونده‌ای ثبت نشده است:', envelope.type);
      return;
    }
    this.messageListeners.forEach((listener) => {
      try {
        listener(envelope);
      } catch (error) {
        console.error('خطا در پردازش پیام شبکه:', error);
      }
    });
  }

  private normalize(raw: any): NetEnvelope | null {
    if (!raw || typeof raw !== 'object' || typeof raw.type !== 'string') return null;
    return {
      v: 2,
      type: raw.type as NetMessageType,
      side: raw.side === 'player2' ? 'player2' : 'player1',
      variant: raw.variant ?? null,
      moveCount: typeof raw.moveCount === 'number' ? raw.moveCount : 0,
      payload: raw.payload,
      ts: typeof raw.ts === 'number' ? raw.ts : Date.now(),
    };
  }

  // --- بلوتوث نیتیو اندروید ---

  public isNativeAndroidBluetoothAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(window as any).AndroidBluetooth &&
      typeof (window as any).AndroidBluetooth.isNative === 'function'
    );
  }

  private setupNativeCallbacks() {
    if (typeof window === 'undefined') return;

    (window as any).onAndroidBluetoothStatus = (status: string) => {
      this.update({ statusText: status, isScanning: false });
    };

    (window as any).onAndroidBluetoothConnected = (deviceName: string) => {
      this.update({
        isConnected: true,
        kind: 'native_bluetooth',
        deviceName: deviceName || 'گوشی اندروید حریف',
        statusText: `متصل به ${deviceName || 'گوشی حریف'}`,
        error: null,
      });
    };

    (window as any).onAndroidBluetoothDisconnected = () => {
      this.update({
        isConnected: false,
        statusText: 'اتصال قطع شد',
      });
    };

    (window as any).onAndroidBluetoothData = (rawJson: string) => {
      try {
        const parsed = this.normalize(JSON.parse(rawJson));
        if (parsed) this.dispatch(parsed);
      } catch (error) {
        console.error('خطا در خواندن پیام بلوتوث:', error);
      }
    };

    (window as any).onAndroidBluetoothDeviceFound = (name: string, address: string) => {
      const current = [...this.state.discoveredDevices];
      if (!current.some((d) => d.address === address)) {
        current.push({ name: name || 'دستگاه ناشناس', address });
        this.update({ discoveredDevices: current });
      }
    };

    (window as any).onAndroidBluetoothError = (err: string) => {
      this.update({ error: err, isScanning: false });
    };
  }

  public startNativeBluetoothServer(): boolean {
    if (!this.isNativeAndroidBluetoothAvailable()) return false;
    this.update({
      kind: 'native_bluetooth',
      isHost: true,
      statusText: 'بلوتوث روشن شد. در انتظار اتصال حریف...',
      error: null,
    });
    try {
      (window as any).AndroidBluetooth.startServer();
      return true;
    } catch (err: any) {
      this.update({ error: err?.message || 'خطا در فعال‌سازی بلوتوث' });
      return false;
    }
  }

  public loadPairedDevices(): RemoteDevice[] {
    if (!this.isNativeAndroidBluetoothAvailable()) return [];
    try {
      const raw = (window as any).AndroidBluetooth.getPairedDevices();
      const parsed: RemoteDevice[] = JSON.parse(raw);
      this.update({ pairedDevices: parsed });
      return parsed;
    } catch {
      return [];
    }
  }

  public connectNativeBluetooth(address: string) {
    if (!this.isNativeAndroidBluetoothAvailable()) return;
    this.update({
      kind: 'native_bluetooth',
      isHost: false,
      statusText: `در حال اتصال بلوتوث به ${address}...`,
      error: null,
    });
    try {
      (window as any).AndroidBluetooth.connectToDevice(address);
    } catch (err: any) {
      this.update({ error: err?.message || 'خطا در اتصال' });
    }
  }

  // --- اتاق با کد ۴ رقمی (نیازمند سرور) ---

  public async createWirelessRoom(): Promise<string | null> {
    if (!isRoomServerAvailable()) {
      this.update({
        error: 'اتاق با کد فقط در نسخهٔ وب/آنلاین در دسترس است. در اپ اندروید از بلوتوث استفاده کنید.',
      });
      return null;
    }

    this.stopPolling();
    this.update({
      kind: 'room_code',
      isHost: true,
      statusText: 'در حال ساخت اتاق بازی...',
      error: null,
    });

    try {
      const res = await fetch(endpoint('/api/room/create'), { method: 'POST' });
      const data = await res.json();
      if (data.success && data.roomCode) {
        this.update({
          roomCode: data.roomCode,
          statusText: `اتاق ساخته شد! کد: ${data.roomCode}`,
        });
        this.startPolling(data.roomCode);
        this.waitTimer = setTimeout(() => {
          if (!this.state.isConnected) {
            this.update({
              error: 'هیچ گوشی‌ای ظرف ۵۰ ثانیه متصل نشد. دوباره تلاش کنید.',
              statusText: 'مهلت انتظار به پایان رسید',
            });
          }
        }, 50000);
        return data.roomCode;
      }
      throw new Error('عدم موفقیت در ساخت اتاق');
    } catch {
      this.update({ error: 'خطا در برقراری ارتباط با سرور اتاق بازی.' });
      return null;
    }
  }

  public async joinWirelessRoom(code: string): Promise<boolean> {
    if (!isRoomServerAvailable()) {
      this.update({ error: 'ورود با کد اتاق در این نسخه در دسترس نیست.' });
      return false;
    }

    this.stopPolling();
    this.update({
      kind: 'room_code',
      isHost: false,
      statusText: `در حال اتصال به اتاق ${code}...`,
      error: null,
    });

    try {
      const res = await fetch(endpoint('/api/room/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        this.update({
          roomCode: code.trim(),
          isConnected: true,
          deviceName: `میزبان اتاق ${code}`,
          statusText: `به اتاق ${code} متصل شدید!`,
        });
        this.startPolling(code.trim());
        return true;
      }
      throw new Error(data.error || 'کد اتاق اشتباه است');
    } catch (err: any) {
      this.update({ error: err?.message || 'خطا در پیوستن به اتاق' });
      return false;
    }
  }

  private startPolling(code: string) {
    this.stopPolling();
    this.lastMessageIndex = 0;

    this.pollTimer = setInterval(async () => {
      try {
        const res = await fetch(
          endpoint(`/api/room/poll/${code}/${this.myPlayerId}?since=${this.lastMessageIndex}`)
        );
        if (!res.ok) return;
        const json = await res.json();

        if (json.success) {
          if (!this.state.isConnected && json.isGuestConnected) {
            if (this.waitTimer) {
              clearTimeout(this.waitTimer);
              this.waitTimer = null;
            }
            this.update({
              isConnected: true,
              deviceName: 'گوشی حریف',
              statusText: 'گوشی دوم متصل شد!',
            });
          }

          if (Array.isArray(json.messages) && json.messages.length > 0) {
            for (const msg of json.messages) {
              const envelope = this.normalize(msg.data);
              if (envelope) this.dispatch(envelope);
            }
          }
          this.lastMessageIndex = json.totalCount ?? this.lastMessageIndex;
        }
      } catch {
        // اختلال موقت شبکه؛ دور بعد دوباره تلاش می‌شود
      }
    }, 400);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.waitTimer) {
      clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
  }

  // --- ارسال ---

  public send(envelope: Omit<NetEnvelope, 'v' | 'side' | 'ts'> & Partial<Pick<NetEnvelope, 'side'>>): void {
    const message: NetEnvelope = {
      v: 2,
      type: envelope.type,
      side: envelope.side ?? this.getMySide(),
      variant: envelope.variant ?? null,
      moveCount: envelope.moveCount ?? 0,
      payload: envelope.payload,
      ts: Date.now(),
    };

    if (this.state.kind === 'native_bluetooth' && this.isNativeAndroidBluetoothAvailable()) {
      try {
        (window as any).AndroidBluetooth.sendData(JSON.stringify(message));
      } catch (error) {
        console.error('خطا در ارسال پیام بلوتوث:', error);
      }
      return;
    }

    if (this.state.kind === 'room_code' && this.state.roomCode) {
      fetch(endpoint('/api/room/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: this.state.roomCode,
          from: this.myPlayerId,
          data: message,
        }),
      }).catch((error) => console.error('خطا در ارسال پیام اتاق:', error));
    }
  }

  public disconnect() {
    this.stopPolling();
    if (this.isNativeAndroidBluetoothAvailable()) {
      try {
        (window as any).AndroidBluetooth.disconnect();
      } catch {
        // ignore
      }
    }
    this.update({
      isConnected: false,
      roomCode: null,
      kind: 'none',
      statusText: 'اتصال قطع شد',
    });
  }
}

export const directMultiplayer = new DirectMultiplayerManager();
