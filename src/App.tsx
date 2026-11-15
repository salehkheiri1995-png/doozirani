/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Bluetooth,
  Smartphone,
  Bot,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  ShoppingBag,
  Coins,
  ChevronLeft,
  CircleUserRound,
} from 'lucide-react';
import { AIDifficulty, GameMode, GameVariant, Player, PlayerStats, Winner, isNetworkMode } from './game/doozTypes';
import {
  EngineState,
  EngineAction,
  createEngineState,
  reduceEngine,
  forceEndHand,
  applySyncSnapshot,
  serializeForSync,
} from './game/gameEngine';
import {
  getLegalMoveDestinations,
} from './game/threeDoozLogic';
import {
  getLegalTwelveDoozMoves,
  getRemovableOpponentStones,
  countStonesOnBoard,
} from './game/twelveDoozLogic';
import { getThreeDoozAIMove, getTwelveDoozAIMove } from './game/aiPlayer';
import { HeaderHUD } from './components/HeaderHUD';
import { ThreeDoozBoard } from './components/ThreeDoozBoard';
import { TwelveDoozBoard } from './components/TwelveDoozBoard';
import { ModeSelectorModal } from './components/ModeSelectorModal';
import { BluetoothModal } from './components/BluetoothModal';
import { GameOverModal } from './components/GameOverModal';
import { RulesModal } from './components/RulesModal';
import { ShopModal } from './components/ShopModal';
import { RewardedAdModal } from './components/RewardedAdModal';
import { InterstitialAdModal } from './components/InterstitialAdModal';
import { TapsellBanner } from './components/TapsellBanner';
import { ConfirmDialog, ConfirmOptions } from './components/ConfirmDialog';
import { ProfileModal } from './components/ProfileModal';
import { useTapsell } from './hooks/useTapsell';
import {
  getPlayerCoins,
  addPlayerCoins,
  getSkinById,
  getActiveSkinId,
  recordWinStreak,
  getBoardThemeById,
  getActiveBoardThemeId,
  REWARDED_AMOUNT,
  canShowInterstitial,
  registerGameFinished,
  registerInterstitial,
  hasNoAds,
} from './utils/monetization';
import { TAPSELL_CONFIG } from './utils/tapsellService';
import { toFa } from './utils/format';
import {
  AppSettings,
  loadSettings,
  saveSettings,
  saveSession,
  loadSession,
  clearSession,
  hasResumableSession,
  SavedSession,
  recordResult,
  resetProgressData,
  GameResult,
} from './utils/storage';
import {
  playStonePlaceSound,
  playStoneSelectSound,
  playDoozChimeSound,
  playStoneCaptureSound,
  playVictorySound,
  setSoundEnabled,
  triggerHaptic,
  pauseAudio,
  resumeAudio,
} from './utils/audio';
import { directMultiplayer, ConnectionKind, NetEnvelope } from './utils/directMultiplayer';

const NET_FIRST = 450;
const NET_IDLE_WARN_MS = 12_000;

type Screen = 'title' | 'playing' | 'gameover';

export default function App() {
  // --- تنظیمات پایدار ---
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const variant = settings.variant;
  const mode = settings.mode;
  const aiDifficulty = settings.aiDifficulty;
  const soundOn = settings.sound;

  // --- وضعیت بازی ---
  const [screen, setScreen] = useState<Screen>('title');
  const [engine, setEngine] = useState<EngineState>(() => createEngineState());
  const [scores, setScores] = useState<PlayerStats>({ player1: 0, player2: 0, draws: 0 });
  const [coins, setCoins] = useState<number>(() => getPlayerCoins());
  const [lastCoinsEarned, setLastCoinsEarned] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [resumeInfo, setResumeInfo] = useState<SavedSession | null>(null);

  // --- شبکه ---
  const [mySide, setMySide] = useState<Player | null>(null);
  const [connectionWarn, setConnectionWarn] = useState(false);

  // --- مودال‌ها ---
  const [isModesOpen, setIsModesOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isRewardedAdOpen, setIsRewardedAdOpen] = useState(false);
  const [isInterstitialOpen, setIsInterstitialOpen] = useState(false);
  const [isBluetoothOpen, setIsBluetoothOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // --- کازمتیک ---
  const [activeSkinId, setActiveSkinIdState] = useState<string>(getActiveSkinId);
  const [activeThemeId, setActiveThemeIdState] = useState<string>(getActiveBoardThemeId);
  const activeSkin = getSkinById(activeSkinId);
  const activeTheme = getBoardThemeById(activeThemeId);

  useTapsell();

  // --- ارجاع‌های پایدار ---
  const engineRef = useRef(engine);
  const historyRef = useRef<EngineState[]>([]);
  const variantRef = useRef(variant);
  const modeRef = useRef(mode);
  const screenRef = useRef(screen);
  const mySideRef = useRef(mySide);
  const settingsRef = useRef(settings);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef<string | null>(null);
  const handStatsRef = useRef({ mills: 0, captures: 0 });

  engineRef.current = engine;
  variantRef.current = variant;
  modeRef.current = mode;
  screenRef.current = screen;
  mySideRef.current = mySide;
  settingsRef.current = settings;

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ذخیرهٔ تنظیمات و اعمال صدا
  useEffect(() => {
    saveSettings(settings);
    setSoundEnabled(settings.sound);
  }, [settings]);

  // re-sync cosmetics after shop closes
  useEffect(() => {
    if (!isShopOpen) {
      setActiveSkinIdState(getActiveSkinId());
      setActiveThemeIdState(getActiveBoardThemeId());
    }
  }, [isShopOpen]);

  // دست نیمه‌کاره در بوت
  useEffect(() => {
    if (hasResumableSession()) setResumeInfo(loadSession());
  }, []);

  // ---------------------------------------------------------------------
  // هستهٔ اعمال حرکت
  // ---------------------------------------------------------------------

  const activeOf = (state: EngineState, v: GameVariant) => (v === 'three_dooz' ? state.three : state.twelve);

  const pushHistory = (snapshot: EngineState) => {
    historyRef.current = [...historyRef.current.slice(-40), snapshot];
    setHistoryCount(historyRef.current.length);
  };

  const clearHistory = () => {
    historyRef.current = [];
    setHistoryCount(0);
  };

  const sendNet = (
    type: NetEnvelope['type'],
    moveCount: number,
    payload?: unknown
  ) => {
    directMultiplayer.send({
      type,
      side: mySideRef.current ?? 'player1',
      variant: variantRef.current,
      moveCount,
      payload,
    });
  };

  const finishHand = useCallback(
    (state: EngineState, v: GameVariant) => {
      const active = activeOf(state, v);
      const winner = active.winner as Winner | null;
      if (!winner) return;

      const settleKey = `${v}:${active.moveCount}:${winner}:${active.unplacedCount.player1}`;
      if (settledRef.current === settleKey) return;
      settledRef.current = settleKey;

      setScreen('gameover');
      playVictorySound();

      const networked = isNetworkMode(modeRef.current);
      const side = mySideRef.current;
      const iWon = winner === 'draw' ? false : networked ? winner === side : winner === 'player1';
      const iLost = winner === 'draw' ? false : networked ? winner !== side : winner === 'player2';

      const result: GameResult = winner === 'draw' ? 'draw' : iWon ? 'win' : 'loss';
      recordResult(v, result, active.moveCount, {
        mills: handStatsRef.current.mills,
        captures: handStatsRef.current.captures,
      });

      let earned = 0;
      if (iWon) {
        const streak = recordWinStreak(true);
        const base = v === 'three_dooz' ? 30 : 50;
        const bonus = Math.min(10 * streak, 50);
        earned = base + bonus;
      } else {
        recordWinStreak(false);
      }

      if (winner === 'draw') {
        setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
      } else {
        setScores((prev) => ({
          ...prev,
          player1: prev.player1 + (winner === 'player1' ? 1 : 0),
          player2: prev.player2 + (winner === 'player2' ? 1 : 0),
        }));
      }

      if (earned > 0) {
        setCoins(addPlayerCoins(earned));
      }
      setLastCoinsEarned(earned);

      registerGameFinished();
      if (canShowInterstitial(!!TAPSELL_CONFIG.zones.interstitialVideo, hasNoAds())) {
        registerInterstitial();
        setTimeout(() => setIsInterstitialOpen(true), 900);
      }
    },
    []
  );

  /**
   * تنها مسیر تغییر تخته.
   * fromRemote: حرکت حریف است و نباید دوباره ارسال شود.
   * recordHistory: برای Undo ثبت شود.
   */
  const applyAction = useCallback(
    (action: EngineAction, opts: { fromRemote?: boolean; recordHistory?: boolean } = {}): boolean => {
      const v = variantRef.current;
      const current = engineRef.current;
      const outcome = reduceEngine(current, action, v);

      if (!outcome.applied) {
        if (!opts.fromRemote) {
          showToast(outcome.reason ?? 'این حرکت مجاز نیست');
          triggerHaptic(30);
        }
        return false;
      }

      if (opts.recordHistory !== false) pushHistory(current);
      engineRef.current = outcome.state;
      setEngine(outcome.state);

      // آمار درون‌دست
      const record = outcome.record;
      if (record) {
        if (record.formedLines && record.formedLines.length > 0) {
          handStatsRef.current.mills += record.formedLines.length;
          playDoozChimeSound();
        } else if (record.removedStone !== undefined) {
          handStatsRef.current.captures += 1;
          playStoneCaptureSound();
        } else {
          playStonePlaceSound();
        }
      }

      // ارسال به گوشی حریف
      if (!opts.fromRemote && isNetworkMode(modeRef.current) && mySideRef.current) {
        const active = activeOf(outcome.state, v);
        if (action.type === 'PLACE') sendNet('PLACE', active.moveCount, { index: action.index });
        else if (action.type === 'MOVE') sendNet('MOVE', active.moveCount, { from: action.from, to: action.to });
        else if (action.type === 'REMOVE') sendNet('REMOVE', active.moveCount, { index: action.index });
      }

      finishHand(outcome.state, v);
      return true;
    },
    [finishHand, showToast]
  );

  const applyRef = useRef(applyAction);
  applyRef.current = applyAction;

  // ---------------------------------------------------------------------
  // شروع / ادامه / پایان دست
  // ---------------------------------------------------------------------

  const startNewHand = useCallback(
    (overrides: { variant?: GameVariant; mode?: GameMode; difficulty?: AIDifficulty; silent?: boolean } = {}) => {
      const v = overrides.variant ?? variantRef.current;
      const m = overrides.mode ?? modeRef.current;
      const d = overrides.difficulty ?? settingsRef.current.aiDifficulty;

      setSettings((prev) => ({ ...prev, variant: v, mode: m, aiDifficulty: d }));
      variantRef.current = v;
      modeRef.current = m;

      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }

      const fresh = createEngineState();
      engineRef.current = fresh;
      setEngine(fresh);
      clearHistory();
      setLastCoinsEarned(0);
      setConnectionWarn(false);
      settledRef.current = null;
      handStatsRef.current = { mills: 0, captures: 0 };
      setScreen('playing');
      clearSession();
      setResumeInfo(null);

      if (!overrides.silent) playStonePlaceSound();

      if (isNetworkMode(m)) {
        setMySide(directMultiplayer.getMySide());
        sendNet('START', 0, { variant: v, restart: true });
      } else {
        setMySide(null);
      }
    },
    []
  );

  const resumeSavedHand = useCallback(() => {
    const saved = loadSession();
    if (!saved) {
      showToast('دست ذخیره‌شده‌ای پیدا نشد');
      setResumeInfo(null);
      return;
    }
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setSettings((prev) => ({
      ...prev,
      variant: saved.variant,
      mode: saved.mode,
      aiDifficulty: saved.aiDifficulty,
    }));
    variantRef.current = saved.variant;
    modeRef.current = saved.mode;
    const restored: EngineState = { three: saved.three, twelve: saved.twelve };
    engineRef.current = restored;
    setEngine(restored);
    clearHistory();
    setMySide(isNetworkMode(saved.mode) ? directMultiplayer.getMySide() : null);
    setScreen('playing');
    settledRef.current = null;
    showToast('دست قبلی ادامه یافت');
  }, [showToast]);

  /**
   * شروع دست جدید.
   * در بازی شبکه‌ای فقط درخواست می‌فرستیم؛ دست وقتی عوض می‌شود که حریف تأیید کند
   * (REMATCH_ACCEPT). این کار از واگرایی تختهٔ دو گوشی جلوگیری می‌کند.
   */
  const restartCurrentHand = useCallback(() => {
    if (isNetworkMode(modeRef.current)) {
      sendNet('REMATCH_REQUEST', 0);
      showToast('درخواست دست جدید برای حریف ارسال شد');
      return;
    }
    startNewHand();
  }, [sendNet, showToast, startNewHand]);

  const requestRestart = useCallback(() => {
    const active = activeOf(engineRef.current, variantRef.current);
    if (active.moveCount === 0) {
      restartCurrentHand();
      return;
    }
    setConfirm({
      title: 'شروع دست جدید؟',
      body: 'بازی فعلی از بین می‌رود و امتیاز این دست ثبت نمی‌شود.',
      confirmLabel: 'دست جدید',
      cancelLabel: 'ادامه بدهم',
      destructive: true,
      onConfirm: () => restartCurrentHand(),
    });
  }, [restartCurrentHand]);

  const backToMenu = useCallback(() => {
    const active = activeOf(engineRef.current, variantRef.current);
    if (screenRef.current === 'playing' && active.moveCount > 0 && !active.winner) {
      setConfirm({
        title: 'بازگشت به منو؟',
        body: 'دست فعلی ذخیره می‌شود و می‌توانید بعداً «ادامهٔ بازی» را بزنید.',
        confirmLabel: 'بازگشت به منو',
        cancelLabel: 'ادامهٔ بازی',
        onConfirm: () => {
          setResumeInfo(loadSession());
          setScreen('title');
        },
      });
      return;
    }
    setResumeInfo(loadSession());
    setScreen('title');
  }, []);

  /** پاک‌کردن آمار/تنظیمات از پروفایل — خریدها دست‌نخورده می‌مانند */
  const handleDataReset = useCallback(() => {
    const fresh = createEngineState();
    engineRef.current = fresh;
    setEngine(fresh);
    clearHistory();
    setSettings(loadSettings());
    setCoins(getPlayerCoins());
    setScores({ player1: 0, player2: 0, draws: 0 });
    setResumeInfo(null);
    settledRef.current = null;
    setScreen('title');
    showToast('آمار و تنظیمات پاک شد');
  }, [clearHistory, showToast]);

  // ذخیرهٔ خودکار دست جاری
  useEffect(() => {
    if (screen !== 'playing') return;
    const active = variant === 'three_dooz' ? engine.three : engine.twelve;
    if (active.winner || active.moveCount === 0) return;
    saveSession({
      variant,
      mode,
      aiDifficulty,
      three: engine.three,
      twelve: engine.twelve,
    });
  }, [engine, screen, variant, mode, aiDifficulty]);

  // چرخهٔ عمر WebView: دست جاری را پیش از پس‌زمینه‌شدن ذخیره و صدا را متوقف کن.
  useEffect(() => {
    const persistBeforeBackground = () => {
      const active = activeOf(engineRef.current, variantRef.current);
      if (screenRef.current !== 'playing' || active.winner || active.moveCount === 0) return;
      saveSession({
        variant: variantRef.current,
        mode: modeRef.current,
        aiDifficulty: settingsRef.current.aiDifficulty,
        three: engineRef.current.three,
        twelve: engineRef.current.twelve,
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistBeforeBackground();
        pauseAudio();
      } else {
        resumeAudio();
      }
    };
    window.addEventListener('pagehide', persistBeforeBackground);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', persistBeforeBackground);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // ---------------------------------------------------------------------
  // نوبت هوش مصنوعی
  // ---------------------------------------------------------------------

  useEffect(() => {
    if (screen !== 'playing' || mode !== 'vs_ai') return;
    const active = variant === 'three_dooz' ? engine.three : engine.twelve;
    if (active.winner || active.turn !== 'player2') return;

    const delay = 350 + Math.random() * 250;
    aiTimerRef.current = setTimeout(() => {
      const v = variantRef.current;
      const current = engineRef.current;
      const state = activeOf(current, v);
      if (state.winner || state.turn !== 'player2') return;

      const move =
        v === 'three_dooz'
          ? getThreeDoozAIMove(current.three, settingsRef.current.aiDifficulty)
          : getTwelveDoozAIMove(current.twelve, settingsRef.current.aiDifficulty);

      if (!move) {
        // هیچ حرکتی نیست: دست را به نفع بازیکن تمام کن تا تخته قفل نشود
        const finished = forceEndHand(
          current,
          v,
          'player1',
          'هوش مصنوعی هیچ حرکت قانونی نداشت'
        );
        engineRef.current = finished;
        setEngine(finished);
        finishHand(finished, v);
        return;
      }

      if (move.action === 'remove') {
        applyRef.current({ type: 'REMOVE', index: move.removeIndex });
      } else if (move.action === 'place') {
        applyRef.current({ type: 'PLACE', index: move.to });
      } else {
        applyRef.current({ type: 'MOVE', from: move.from, to: move.to });
      }
    }, delay);

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [engine, screen, mode, variant, aiDifficulty, showToast, finishHand]);

  // ---------------------------------------------------------------------
  // کلیک روی تخته
  // ---------------------------------------------------------------------

  const handleCellClick = (index: number) => {
    if (screen !== 'playing') return;
    if (mode === 'vs_ai' && activeOf(engine, variant).turn === 'player2') {
      showToast('نوبت هوش مصنوعی است');
      return;
    }
    if (isNetworkMode(mode)) {
      if (!mySide) {
        showToast('اول به گوشی حریف وصل شوید');
        return;
      }
      if (activeOf(engine, variant).turn !== mySide) {
        showToast('نوبت حریف است');
        return;
      }
    }

    const state = variant === 'three_dooz' ? engine.three : engine.twelve;

    // سوزاندن مهره
    if (variant === 'twelve_dooz' && engine.twelve.mustRemoveOpponentStone) {
      applyAction({ type: 'REMOVE', index });
      return;
    }

    // چیدن
    if (state.phase === 'placing') {
      if (state.board[index] !== null) {
        showToast('این خانه پر است');
        return;
      }
      applyAction({ type: 'PLACE', index });
      return;
    }

    // انتخاب / حرکت
    if (state.board[index] === state.turn) {
      playStoneSelectSound();
      applyAction({ type: 'SELECT', index });
      return;
    }

    if (state.board[index] !== null) {
      showToast('این خانه در دسترس نیست');
      return;
    }

    if (state.selectedFromIndex === null) {
      showToast('اول یکی از مهره‌های خودتان را انتخاب کنید');
      return;
    }

    const canFly =
      variant === 'twelve_dooz' &&
      settings.rules.flying &&
      countStonesOnBoard(engine.twelve.board, engine.twelve.turn) === 3;

    const destinations =
      variant === 'three_dooz'
        ? getLegalMoveDestinations(engine.three.board, state.selectedFromIndex)
        : getLegalTwelveDoozMoves(engine.twelve.board, state.selectedFromIndex, canFly);

    if (!destinations.includes(index)) {
      showToast('این حرکت مجاز نیست');
      triggerHaptic(30);
      return;
    }

    applyAction({ type: 'MOVE', from: state.selectedFromIndex, to: index });
  };

  // ---------------------------------------------------------------------
  // Undo
  // ---------------------------------------------------------------------

  const canUndo = !isNetworkMode(mode) && historyCount > 0 && screen === 'playing';

  const undoMove = useCallback(() => {
    if (isNetworkMode(modeRef.current)) return;
    const snapshots = [...historyRef.current];
    if (snapshots.length === 0) return;

    let restored = snapshots.pop()!;

    // در بازی با AI، پاسخ ربات هم برگردد تا دوباره نوبت انسان شود
    const turnOf = (state: EngineState) => activeOf(state, variantRef.current).turn;
    if (modeRef.current === 'vs_ai' && !activeOf(restored, variantRef.current).winner) {
      if (turnOf(restored) === 'player2' && snapshots.length > 0) {
        restored = snapshots.pop()!;
      }
    }

    historyRef.current = snapshots;
    setHistoryCount(snapshots.length);
    engineRef.current = restored;
    setEngine(restored);
    settledRef.current = null;
    playStoneSelectSound();
    showToast('حرکت برگردانده شد');
  }, [showToast]);

  // ---------------------------------------------------------------------
  // شبکه: دریافت پیام‌ها
  // ---------------------------------------------------------------------

  const handleNet = useCallback(
    (env: NetEnvelope) => {
      const side = mySideRef.current;
      if (!side) return;
      if (env.side === side) return; // پیام خودمان

      const v = variantRef.current;
      const current = engineRef.current;
      const active = activeOf(current, v);

      switch (env.type) {
        case 'PING':
          sendNet('PONG', active.moveCount);
          return;
        case 'PONG':
          setConnectionWarn(false);
          return;
        case 'HELLO':
          return;
        case 'START': {
          if (screenRef.current !== 'playing') {
            startNewHand({ silent: true });
            showToast('حریف بازی را شروع کرد');
          }
          return;
        }
        case 'REMATCH_REQUEST': {
          setConfirm({
            title: 'درخواست بازی مجدد',
            body: 'حریف می‌خواهد دست جدیدی شروع کند.',
            confirmLabel: 'بازی مجدد',
            cancelLabel: 'بعداً',
            onConfirm: () => {
              sendNet('REMATCH_ACCEPT', 0);
              startNewHand();
            },
          });
          return;
        }
        case 'REMATCH_ACCEPT': {
          startNewHand();
          return;
        }
        case 'RESIGN': {
          setConfirm({
            title: 'حریف تسلیم شد',
            body: 'این دست به نفع شما تمام می‌شود.',
            confirmLabel: 'باشه',
            cancelLabel: 'بستن',
            onConfirm: () => setScreen('gameover'),
          });
          return;
        }
        case 'SYNC_REQUEST': {
          sendNet('SYNC_STATE', active.moveCount, { snapshot: serializeForSync(current, v) });
          return;
        }
        case 'SYNC_STATE': {
          const snapshot = (env.payload as { snapshot?: string } | undefined)?.snapshot;
          if (!snapshot) return;
          const restored = applySyncSnapshot(current, v, snapshot);
          if (restored) {
            engineRef.current = restored;
            setEngine(restored);
            clearHistory();
            showToast('تخته با حریف همگام شد');
          }
          return;
        }
        case 'PLACE':
        case 'MOVE':
        case 'REMOVE': {
          const drift = Math.abs((env.moveCount ?? 0) - active.moveCount);
          if (drift > 1) {
            sendNet('SYNC_REQUEST', active.moveCount);
            return;
          }
          const payload = (env.payload ?? {}) as { index?: number; from?: number; to?: number };
          if (env.type === 'PLACE' && typeof payload.index === 'number') {
            applyRef.current({ type: 'PLACE', index: payload.index }, { fromRemote: true });
          } else if (env.type === 'MOVE' && typeof payload.from === 'number' && typeof payload.to === 'number') {
            applyRef.current({ type: 'MOVE', from: payload.from, to: payload.to }, { fromRemote: true });
          } else if (env.type === 'REMOVE' && typeof payload.index === 'number') {
            applyRef.current({ type: 'REMOVE', index: payload.index }, { fromRemote: true });
          }
          return;
        }
        default:
          return;
      }
    },
    [sendNet, showToast, startNewHand]
  );

  const netRef = useRef(handleNet);
  netRef.current = handleNet;

  useEffect(() => {
    const offMessage = directMultiplayer.onMessage((env) => netRef.current(env));
    const offState = directMultiplayer.onState((state) => {
      if (!state.isConnected) {
        setConnectionWarn(false);
        return;
      }
      // به‌محض برقراری اتصال، سمت این گوشی مشخص می‌شود تا پیام START حریف گم نشود
      const side = directMultiplayer.getMySide();
      if (mySideRef.current !== side) {
        mySideRef.current = side;
        setMySide(side);
      }
    });
    return () => {
      offMessage();
      offState();
    };
  }, []);

  // ضربان اتصال
  useEffect(() => {
    if (screen !== 'playing' || !isNetworkMode(mode) || !mySide) return;
    const timer = setInterval(() => {
      sendNet('PING', 0);
      if (directMultiplayer.lastIncomingAt && Date.now() - directMultiplayer.lastIncomingAt > NET_IDLE_WARN_MS) {
        setConnectionWarn(true);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [screen, mode, mySide]);

  // بازگشت به منو، اتصال را قطع نمی‌کند اما هشدار را پاک می‌کند
  useEffect(() => {
    if (screen !== 'playing') setConnectionWarn(false);
  }, [screen]);

  // ---------------------------------------------------------------------
  // قرارداد دکمهٔ بازگشت اندروید
  // ---------------------------------------------------------------------
  // MainActivity با evaluateJavascript این تابع را صدا می‌زند.
  // خروجی true یعنی رویداد مصرف شد و برنامه نباید بسته شود.

  const androidBackRef = useRef<() => boolean>(() => false);
  androidBackRef.current = (): boolean => {
    if (confirm) {
      setConfirm(null);
      return true;
    }
    if (isRewardedAdOpen) {
      setIsRewardedAdOpen(false);
      return true;
    }
    if (isInterstitialOpen) {
      setIsInterstitialOpen(false);
      return true;
    }
    if (isShopOpen) {
      setIsShopOpen(false);
      return true;
    }
    if (isProfileOpen) {
      setIsProfileOpen(false);
      return true;
    }
    if (isRulesOpen) {
      setIsRulesOpen(false);
      return true;
    }
    if (isBluetoothOpen) {
      setIsBluetoothOpen(false);
      return true;
    }
    if (isModesOpen) {
      setIsModesOpen(false);
      return true;
    }
    if (screen === 'playing') {
      backToMenu();
      return true;
    }
    // صفحهٔ عنوان: رویداد مصرف نمی‌شود تا اندروید برنامه را ببندد
    return false;
  };

  useEffect(() => {
    const bridge = window as unknown as { onAndroidBack?: () => boolean };
    bridge.onAndroidBack = () => androidBackRef.current();
    return () => {
      delete bridge.onAndroidBack;
    };
  }, []);

  // ---------------------------------------------------------------------
  // صفحه‌کلید
  // ---------------------------------------------------------------------

  useEffect(() => {
    const anyModalOpen =
      isModesOpen || isRulesOpen || isShopOpen || isRewardedAdOpen || isInterstitialOpen || isBluetoothOpen || isProfileOpen || !!confirm;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirm) {
          setConfirm(null);
          return;
        }
        if (isRewardedAdOpen) return setIsRewardedAdOpen(false);
        if (isInterstitialOpen) return setIsInterstitialOpen(false);
        if (isShopOpen) return setIsShopOpen(false);
        if (isProfileOpen) return setIsProfileOpen(false);
        if (isRulesOpen) return setIsRulesOpen(false);
        if (isBluetoothOpen) return setIsBluetoothOpen(false);
        if (isModesOpen) return setIsModesOpen(false);
        if (screen === 'playing') return backToMenu();
        return;
      }

      if (e.key === 'Enter' && screen === 'title' && !anyModalOpen) {
        e.preventDefault();
        startNewHand();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    confirm,
    isModesOpen,
    isRulesOpen,
    isShopOpen,
    isRewardedAdOpen,
    isInterstitialOpen,
    isBluetoothOpen,
    isProfileOpen,
    screen,
    backToMenu,
    startNewHand,
  ]);

  // ---------------------------------------------------------------------
  // محاسبات نمایش
  // ---------------------------------------------------------------------

  const active = variant === 'three_dooz' ? engine.three : engine.twelve;
  const currentTurn = active.turn;
  const currentPhase = active.phase;
  const currentWinner = active.winner;
  const currentUnplaced = active.unplacedCount;
  const currentMoveCount = active.moveCount;
  const currentReason = active.winningReason;

  const p1OnBoard =
    variant === 'three_dooz'
      ? engine.three.board.filter((c) => c === 'player1').length
      : countStonesOnBoard(engine.twelve.board, 'player1');
  const p2OnBoard =
    variant === 'three_dooz'
      ? engine.three.board.filter((c) => c === 'player2').length
      : countStonesOnBoard(engine.twelve.board, 'player2');

  const threeValidDests =
    engine.three.selectedFromIndex !== null
      ? getLegalMoveDestinations(engine.three.board, engine.three.selectedFromIndex)
      : [];
  const twelveValidDests =
    engine.twelve.selectedFromIndex !== null
      ? getLegalTwelveDoozMoves(
          engine.twelve.board,
          engine.twelve.selectedFromIndex,
          countStonesOnBoard(engine.twelve.board, engine.twelve.turn) === 3
        )
      : [];
  const removableIndices = engine.twelve.mustRemoveOpponentStone
    ? getRemovableOpponentStones(
        engine.twelve.board,
        engine.twelve.turn === 'player1' ? 'player2' : 'player1'
      )
    : [];

  const resumeLabel = useMemo(() => {
    if (!resumeInfo) return null;
    const state = resumeInfo.variant === 'three_dooz' ? resumeInfo.three : resumeInfo.twelve;
    return {
      variant: resumeInfo.variant,
      moveCount: state.moveCount,
      mode: resumeInfo.mode,
    };
  }, [resumeInfo]);

  // ---------------------------------------------------------------------
  // اتصال دو گوشی
  // ---------------------------------------------------------------------

  const handleConnectionReady = useCallback(
    (kind: ConnectionKind) => {
      const nextMode: GameMode = kind === 'room_code' ? 'p2p_room' : 'bluetooth';
      setIsBluetoothOpen(false);
      setMySide(directMultiplayer.getMySide());
      mySideRef.current = directMultiplayer.getMySide();
      setSettings((prev) => ({ ...prev, mode: nextMode }));
      modeRef.current = nextMode;
      startNewHand({ mode: nextMode });
    },
    [startNewHand]
  );

  // ---------------------------------------------------------------------
  // رندر
  // ---------------------------------------------------------------------

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] w-full bg-[#120e0a] text-amber-100 flex flex-col justify-between items-center relative overflow-hidden select-none"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* ۱) صفحهٔ عنوان */}
      {screen === 'title' && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-between p-5 bg-gradient-to-b from-[#18110b] via-[#120e0a] to-[#0c0906] overflow-y-auto"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)',
          }}
        >
          <div className="flex flex-col items-center pt-2 text-center max-w-sm w-full">
            <div className="w-full flex items-center justify-between px-1 mb-2">
              <button
                type="button"
                onClick={() => setIsShopOpen(true)}
                className="flex items-center gap-1.5 py-2 px-3 min-h-10 rounded-2xl bg-amber-950/80 border-2 border-yellow-500/60 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="font-black text-xs text-yellow-300">{toFa(coins)}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsShopOpen(true)}
                aria-label="فروشگاه"
                className="p-2 min-h-10 min-w-10 rounded-2xl bg-amber-900/40 border border-amber-700/50 text-amber-200 hover:bg-amber-800/60 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => updateSetting('sound', !soundOn)}
                aria-label={soundOn ? 'قطع صدا' : 'وصل صدا'}
                className="p-2 min-h-10 min-w-10 rounded-2xl bg-amber-900/40 border border-amber-700/50 text-amber-200 hover:bg-amber-800/60 transition-all cursor-pointer"
              >
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-amber-400" />}
              </button>
            </div>

            <div className="w-16 h-16 mb-2 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-600 to-amber-300 rounded-3xl rotate-45 opacity-80 shadow-2xl animate-glow" />
              <div className="absolute inset-1.5 bg-[#1f150e] rounded-3xl rotate-45 flex items-center justify-center border border-amber-400/40" />
              <svg viewBox="0 0 40 40" className="w-10 h-10 relative z-10 text-amber-300" fill="currentColor">
                <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="20" cy="20" r="4" fill="currentColor" />
                <circle cx="10" cy="20" r="2.5" fill="#14b8a6" />
                <circle cx="30" cy="20" r="2.5" fill="#f43f5e" />
                <circle cx="20" cy="10" r="2.5" fill="#14b8a6" />
                <circle cx="20" cy="30" r="2.5" fill="#f43f5e" />
              </svg>
            </div>

            <h1 className="text-2xl font-black text-amber-100 tracking-tight drop-shadow-md">
              بازی دوز اصیل ایرانی
            </h1>

            <div className="flex w-full bg-stone-900/90 p-1 rounded-2xl border border-amber-700/50 mt-3 shadow-inner">
              <button
                type="button"
                onClick={() => updateSetting('variant', 'three_dooz')}
                className={`flex-1 py-2.5 min-h-10 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  variant === 'three_dooz' ? 'bg-amber-600 text-white shadow-md' : 'text-stone-400 hover:text-amber-200'
                }`}
              >
                دوز ۳ تایی
              </button>
              <button
                type="button"
                onClick={() => updateSetting('variant', 'twelve_dooz')}
                className={`flex-1 py-2.5 min-h-10 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  variant === 'twelve_dooz' ? 'bg-amber-600 text-white shadow-md' : 'text-stone-400 hover:text-amber-200'
                }`}
              >
                دوز ۱۲ تایی
              </button>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-2.5 my-auto py-3">
            {resumeLabel && (
              <button
                type="button"
                onClick={resumeSavedHand}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-teal-900/70 border-2 border-emerald-500/70 flex items-center justify-between text-right shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-800/60 border border-emerald-400/50 flex items-center justify-center">
                    <Play className="w-5 h-5 text-emerald-300 fill-current" />
                  </div>
                  <div>
                    <span className="font-black text-sm text-emerald-100 block">ادامهٔ بازی ناتمام</span>
                    <span className="text-[11px] text-emerald-300/80 block">
                      {resumeLabel.variant === 'three_dooz' ? 'دوز ۳ تایی' : 'دوز ۱۲ تایی'} ·{' '}
                      {toFa(resumeLabel.moveCount)} حرکت انجام شده
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-emerald-300" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSettings((prev) => ({ ...prev, mode: 'pass_and_play' }));
                startNewHand({ mode: 'pass_and_play' });
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/80 to-amber-900/60 border border-amber-600/50 hover:border-amber-400 flex items-center justify-between text-right shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-800/60 border border-amber-500/40 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <span className="font-black text-sm text-amber-100 block">دو نفره روی یک گوشی</span>
                  <span className="text-[11px] text-amber-300/80 block">نوبتی بازی کنید، بدون اینترنت</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsBluetoothOpen(true)}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/80 to-indigo-950/60 border border-blue-600/50 hover:border-blue-400 flex items-center justify-between text-right shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-blue-500/40 flex items-center justify-center">
                  <Bluetooth className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <span className="font-black text-sm text-blue-100 block">دو گوشی (بلوتوث)</span>
                  <span className="text-[11px] text-blue-300/80 block">اتصال مستقیم بین دو اندروید، بدون اینترنت</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSettings((prev) => ({ ...prev, mode: 'vs_ai' }));
                startNewHand({ mode: 'vs_ai' });
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/80 to-stone-900/60 border border-purple-600/50 hover:border-purple-400 flex items-center justify-between text-right shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <span className="font-black text-sm text-purple-100 block">بازی با هوش مصنوعی</span>
                  <span className="text-[11px] text-purple-300/80 block">
                    سطح فعلی: {aiDifficulty === 'easy' ? 'آسان' : aiDifficulty === 'medium' ? 'متوسط' : 'حرفه‌ای'}
                  </span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsShopOpen(true)}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-yellow-950/80 via-amber-950/80 to-yellow-950/80 border-2 border-yellow-500/60 hover:border-yellow-400 flex items-center justify-between text-right shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-600/30 border border-yellow-400 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <span className="font-black text-sm text-yellow-200 block">فروشگاه مهره‌ها</span>
                  <span className="text-[11px] text-amber-300/80 block">سکه، اسکین مهره و طرح تخته</span>
                </div>
              </div>
            </button>
          </div>

          <div className="w-full max-w-sm px-1 pb-2">
            <TapsellBanner />
          </div>

          <div className="w-full max-w-sm pb-2 grid grid-cols-3 items-center px-2 text-xs">
            <button
              type="button"
              onClick={() => setIsRulesOpen(true)}
              className="text-amber-400 hover:text-amber-200 flex items-center justify-center gap-1 font-bold min-h-10 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              قوانین
            </button>
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="text-teal-300 hover:text-teal-100 font-bold flex items-center justify-center gap-1 min-h-10 cursor-pointer"
            >
              <CircleUserRound className="w-4 h-4" />
              پروفایل
            </button>
            <button
              type="button"
              onClick={() => setIsModesOpen(true)}
              className="text-stone-400 hover:text-stone-200 font-bold flex items-center justify-center gap-1 min-h-10 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              تنظیمات
            </button>
          </div>
        </div>
      )}

      {/* ۲) HUD */}
      {screen !== 'title' && (
        <HeaderHUD
          variant={variant}
          mode={mode}
          turn={currentTurn}
          p1Unplaced={currentUnplaced.player1}
          p2Unplaced={currentUnplaced.player2}
          p1OnBoard={p1OnBoard}
          p2OnBoard={p2OnBoard}
          phase={currentPhase}
          mustRemoveStone={variant === 'twelve_dooz' && engine.twelve.mustRemoveOpponentStone}
          isSoundOn={soundOn}
          coins={coins}
          mySide={isNetworkMode(mode) ? mySide : null}
          canUndo={canUndo}
          onUndo={isNetworkMode(mode) ? undefined : undoMove}
          onToggleSound={() => updateSetting('sound', !soundOn)}
          onRestart={requestRestart}
          onBackToMenu={backToMenu}
          onOpenShop={() => setIsShopOpen(true)}
        />
      )}

      {/* ۳) تخته */}
      {screen !== 'title' && (
        <main className="w-full flex-1 flex flex-col items-center justify-center px-1 py-1 max-w-md mx-auto">
          {connectionWarn && (
            <div className="w-full max-w-sm mb-2 px-3 py-2 rounded-xl bg-rose-950/70 border border-rose-700/60 text-rose-200 text-xs flex items-center justify-between gap-2">
              <span>ارتباط با گوشی حریف قطع شده است.</span>
              <button
                type="button"
                onClick={() => {
                  sendNet('SYNC_REQUEST', currentMoveCount);
                  setConnectionWarn(false);
                }}
                className="px-2 py-1 rounded-lg bg-rose-700 text-white font-bold shrink-0 cursor-pointer"
              >
                همگام‌سازی
              </button>
            </div>
          )}

          {variant === 'three_dooz' ? (
            <ThreeDoozBoard
              board={engine.three.board}
              turn={engine.three.turn}
              phase={engine.three.phase}
              selectedFromIndex={engine.three.selectedFromIndex}
              validDestinations={threeValidDests}
              winningLine={engine.three.winningLine}
              lastMove={engine.three.lastMove}
              skin={activeSkin}
              theme={activeTheme}
              onCellClick={handleCellClick}
            />
          ) : (
            <TwelveDoozBoard
              board={engine.twelve.board}
              turn={engine.twelve.turn}
              phase={engine.twelve.phase}
              mustRemoveStone={engine.twelve.mustRemoveOpponentStone}
              removableIndices={removableIndices}
              selectedFromIndex={engine.twelve.selectedFromIndex}
              validDestinations={twelveValidDests}
              lastFormedLines={engine.twelve.lastFormedLines}
              winningLine={engine.twelve.winningLine}
              lastMove={engine.twelve.lastMove}
              skin={activeSkin}
              theme={activeTheme}
              onCellClick={handleCellClick}
            />
          )}
        </main>
      )}

      {/* ۴) نوار پایین */}
      {screen !== 'title' && (
        <div className="w-full max-w-md mx-auto px-3 pb-3 pt-1 z-20 grid grid-cols-3 gap-2 select-none">
          <button
            type="button"
            onClick={backToMenu}
            className="py-2.5 px-2 min-h-11 rounded-2xl bg-stone-900/90 border border-stone-700/60 text-amber-200 font-black text-xs hover:bg-stone-800 transition-all active:scale-95 cursor-pointer"
          >
            منوی اصلی
          </button>
          <button
            type="button"
            onClick={() => setIsModesOpen(true)}
            className="py-2.5 px-2 min-h-11 rounded-2xl bg-stone-900/90 border border-stone-700/60 text-stone-300 font-bold text-xs hover:bg-stone-800 transition-all active:scale-95 cursor-pointer"
          >
            حالت بازی
          </button>
          <button
            type="button"
            onClick={() => setIsRulesOpen(true)}
            className="py-2.5 px-2 min-h-11 rounded-2xl bg-amber-950/60 border border-amber-700/60 text-amber-300 font-bold text-xs hover:bg-amber-900/70 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            قوانین
          </button>
        </div>
      )}

      {/* ۵) مودال‌ها */}
      <ModeSelectorModal
        isOpen={isModesOpen}
        currentVariant={variant}
        currentMode={mode}
        aiDifficulty={aiDifficulty}
        onSelect={(newVariant, newMode, newDiff) => {
          if (newMode === 'bluetooth') {
            setSettings((prev) => ({ ...prev, variant: newVariant, aiDifficulty: newDiff }));
            setIsBluetoothOpen(true);
            return;
          }
          startNewHand({ variant: newVariant, mode: newMode, difficulty: newDiff });
        }}
        onClose={() => setIsModesOpen(false)}
      />

      <BluetoothModal
        isOpen={isBluetoothOpen}
        onReady={handleConnectionReady}
        onClose={() => setIsBluetoothOpen(false)}
      />

      <GameOverModal
        isOpen={screen === 'gameover'}
        winner={currentWinner}
        reason={currentReason}
        moveCount={currentMoveCount}
        mode={mode}
        variant={variant}
        scores={scores}
        mySide={isNetworkMode(mode) ? mySide : null}
        coinsEarned={lastCoinsEarned}
        onRestart={restartCurrentHand}
        onBackToMenu={backToMenu}
        onWatchAd={() => setIsRewardedAdOpen(true)}
      />

      <RulesModal isOpen={isRulesOpen} activeVariant={variant} onClose={() => setIsRulesOpen(false)} />

      <ShopModal
        isOpen={isShopOpen}
        coins={coins}
        onCoinsChange={(newCoins) => setCoins(newCoins)}
        onWatchAdClick={() => setIsRewardedAdOpen(true)}
        onClose={() => setIsShopOpen(false)}
        onSkinChange={(skinId) => setActiveSkinIdState(skinId)}
        onThemeChange={(themeId) => setActiveThemeIdState(themeId)}
      />

      <RewardedAdModal
        isOpen={isRewardedAdOpen}
        rewardAmount={REWARDED_AMOUNT}
        onRewardGranted={(amount) => {
          setCoins(addPlayerCoins(amount));
        }}
        onClose={() => setIsRewardedAdOpen(false)}
      />

      <InterstitialAdModal isOpen={isInterstitialOpen} onClose={() => setIsInterstitialOpen(false)} />

      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />

      <ProfileModal
        isOpen={isProfileOpen}
        coins={coins}
        onClose={() => setIsProfileOpen(false)}
        onDataReset={handleDataReset}
      />

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-2xl bg-stone-900/95 border border-amber-600/50 text-amber-100 text-xs font-bold shadow-2xl animate-fadeIn max-w-[85vw] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
