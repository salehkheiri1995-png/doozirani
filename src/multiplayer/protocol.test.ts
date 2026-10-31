import { describe, expect, it, vi } from 'vitest';
import {
  MAX_WIRE_BYTES,
  PROTOCOL_VERSION,
  createCommandMessage,
  encodeWireMessage,
  parseWireMessage,
  type WireMessage,
} from './protocol';
import { createMatchState } from '../game/match';
import {
  DirectMultiplayerManager,
  type MultiplayerState,
} from '../utils/directMultiplayer';

class FakeBridge {
  status = {
    supported: true,
    enabled: true,
    permission: 'granted' as 'granted' | 'required' | 'denied' | 'permanently_denied',
  };
  sent: string[] = [];
  startServerCalls = 0;
  disconnectCalls = 0;
  requestPermissions = vi.fn();
  requestEnable = vi.fn();
  connectToDevice = vi.fn();

  getStatus = () => JSON.stringify(this.status);
  getPairedDevices = () => JSON.stringify([]);
  startServer = () => {
    this.startServerCalls += 1;
  };
  sendData = (message: string) => {
    this.sent.push(message);
  };
  disconnect = () => {
    this.disconnectCalls += 1;
  };
}

function framesOfKind<K extends WireMessage['kind']>(
  bridge: FakeBridge,
  kind: K
): Array<Extract<WireMessage, { kind: K }>> {
  const frames: Array<Extract<WireMessage, { kind: K }>> = [];
  for (const raw of bridge.sent) {
    const parsed = parseWireMessage(raw);
    if (parsed && parsed.kind === kind) {
      frames.push(parsed as Extract<WireMessage, { kind: K }>);
    }
  }
  return frames;
}

function lastFrame<K extends WireMessage['kind']>(
  bridge: FakeBridge,
  kind: K
): Extract<WireMessage, { kind: K }> | undefined {
  return framesOfKind(bridge, kind).at(-1);
}

async function connectedPair() {
  const hostBridge = new FakeBridge();
  const guestBridge = new FakeBridge();
  const host = new DirectMultiplayerManager(() => hostBridge);
  const guest = new DirectMultiplayerManager(() => guestBridge);
  host.init();
  guest.init();

  await host.startHost({
    variant: 'three_dooz',
    identity: { displayName: 'میزبان', stoneSkinId: 'skin_classic', profileFrameId: 'frame_simple' },
  });
  await guest.joinDevice('AA:BB:CC:DD:EE:FF', {
    variant: 'three_dooz',
    identity: { displayName: 'مهمان', stoneSkinId: 'skin_copper', profileFrameId: 'frame_royal' },
  });

  host.handleNativeEvent('connected', 'گوشی مهمان');
  const hello = lastFrame(hostBridge, 'hello');
  expect(hello).toBeDefined();

  guest.handleNativeEvent('connected', 'گوشی میزبان');
  guest.handleNativeEvent('data', encodeWireMessage(hello!));
  const ack = lastFrame(guestBridge, 'hello_ack');
  expect(ack).toBeDefined();
  host.handleNativeEvent('data', encodeWireMessage(ack!));

  return { host, guest, hostBridge, guestBridge };
}

describe('bluetooth wire protocol', () => {
  it('round-trips a valid command message', () => {
    const match = createMatchState('three_dooz', 'match-1');
    const message = createCommandMessage(match, { type: 'PLACE', index: 4 }, 'cmd-1');
    const parsed = parseWireMessage(encodeWireMessage(message));
    expect(parsed).toEqual(message);
  });

  it('rejects a wrong protocol version, bad JSON and truncated payloads', () => {
    const match = createMatchState('three_dooz', 'match-1');
    const message = createCommandMessage(match, { type: 'PLACE', index: 4 }, 'cmd-1');
    const wrong = { ...message, protocolVersion: 999 };
    expect(parseWireMessage(JSON.stringify(wrong))).toBeNull();
    expect(parseWireMessage('{not json')).toBeNull();
    expect(parseWireMessage('')).toBeNull();
    expect(parseWireMessage(JSON.stringify(message).slice(0, 30))).toBeNull();
    expect(parseWireMessage(null as unknown as string)).toBeNull();
  });

  it('counts the size limit in UTF-8 bytes, not JavaScript characters', () => {
    const original = 'مهره';
    expect(new TextEncoder().encode(original).length).toBeGreaterThan(original.length);

    const tooBig: WireMessage = {
      kind: 'error',
      protocolVersion: PROTOCOL_VERSION,
      matchId: 'm1',
      code: 'x',
      messageFa: 'ی'.repeat(Math.ceil(MAX_WIRE_BYTES / 2) + 10),
    };
    expect(() => encodeWireMessage(tooBig)).toThrow(/بیش از حد مجاز/);
    expect(
      parseWireMessage(
        JSON.stringify({ ...tooBig, messageFa: 'ی'.repeat(Math.ceil(MAX_WIRE_BYTES / 2) + 10) })
      )
    ).toBeNull();
  });

  it('rejects a snapshot whose match id disagrees with the envelope', () => {
    const match = createMatchState('three_dooz', 'match-a');
    const frame = {
      kind: 'state',
      protocolVersion: PROTOCOL_VERSION,
      matchId: 'match-b',
      version: match.version,
      state: match,
    };
    expect(parseWireMessage(JSON.stringify(frame))).toBeNull();
  });

  it('rejects commands with non-integer or missing coordinates', () => {
    const base = {
      kind: 'command',
      protocolVersion: PROTOCOL_VERSION,
      matchId: 'm1',
      commandId: 'c1',
      expectedVersion: 0,
    };
    expect(
      parseWireMessage(JSON.stringify({ ...base, command: { type: 'PLACE', index: 1.5 } }))
    ).toBeNull();
    expect(
      parseWireMessage(JSON.stringify({ ...base, command: { type: 'MOVE', from: 1 } }))
    ).toBeNull();
    expect(
      parseWireMessage(JSON.stringify({ ...base, command: { type: 'REMOVE', index: -1 } }))
    ).toBeNull();
    expect(
      parseWireMessage(JSON.stringify({ ...base, command: { type: 'PLACE', index: -1 } }))
    ).toBeNull();
    expect(
      parseWireMessage(JSON.stringify({ ...base, command: { type: 'PLACE', index: 24 } }))
    ).toBeNull();
    expect(
      parseWireMessage(JSON.stringify({ ...base, command: { type: 'MOVE', from: 4, to: 4 } }))
    ).toBeNull();
    expect(
      parseWireMessage(JSON.stringify({ ...base, command: { type: 'PLACE', index: 8 } }))
    ).not.toBeNull();
  });
});

describe('native bluetooth transport', () => {
  it('keeps every subscriber alive when a modal subscribes later', async () => {
    const hostBridge = new FakeBridge();
    const manager = new DirectMultiplayerManager(() => hostBridge);
    manager.init();

    const first: MultiplayerState[] = [];
    const second: MultiplayerState[] = [];
    const unsubscribeFirst = manager.subscribeState((state) => first.push(state));
    const unsubscribeSecond = manager.subscribeState((state) => second.push(state));

    manager.handleNativeEvent('status', 'سلام');
    expect(first.at(-1)?.statusText).toBe('سلام');
    expect(second.at(-1)?.statusText).toBe('سلام');

    unsubscribeSecond();
    manager.handleNativeEvent('status', 'دوباره');
    expect(first.at(-1)?.statusText).toBe('دوباره');
    expect(second.at(-1)?.statusText).toBe('سلام');

    unsubscribeFirst();
    manager.handleNativeEvent('status', 'بعد از حذف');
    expect(first.at(-1)?.statusText).toBe('دوباره');
  });

  it('performs a handshake and exposes distinct host/guest roles', async () => {
    const { host, guest, hostBridge, guestBridge } = await connectedPair();

    expect(host.getState().phase).toBe('ready');
    expect(guest.getState().phase).toBe('ready');
    expect(host.getState().isHost).toBe(true);
    expect(guest.getState().isHost).toBe(false);
    expect(host.getSession()?.role).toBe('host');
    expect(guest.getSession()?.role).toBe('guest');
    expect(host.getState().remoteName).toBe('مهمان');
    expect(guest.getState().remoteName).toBe('میزبان');
    expect(guest.getState().remoteStoneSkinId).toBe('skin_classic');
    expect(host.getState().remoteStoneSkinId).toBe('skin_copper');
    expect(host.getSession()?.matchId).toBe(guest.getSession()?.matchId);
    expect(hostBridge.startServerCalls).toBe(1);
    expect(guestBridge.connectToDevice).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
  });

  it('refuses to start a match when the variants differ', async () => {
    const hostBridge = new FakeBridge();
    const guestBridge = new FakeBridge();
    const host = new DirectMultiplayerManager(() => hostBridge);
    const guest = new DirectMultiplayerManager(() => guestBridge);
    host.init();
    guest.init();
    await host.startHost({
      variant: 'three_dooz',
      identity: { displayName: 'میزبان', stoneSkinId: 'skin_classic', profileFrameId: 'frame_simple' },
    });
    await guest.joinDevice('AA:BB:CC:DD:EE:FF', {
      variant: 'twelve_dooz',
      identity: { displayName: 'مهمان', stoneSkinId: 'skin_classic', profileFrameId: 'frame_simple' },
    });
    host.handleNativeEvent('connected', 'مهمان');
    guest.handleNativeEvent('connected', 'میزبان');
    guest.handleNativeEvent('data', encodeWireMessage(lastFrame(hostBridge, 'hello')!));

    expect(guest.getState().phase).not.toBe('ready');
    expect(guest.getState().error).toContain('نوع دوز');
    expect(guestBridge.disconnectCalls).toBeGreaterThan(0);
  });

  it('applies a guest command once on the host and ignores a duplicate commandId', async () => {
    const { host, guest, hostBridge, guestBridge } = await connectedPair();
    const session = host.getSession()!;
    const initial = createMatchState('three_dooz', session.matchId);
    expect(host.sendSnapshot(initial)).toBe(true);

    const guestMatches: string[] = [];
    guest.subscribeSnapshots((state) => guestMatches.push(`${state.matchId}:${state.version}`));
    guest.handleNativeEvent('data', encodeWireMessage(lastFrame(hostBridge, 'state')!));
    expect(guestMatches).toEqual([`${session.matchId}:0`]);

    const hostCommands: Array<{ command: unknown; commandId: string }> = [];
    host.subscribeCommands((payload) => hostCommands.push(payload));

    const guestMatch = createMatchState('three_dooz', session.matchId);
    expect(guest.sendCommand(guestMatch, { type: 'PLACE', index: 0 })).toBe(true);
    const commandFrame = lastFrame(guestBridge, 'command')!;
    host.handleNativeEvent('data', encodeWireMessage(commandFrame));
    host.handleNativeEvent('data', encodeWireMessage(commandFrame));

    expect(hostCommands).toHaveLength(1);
    expect(hostCommands[0].commandId).toBe(commandFrame.commandId);
    expect(hostCommands[0].command).toEqual({ type: 'PLACE', index: 0 });
  });

  it('requests a fresh snapshot when a command carries a stale version', async () => {
    const { host, guest, hostBridge, guestBridge } = await connectedPair();
    const session = host.getSession()!;
    const initial = createMatchState('three_dooz', session.matchId);
    host.sendSnapshot(initial);

    // Host advances to version 1.
    const hostMatch = createMatchState('three_dooz', session.matchId);
    host.sendSnapshot({ ...hostMatch, version: 1 });

    const errors: Array<{ code: string }> = [];
    host.subscribeErrors((error) => errors.push(error));

    const stale = createCommandMessage(
      createMatchState('three_dooz', session.matchId),
      { type: 'PLACE', index: 0 },
      'stale-command'
    );
    host.handleNativeEvent('data', encodeWireMessage(stale));

    expect(errors.some((error) => error.code === 'stale_command')).toBe(true);
    const resent = lastFrame(hostBridge, 'state');
    expect(resent?.version).toBe(1);
    void guest;
    void guestBridge;
  });

  it('sends an acknowledgement for every accepted snapshot and ignores older ones', async () => {
    const { host, guest, hostBridge, guestBridge } = await connectedPair();
    const session = host.getSession()!;
    const initial = createMatchState('three_dooz', session.matchId);
    host.sendSnapshot(initial);
    const firstSnapshot = lastFrame(hostBridge, 'state')!;

    guest.handleNativeEvent('data', encodeWireMessage(firstSnapshot));
    expect(lastFrame(guestBridge, 'ack')?.version).toBe(0);

    const newer = { ...initial, version: 2 };
    host.sendSnapshot(newer);
    guest.handleNativeEvent('data', encodeWireMessage(lastFrame(hostBridge, 'state')!));
    expect(lastFrame(guestBridge, 'ack')?.version).toBe(2);

    const before = framesOfKind(guestBridge, 'ack').length;
    guest.handleNativeEvent('data', encodeWireMessage(firstSnapshot));
    const after = framesOfKind(guestBridge, 'ack');
    expect(after.length).toBe(before + 1);
    expect(after.at(-1)?.version).toBe(2);
  });

  it('requires explicit rematch consent before the host may reset the match', async () => {
    const { host, guest, hostBridge, guestBridge } = await connectedPair();
    const session = host.getSession()!;
    const initial = createMatchState('three_dooz', session.matchId);
    host.sendSnapshot(initial);
    guest.handleNativeEvent('data', encodeWireMessage(lastFrame(hostBridge, 'state')!));

    const requestEvents: string[] = [];
    const acceptEvents: string[] = [];
    const startEvents: string[] = [];
    host.subscribeRematch((event) => requestEvents.push(event.type));
    guest.subscribeRematch((event) => {
      if (event.type === 'accepted') acceptEvents.push(event.type);
      if (event.type === 'started') startEvents.push(event.type);
    });

    const rematch = createMatchState('three_dooz', session.matchId);
    expect(host.beginRematch(rematch)).toBe(false);

    guest.requestRematch();
    const request = lastFrame(guestBridge, 'rematch_request');
    expect(request).toBeDefined();
    host.handleNativeEvent('data', encodeWireMessage(request!));
    expect(requestEvents).toContain('requested');

    expect(host.beginRematch(rematch)).toBe(false);

    host.acceptRematch();
    const accept = lastFrame(hostBridge, 'rematch_accept');
    expect(accept).toBeDefined();
    guest.handleNativeEvent('data', encodeWireMessage(accept!));
    expect(acceptEvents).toContain('accepted');

    expect(host.beginRematch(rematch)).toBe(true);
    const start = lastFrame(hostBridge, 'rematch_start');
    expect(start).toBeDefined();
    guest.handleNativeEvent('data', encodeWireMessage(start!));
    expect(startEvents).toContain('started');
    expect(guest.beginRematch(rematch)).toBe(false);
  });

  it('does not reset the match when the opponent declines a rematch', async () => {
    const { host, guest, hostBridge, guestBridge } = await connectedPair();
    const session = host.getSession()!;
    const initial = createMatchState('three_dooz', session.matchId);
    host.sendSnapshot(initial);
    guest.handleNativeEvent('data', encodeWireMessage(lastFrame(hostBridge, 'state')!));

    const declinedEvents: string[] = [];
    host.subscribeRematch((event) => declinedEvents.push(event.type));
    guest.subscribeRematch((event) => declinedEvents.push(`guest:${event.type}`));

    guest.requestRematch();
    host.handleNativeEvent('data', encodeWireMessage(lastFrame(guestBridge, 'rematch_request')!));
    expect(declinedEvents).toContain('requested');

    host.declineRematch();
    const decline = lastFrame(hostBridge, 'rematch_decline');
    expect(decline).toBeDefined();
    guest.handleNativeEvent('data', encodeWireMessage(decline!));

    expect(declinedEvents).toContain('guest:declined');
    // The sender must not mistake its own decline for a hostile reset.
    expect(declinedEvents.filter((type) => type === 'declined')).toHaveLength(0);
    expect(host.beginRematch(initial)).toBe(false);
    expect(guest.beginRematch(initial)).toBe(false);
  });

  it('surfaces permission denial, including permanent denial', async () => {
    const bridge = new FakeBridge();
    bridge.status.permission = 'required';
    const manager = new DirectMultiplayerManager(() => bridge);
    manager.init();

    const errors: string[] = [];
    manager.subscribeErrors((error) => errors.push(error.code));

    const started = await manager.startHost({
      variant: 'three_dooz',
      identity: { displayName: 'میزبان', stoneSkinId: 'skin_classic', profileFrameId: 'frame_simple' },
    });
    expect(started).toBe(false);
    expect(bridge.requestPermissions).toHaveBeenCalledTimes(1);

    manager.handleNativeEvent('permission', JSON.stringify({ granted: false, permanentlyDenied: true }));
    expect(manager.getState().phase).toBe('error');
    expect(errors).toContain('permission_permanently_denied');
    expect(manager.getState().error).toContain('برای همیشه');
  });

  it('resumes hosting after bluetooth is switched on', async () => {
    const bridge = new FakeBridge();
    bridge.status.enabled = false;
    const manager = new DirectMultiplayerManager(() => bridge);
    manager.init();

    const started = await manager.startHost({
      variant: 'twelve_dooz',
      identity: { displayName: 'میزبان', stoneSkinId: 'skin_classic', profileFrameId: 'frame_simple' },
    });
    expect(started).toBe(false);
    expect(bridge.requestEnable).toHaveBeenCalledTimes(1);
    expect(manager.getState().phase).toBe('bluetooth_disabled');

    bridge.status.enabled = true;
    manager.handleNativeEvent('enabled');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(manager.getState().phase).toBe('hosting');
    expect(bridge.startServerCalls).toBe(1);
  });

  it('reports malformed frames without changing the match', async () => {
    const { host } = await connectedPair();
    const errors: string[] = [];
    host.subscribeErrors((error) => errors.push(error.code));
    const phase = host.getState().phase;
    host.handleNativeEvent('data', '{"kind":"state"');
    host.handleNativeEvent('data', 'null');
    host.handleNativeEvent('data', JSON.stringify({ kind: 'hello', protocolVersion: 1 }));
    expect(errors.filter((code) => code === 'bad_message').length).toBe(3);
    expect(host.getState().phase).toBe(phase);
  });

  it('does not expose simulation APIs and cleans up on disconnect', async () => {
    const { host, hostBridge } = await connectedPair();
    expect('simulateConnected' in host).toBe(false);
    host.disconnect();
    expect(hostBridge.disconnectCalls).toBe(1);
    expect(host.getState().phase).toBe('disconnected');
    expect(host.getState().role).toBeNull();
    expect(host.getSession()).toBeNull();
  });
});
