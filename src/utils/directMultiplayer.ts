/**
 * Direct Phone-to-Phone Multiplayer Manager for Dooz Iranian
 * Supports:
 * 1. Native Android Bluetooth Bridge (window.AndroidBluetooth) inside the APK
 * 2. Instant 4-digit Wireless Room Code (P2P syncing)
 */

export interface RemoteDevice {
  name: string;
  address: string;
}

export type DirectMultiplayerMode = 'native_bluetooth' | 'room_code';

export interface MultiplayerState {
  isConnected: boolean;
  isHost: boolean;
  mode: DirectMultiplayerMode;
  roomCode: string | null;
  deviceName: string | null;
  statusText: string;
  isScanning: boolean;
  pairedDevices: RemoteDevice[];
  discoveredDevices: RemoteDevice[];
  error: string | null;
}

export class DirectMultiplayerManager {
  private state: MultiplayerState = {
    isConnected: false,
    isHost: false,
    mode: 'room_code',
    roomCode: null,
    deviceName: null,
    statusText: 'آماده اتصال',
    isScanning: false,
    pairedDevices: [],
    discoveredDevices: [],
    error: null,
  };

  private onStateChange: ((state: MultiplayerState) => void) | null = null;
  private onMessage: ((data: any) => void) | null = null;
  private pollInterval: any = null;
  private lastMessageIndex = 0;
  private myPlayerId: string = Math.random().toString(36).substring(2, 9);

  constructor() {
    this.setupNativeCallbacks();
  }

  public setCallbacks(
    onState: (state: MultiplayerState) => void,
    onMsg: (data: any) => void
  ) {
    this.onStateChange = onState;
    this.onMessage = onMsg;
  }

  public getState(): MultiplayerState {
    return this.state;
  }

  private update(partial: Partial<MultiplayerState>) {
    this.state = { ...this.state, ...partial };
    if (this.onStateChange) this.onStateChange(this.state);
  }

  // --- NATIVE ANDROID BLUETOOTH INTEGRATION ---

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
        const parsed = JSON.parse(rawJson);
        if (this.onMessage) this.onMessage(parsed);
      } catch (err) {
        console.error('Error parsing bluetooth data:', err);
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
    if (!this.isNativeAndroidBluetoothAvailable()) {
      return false;
    }
    this.update({
      mode: 'native_bluetooth',
      isHost: true,
      statusText: 'بلوتوث روشن شد. در انتظار اتصال حریف...',
      error: null,
    });
    try {
      (window as any).AndroidBluetooth.startServer();
      return true;
    } catch (err: any) {
      this.update({ error: err.message || 'خطا در فعال‌سازی بلوتوث' });
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
      mode: 'native_bluetooth',
      isHost: false,
      statusText: `در حال اتصال مستقیم بلوتوث به ${address}...`,
      error: null,
    });
    try {
      (window as any).AndroidBluetooth.connectToDevice(address);
    } catch (err: any) {
      this.update({ error: err.message || 'خطا در اتصال' });
    }
  }

  // --- 4-DIGIT INSTANT WIRELESS ROOM (WORKS ON 100% OF PHONES) ---

  public async createWirelessRoom(): Promise<string | null> {
    this.stopPolling();
    this.update({
      mode: 'room_code',
      isHost: true,
      statusText: 'در حال ساخت اتاق بازی...',
      error: null,
    });

    try {
      const res = await fetch('/api/room/create', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.roomCode) {
        this.update({
          roomCode: data.roomCode,
          statusText: `اتاق ساخته شد! کد: ${data.roomCode} (منتظر ورود گوشی حریف...)`,
        });
        this.startPolling(data.roomCode);
        return data.roomCode;
      }
      throw new Error('عدم موفقیت در ساخت اتاق');
    } catch (err: any) {
      this.update({ error: 'خطا در برقراری ارتباط با اتاق بازی.' });
      return null;
    }
  }

  public async joinWirelessRoom(code: string): Promise<boolean> {
    this.stopPolling();
    this.update({
      mode: 'room_code',
      isHost: false,
      statusText: `در حال اتصال به اتاق ${code}...`,
      error: null,
    });

    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        this.update({
          roomCode: code.trim(),
          isConnected: true,
          deviceName: `گوشی میزبان (اتاق ${code})`,
          statusText: `به اتاق ${code} متصل شدید! بازی آماده است.`,
        });
        this.startPolling(code.trim());
        return true;
      }
      throw new Error(data.error || 'کد اتاق اشتباه است');
    } catch (err: any) {
      this.update({ error: err.message || 'خطا در پیوستن به اتاق' });
      return false;
    }
  }

  private startPolling(code: string) {
    this.stopPolling();
    this.lastMessageIndex = 0;

    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/room/poll/${code}/${this.myPlayerId}?since=${this.lastMessageIndex}`);
        if (!res.ok) return;
        const json = await res.json();

        if (json.success) {
          if (!this.state.isConnected && json.isGuestConnected) {
            this.update({
              isConnected: true,
              deviceName: 'گوشی حریف',
              statusText: 'گوشی دوم متصل شد! بازی آغاز شد.',
            });
          }

          if (json.messages && json.messages.length > 0) {
            for (const msg of json.messages) {
              if (this.onMessage) {
                this.onMessage(msg.data);
              }
            }
          }
          this.lastMessageIndex = json.totalCount;
        }
      } catch (e) {
        // Transient network jitter
      }
    }, 400); // 400ms polling for snappy real-time response
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // --- UNIVERSAL MESSAGE DISPATCH ---

  public sendMessage(msg: any) {
    if (this.state.mode === 'native_bluetooth' && this.isNativeAndroidBluetoothAvailable()) {
      try {
        (window as any).AndroidBluetooth.sendData(JSON.stringify(msg));
      } catch (err) {
        console.error('Error sending native bluetooth message:', err);
      }
      return;
    }

    if (this.state.mode === 'room_code' && this.state.roomCode) {
      fetch('/api/room/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: this.state.roomCode,
          from: this.myPlayerId,
          data: msg,
        }),
      }).catch((err) => console.error('Error sending room move:', err));
    }
  }

  public disconnect() {
    this.stopPolling();
    if (this.isNativeAndroidBluetoothAvailable()) {
      try {
        (window as any).AndroidBluetooth.disconnect();
      } catch {}
    }
    this.update({
      isConnected: false,
      roomCode: null,
      statusText: 'اتصال قطع شد',
    });
  }
}

export const directMultiplayer = new DirectMultiplayerManager();
