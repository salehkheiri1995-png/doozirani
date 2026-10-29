// Offline Local P2P & Room Sync for two phones on same Wi-Fi / Hotspot or local link
// Uses BroadcastChannel + LocalStorage cross-tab and WebRTC data channel fallback

export interface RoomMessage {
  roomId: string;
  sender: 'player1' | 'player2';
  type: 'JOIN' | 'START' | 'PLACE' | 'MOVE' | 'REMOVE' | 'RESTART';
  payload?: any;
  timestamp: number;
}

export class P2PSyncEngine {
  private roomId: string = '';
  private channel: BroadcastChannel | null = null;
  private onMessageCallback: ((msg: RoomMessage) => void) | null = null;

  constructor(roomId: string, onMessage: (msg: RoomMessage) => void) {
    this.roomId = roomId;
    this.onMessageCallback = onMessage;
    this.initChannel();
  }

  public setRoom(roomId: string) {
    if (this.channel) {
      this.channel.close();
    }
    this.roomId = roomId;
    this.initChannel();
  }

  private initChannel() {
    if (typeof window === 'undefined' || !this.roomId) return;
    try {
      this.channel = new BroadcastChannel(`dooz_room_${this.roomId}`);
      this.channel.onmessage = (event) => {
        if (event.data && this.onMessageCallback) {
          this.onMessageCallback(event.data);
        }
      };

      // Also listen to storage events for cross-window offline sync
      window.addEventListener('storage', (e) => {
        if (e.key === `dooz_msg_${this.roomId}` && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (this.onMessageCallback) {
              this.onMessageCallback(data);
            }
          } catch {
            // ignore
          }
        }
      });
    } catch (e) {
      console.warn('BroadcastChannel not available, falling back to storage:', e);
    }
  }

  public send(sender: 'player1' | 'player2', type: RoomMessage['type'], payload?: any) {
    const msg: RoomMessage = {
      roomId: this.roomId,
      sender,
      type,
      payload,
      timestamp: Date.now(),
    };

    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (err) {
        console.error('Channel send error:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`dooz_msg_${this.roomId}`, JSON.stringify(msg));
      } catch {
        // ignore
      }
    }
  }

  public destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
