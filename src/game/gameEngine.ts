import { GameVariant, MoveRecord, Winner } from './doozTypes';
import {
  ThreeDoozState,
  createInitialThreeDoozState,
  placeStoneThreeDooz,
  moveStoneThreeDooz,
  selectThreeDoozStone,
} from './threeDoozLogic';
import {
  TwelveDoozState,
  createInitialTwelveDoozState,
  placeStoneTwelveDooz,
  moveStoneTwelveDooz,
  removeOpponentStone,
  selectTwelveDoozStone,
} from './twelveDoozLogic';

/**
 * موتور اتمیک بازی.
 *
 * تمام مسیرها (کلیک کاربر، هوش مصنوعی، پیام شبکه) باید از `reduceEngine` رد شوند
 * تا هیچ‌گاه دو حرکت روی یک state کهنه ساخته نشود. توابع منطق بازی خالص هستند و
 * state قبلی را تغییر نمی‌دهند، بنابراین تاریخچه فقط با نگه‌داشتن ارجاع‌ها ساخته می‌شود.
 */

export interface EngineState {
  three: ThreeDoozState;
  twelve: TwelveDoozState;
}

export function createEngineState(): EngineState {
  return {
    three: createInitialThreeDoozState(),
    twelve: createInitialTwelveDoozState(),
  };
}

export type EngineAction =
  | { type: 'PLACE'; index: number }
  | { type: 'MOVE'; from: number; to: number }
  | { type: 'REMOVE'; index: number }
  | { type: 'SELECT'; index: number | null };

export interface ActionOutcome {
  state: EngineState;
  applied: boolean;
  /** دلیل رد شدن حرکت (فارسی، آمادهٔ نمایش به کاربر) */
  reason?: string;
  /** حرکتی که واقعاً اعمال شد */
  record?: MoveRecord;
}

const REJECTED = (reason: string, state: EngineState): ActionOutcome => ({
  state,
  applied: false,
  reason,
});

export function activeState(engine: EngineState, variant: GameVariant): ThreeDoozState | TwelveDoozState {
  return variant === 'three_dooz' ? engine.three : engine.twelve;
}

export function activeWinner(engine: EngineState, variant: GameVariant): Winner | null {
  return activeState(engine, variant).winner;
}

export function isHandFinished(engine: EngineState, variant: GameVariant): boolean {
  return activeState(engine, variant).winner !== null;
}

/**
 * پایان اجباری یک دست (مثلاً وقتی حریف حرکت قانونی ندارد و قواعد آن را تشخیص نداده‌اند).
 * این تنها مسیر خارج از reduceEngine است و فقط وضعیت پایانی را می‌نویسد.
 */
export function forceEndHand(
  engine: EngineState,
  variant: GameVariant,
  winner: Winner,
  reason: string
): EngineState {
  if (variant === 'three_dooz') {
    return {
      ...engine,
      three: {
        ...engine.three,
        winner,
        winningReason: reason,
        phase: 'gameover',
        selectedFromIndex: null,
        lastFormedLines: [],
      },
    };
  }
  return {
    ...engine,
    twelve: {
      ...engine.twelve,
      winner,
      winningReason: reason,
      phase: 'gameover',
      selectedFromIndex: null,
      mustRemoveOpponentStone: false,
      lastFormedLines: [],
    },
  };
}

/**
 * اعمال یک حرکت. اگر حرکت نامعتبر باشد، همان state بدون تغییر و با دلیل برمی‌گردد.
 * این تابع هیچ‌گاه دو بار روی یک state اثر نمی‌گذارد؛ فراخوان باید نتیجه را جایگزین
 * state قبلی کند.
 */
export function reduceEngine(
  engine: EngineState,
  action: EngineAction,
  variant: GameVariant
): ActionOutcome {
  if (variant === 'three_dooz') {
    const current = engine.three;
    if (current.winner) return REJECTED('این دست تمام شده است', engine);

    switch (action.type) {
      case 'SELECT': {
        const next = selectThreeDoozStone(current, action.index);
        if (next === current) return REJECTED('این مهره قابل انتخاب نیست', engine);
        return { state: { ...engine, three: next }, applied: true };
      }
      case 'PLACE': {
        const next = placeStoneThreeDooz(current, action.index);
        if (next === current) return REJECTED('این خانه در دسترس نیست', engine);
        return {
          state: { ...engine, three: next },
          applied: true,
          record: next.lastMove ?? undefined,
        };
      }
      case 'MOVE': {
        const next = moveStoneThreeDooz(current, action.from, action.to);
        if (next === current) return REJECTED('این حرکت مجاز نیست', engine);
        return {
          state: { ...engine, three: next },
          applied: true,
          record: next.lastMove ?? undefined,
        };
      }
      case 'REMOVE':
        return REJECTED('در دوز ۳ تایی مهره‌ای سوزانده نمی‌شود', engine);
      default:
        return REJECTED('حرکت ناشناخته', engine);
    }
  }

  const current = engine.twelve;
  if (current.winner) return REJECTED('این دست تمام شده است', engine);

  switch (action.type) {
    case 'SELECT': {
      const next = selectTwelveDoozStone(current, action.index);
      if (next === current) return REJECTED('این مهره قابل انتخاب نیست', engine);
      return { state: { ...engine, twelve: next }, applied: true };
    }
    case 'PLACE': {
      const next = placeStoneTwelveDooz(current, action.index);
      if (next === current) return REJECTED('این خانه در دسترس نیست', engine);
      return {
        state: { ...engine, twelve: next },
        applied: true,
        record: next.lastMove ?? undefined,
      };
    }
    case 'MOVE': {
      const next = moveStoneTwelveDooz(current, action.from, action.to);
      if (next === current) return REJECTED('این حرکت مجاز نیست', engine);
      return {
        state: { ...engine, twelve: next },
        applied: true,
        record: next.lastMove ?? undefined,
      };
    }
    case 'REMOVE': {
      const next = removeOpponentStone(current, action.index);
      if (next === current) return REJECTED('این مهره قابل سوزاندن نیست', engine);
      return {
        state: { ...engine, twelve: next },
        applied: true,
        record: next.lastMove ?? undefined,
      };
    }
    default:
      return REJECTED('حرکت ناشناخته', engine);
  }
}

/** state تخته بدون فیلدهای سنگین تاریخچه — برای ارسال همگام‌سازی در شبکه */
export function serializeForSync(engine: EngineState, variant: GameVariant): string {
  const state = activeState(engine, variant) as ThreeDoozState & TwelveDoozState;
  return JSON.stringify({
    board: state.board,
    unplacedCount: state.unplacedCount,
    turn: state.turn,
    phase: state.phase,
    mustRemoveOpponentStone: 'mustRemoveOpponentStone' in state ? state.mustRemoveOpponentStone : false,
    winner: state.winner,
    winningReason: state.winningReason,
    winningLine: state.winningLine,
    lastFormedLines: state.lastFormedLines,
    moveCount: state.moveCount,
    positionCounts: state.positionCounts,
    movesSinceProgress: state.movesSinceProgress,
    selectedFromIndex: null,
    lastMove: state.lastMove,
  });
}

/** بازسازی engine از یک اسنپ‌شات همگام‌سازی‌شده */export function applySyncSnapshot(
  engine: EngineState,
  variant: GameVariant,
  snapshotJson: string
): EngineState | null {
  try {
    const raw = JSON.parse(snapshotJson) as Partial<TwelveDoozState> & Partial<ThreeDoozState>;
    if (!raw || !Array.isArray(raw.board) || !raw.turn) return null;
    if (variant === 'three_dooz') {
      if (raw.board.length !== 9) return null;
      const base = createInitialThreeDoozState();
      const next: ThreeDoozState = {
        ...base,
        ...raw,
        board: raw.board,
        selectedFromIndex: null,
      };
      return { ...engine, three: next };
    }
    if (raw.board.length !== 24) return null;
    const base = createInitialTwelveDoozState();
    const next: TwelveDoozState = {
      ...base,
      ...raw,
      board: raw.board,
      selectedFromIndex: null,
    };
    return { ...engine, twelve: next };
  } catch {
    return null;
  }
}
