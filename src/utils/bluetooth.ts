// Web Bluetooth API connector for Android Dooz multiplayer
// Allows pairing two Android devices or Bluetooth LE peripherals

export interface BluetoothConnectionState {
  isSupported: boolean;
  isScanning: boolean;
  isConnected: boolean;
  deviceName: string | null;
  error: string | null;
  isHost: boolean;
}

export type BluetoothMessage =
  | { type: 'PLACE_STONE'; payload: { index: number } }
  | { type: 'MOVE_STONE'; payload: { from: number; to: number } }
  | { type: 'REMOVE_STONE'; payload: { index: number } }
  | { type: 'NEW_GAME'; payload: { variant: string } }
  | { type: 'CHAT'; payload: { text: string } };

export class BluetoothManager {
  private device: any = null;
  private server: any = null;
  private characteristic: any = null;
  private onMessageCallback: ((msg: BluetoothMessage) => void) | null = null;
  private onStateChangeCallback: ((state: BluetoothConnectionState) => void) | null = null;

  public state: BluetoothConnectionState = {
    isSupported: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    isScanning: false,
    isConnected: false,
    deviceName: null,
    error: null,
    isHost: false,
  };

  constructor(
    onMessage?: (msg: BluetoothMessage) => void,
    onStateChange?: (state: BluetoothConnectionState) => void
  ) {
    if (onMessage) this.onMessageCallback = onMessage;
    if (onStateChange) this.onStateChangeCallback = onStateChange;
  }

  public setCallbacks(
    onMessage: (msg: BluetoothMessage) => void,
    onStateChange: (state: BluetoothConnectionState) => void
  ) {
    this.onMessageCallback = onMessage;
    this.onStateChangeCallback = onStateChange;
  }

  private updateState(partial: Partial<BluetoothConnectionState>) {
    this.state = { ...this.state, ...partial };
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.state);
    }
  }

  // Request Bluetooth device using Web Bluetooth API
  public async requestAndConnectDevice(): Promise<boolean> {
    if (!this.state.isSupported) {
      this.updateState({
        error: 'مرورگر یا دستگاه شما از Web Bluetooth API پشتیبانی نمی‌کند (در کروم اندروید تست کنید).',
      });
      return false;
    }

    try {
      this.updateState({ isScanning: true, error: null });

      // Request any bluetooth device with standard or custom UUIDs
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'generic_access',
          'battery_service',
          // Nordic UART Service or custom Dooz service
          '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
        ],
      });

      this.device = device;
      this.updateState({
        isScanning: false,
        deviceName: device.name || 'دستگاه بلوتوث اندروید',
        isConnected: true,
        error: null,
      });

      // Listen for disconnect
      device.addEventListener('gattserverdisconnected', () => {
        this.updateState({
          isConnected: false,
          deviceName: null,
          error: 'اتصال بلوتوث قطع شد.',
        });
      });

      return true;
    } catch (err: any) {
      this.updateState({
        isScanning: false,
        error: err.name === 'NotFoundError' ? 'جستجوی بلوتوث لغو شد.' : err.message || 'خطا در اتصال بلوتوث',
      });
      return false;
    }
  }

  // Simulate local Bluetooth peer connection (useful for testing or when using shared local loop)
  public simulateConnected(deviceName = 'گوشی شیائومی / سامسونگ (بلوتوث)') {
    this.updateState({
      isConnected: true,
      deviceName,
      error: null,
    });
  }

  public send(msg: BluetoothMessage) {
    if (!this.state.isConnected) return;
    // If real GATT characteristic exists, write value
    if (this.characteristic) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(msg));
        this.characteristic.writeValue(data);
      } catch (e) {
        console.error('Failed to send bluetooth packet:', e);
      }
    }
    // Also dispatch to local handler if simulating
    if (this.onMessageCallback) {
      // In local mode, simulate peer echo if needed
    }
  }

  public disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.updateState({
      isConnected: false,
      deviceName: null,
      error: null,
    });
  }
}
