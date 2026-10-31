import {
  isMatchState,
  type MatchCommand,
  type MatchState,
  type MatchVariant,
} from '../game/match';

export const PROTOCOL_VERSION = 1 as const;
export const MAX_WIRE_BYTES = 64 * 1024;

export type PlayerRole = 'host' | 'guest';

export interface SessionInfo {
  protocolVersion: typeof PROTOCOL_VERSION;
  matchId: string;
  role: PlayerRole;
  variant: MatchVariant;
  remoteName: string;
  remoteStoneSkinId: string | null;
  remoteProfileFrameId: string | null;
}

export type WireMessage =
  | {
      kind: 'hello';
      protocolVersion: number;
      matchId: string;
      role: 'host';
      variant: MatchVariant;
      displayName: string;
      stoneSkinId: string;
      profileFrameId: string;
    }
  | {
      kind: 'hello_ack';
      protocolVersion: number;
      matchId: string;
      role: 'guest';
      variant: MatchVariant;
      displayName: string;
      stoneSkinId: string;
      profileFrameId: string;
    }
  | {
      kind: 'command';
      protocolVersion: number;
      matchId: string;
      commandId: string;
      expectedVersion: number;
      command: MatchCommand;
    }
  | {
      kind: 'state';
      protocolVersion: number;
      matchId: string;
      version: number;
      state: MatchState;
      ackFor?: string;
    }
  | {
      kind: 'ack';
      protocolVersion: number;
      matchId: string;
      version: number;
      commandId?: string;
    }
  | {
      kind: 'state_request';
      protocolVersion: number;
      matchId: string;
    }
  | {
      kind: 'rematch_request';
      protocolVersion: number;
      matchId: string;
    }
  | {
      kind: 'rematch_accept';
      protocolVersion: number;
      matchId: string;
    }
  | {
      kind: 'rematch_decline';
      protocolVersion: number;
      matchId: string;
    }
  | {
      kind: 'rematch_start';
      protocolVersion: number;
      matchId: string;
      state: MatchState;
    }
  | {
      kind: 'error';
      protocolVersion: number;
      matchId: string;
      code: string;
      messageFa: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validId(value: unknown, max = 128): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

const MIN_BOARD_INDEX = 0;
const MAX_BOARD_INDEX = 23;

function validIndex(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_BOARD_INDEX &&
    value <= MAX_BOARD_INDEX
  );
}

export function isMatchCommand(value: unknown): value is MatchCommand {
  if (!isRecord(value)) return false;
  if (value.type === 'RESIGN') return true;
  if (value.type === 'PLACE' || value.type === 'REMOVE') {
    return validIndex(value.index);
  }
  if (value.type === 'MOVE') {
    return validIndex(value.from) && validIndex(value.to) && value.from !== value.to;
  }
  return false;
}

function validVariant(value: unknown): value is MatchVariant {
  return value === 'three_dooz' || value === 'twelve_dooz';
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function encodeWireMessage(message: WireMessage): string {
  const encoded = JSON.stringify(message);
  if (utf8Length(encoded) > MAX_WIRE_BYTES) {
    throw new Error('پیام بلوتوث بیش از حد مجاز بزرگ است.');
  }
  return encoded;
}

/**
 * Parses one untrusted frame. Returns null instead of throwing so a broken or
 * malicious peer cannot crash the game loop.
 */
export function parseWireMessage(raw: string): WireMessage | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  if (utf8Length(raw) > MAX_WIRE_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  if (value.protocolVersion !== PROTOCOL_VERSION) return null;
  if (!validId(value.matchId)) return null;

  switch (value.kind) {
    case 'hello':
    case 'hello_ack': {
      if (!validVariant(value.variant)) return null;
      if (value.role !== (value.kind === 'hello' ? 'host' : 'guest')) return null;
      if (!validId(value.displayName, 32)) return null;
      if (!validId(value.stoneSkinId, 64)) return null;
      if (!validId(value.profileFrameId, 64)) return null;
      return value as unknown as WireMessage;
    }
    case 'command': {
      if (!validId(value.commandId)) return null;
      if (typeof value.expectedVersion !== 'number' || !Number.isInteger(value.expectedVersion)) {
        return null;
      }
      if (!isMatchCommand(value.command)) return null;
      return value as unknown as WireMessage;
    }
    case 'state': {
      if (typeof value.version !== 'number' || !Number.isInteger(value.version)) return null;
      if (!isMatchState(value.state)) return null;
      if (value.state.matchId !== value.matchId) return null;
      if (value.version !== value.state.version) return null;
      if (value.ackFor !== undefined && !validId(value.ackFor)) return null;
      return value as unknown as WireMessage;
    }
    case 'ack': {
      if (typeof value.version !== 'number' || !Number.isInteger(value.version)) return null;
      if (value.commandId !== undefined && !validId(value.commandId)) return null;
      return value as unknown as WireMessage;
    }
    case 'state_request':
    case 'rematch_request':
    case 'rematch_accept':
    case 'rematch_decline':
      return value as unknown as WireMessage;
    case 'rematch_start': {
      if (!isMatchState(value.state)) return null;
      if (value.state.matchId !== value.matchId) return null;
      return value as unknown as WireMessage;
    }
    case 'error': {
      if (!validId(value.code, 64) || typeof value.messageFa !== 'string' || value.messageFa.length > 300) {
        return null;
      }
      return value as unknown as WireMessage;
    }
    default:
      return null;
  }
}

export function createCommandMessage(
  match: MatchState,
  command: MatchCommand,
  commandId: string
): WireMessage {
  return {
    kind: 'command',
    protocolVersion: PROTOCOL_VERSION,
    matchId: match.matchId,
    commandId,
    expectedVersion: match.version,
    command,
  };
}
