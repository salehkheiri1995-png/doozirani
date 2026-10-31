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
  HelpCircle,
  ShoppingBag,
  Coins,
  Volume2,
  VolumeX,
  X,
  AlertTriangle,
  CheckCircle2,
  Unplug,
} from 'lucide-react';
import { Player, GameMode, AIDifficulty, PlayerStats } from './game/doozTypes';
import {
  applyCommand,
  createMatchId,
  createMatchState,
  currentTurn,
  isMatchVariant,
  type MatchCommand,
  type MatchEvent,
  type MatchState,
  type MatchVariant,
} from './game/match';
import { getLegalMoveDestinations } from './game/threeDoozLogic';
import {
  countStonesOnBoard,
  getLegalTwelveDoozMoves,
  getRemovableOpponentStones,
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
import { TapsellBanner } from './components/TapsellBanner';
import {
  playStonePlaceSound,
  playStoneSelectSound,
  playDoozChimeSound,
  playStoneCaptureSound,
  playVictorySound,
  setSoundEnabled,
  triggerHaptic,
} from './utils/audio';
import {
  directMultiplayer,
  type MultiplayerState,
} from './utils/directMultiplayer';
import type { SessionInfo } from './multiplayer/protocol';
import { useEconomy, economyActions } from './economy/useEconomy';
import {
  AD_REWARD_COINS,
  getAdAvailability,
} from './economy/economyStore';
import {
  resolveBoardTheme,
  resolveProfileFrame,
  resolveStoneSkin,
} from './economy/catalog';

type PlayScreen = 'title' | 'playing' | 'gameover';
type SoundEvent = 'none' | 'place' | 'move' | 'remove' | 'mill' | 'end' | 'remote';

const INITIAL_MULTIPLAYER_STATE: MultiplayerState = {
  phase: 'idle',
  isSupported: false,
  isNative: false,
  isHost: false,
  deviceName: null,
  statusText: 'آماده',
  isScanning: false,
  pairedDevices: [],
  error: null,
  matchId: null,
  role: null,
  remoteStoneSkinId: null,
  remoteProfileFrameId: null,
  remoteName: null,
};

function soundEventFor(events: MatchEvent[]): SoundEvent {
  if (events.some((event) => event.type === 'match_ended')) return 'end';
  if (events.some((event) => event.type === 'mill_formed')) return 'mill';
  if (events.some((event) => event.type === 'stone_removed')) return 'remove';
  if (events.some((event) => event.type === 'stone_moved')) return 'move';
  if (events.some((event) => event.type === 'stone_placed')) return 'place';
  return 'none';
}

function localPlayerFor(mode: GameMode, bt: MultiplayerState): Player | null {
  if (mode === 'pass_and_play') return null;
  if (mode === 'vs_ai') return 'player1';
  if (mode === 'bluetooth') {
    if (bt.role === 'host') return 'player1';
    if (bt.role === 'guest') return 'player2';
  }
  return null;
}

export default function App() {
  const [appState, setAppState] = useState<PlayScreen>('title');
  const [variant, setVariant] = useState<MatchVariant>('three_dooz');
  const [mode, setMode] = useState<GameMode>('pass_and_play');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('hard');
  const [soundOn, setSoundOn] = useState<boolean>(true);

  const [match, setMatch] = useState<MatchState>(() =>
    createMatchState('three_dooz', createMatchId())
  );
  const matchRef = useRef<MatchState>(match);
  const modeRef = useRef<GameMode>(mode);
  const variantRef = useRef<MatchVariant>(variant);

  const [selectedFromIndex, setSelectedFromIndex] = useState<number | null>(null);
  const [scores, setScores] = useState<PlayerStats>({ player1: 0, player2: 0, draws: 0 });
  const economy = useEconomy();
  const economyRef = useRef(economy);
  economyRef.current = economy;

  const [isModesOpen, setIsModesOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isRewardedAdOpen, setIsRewardedAdOpen] = useState(false);
  const [isBluetoothOpen, setIsBluetoothOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [btState, setBtState] = useState<MultiplayerState>(INITIAL_MULTIPLAYER_STATE);
  const btStateRef = useRef<MultiplayerState>(btState);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [rematchWaiting, setRematchWaiting] = useState(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    variantRef.current = variant;
  }, [variant]);

  useEffect(() => {
    document.body.dataset.state = appState;
  }, [appState]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const commitMatch = useCallback((next: MatchState, soundEvent: SoundEvent = 'none') => {
    const prev = matchRef.current;
    const sameMatch = next.matchId === prev.matchId;
    if (sameMatch && next.version < prev.version) return false;
    const firstEnd = sameMatch && prev.winner === null && next.winner !== null;

    matchRef.current = next;
    setMatch(next);
    setSelectedFromIndex(null);

    if (firstEnd && next.winner) {
      playVictorySound();
      triggerHaptic(80);
      setScores((previous) => {
        if (next.winner === 'player1') return { ...previous, player1: previous.player1 + 1 };
        if (next.winner === 'player2') return { ...previous, player2: previous.player2 + 1 };
        return { ...previous, draws: previous.draws + 1 };
      });
      setAppState('gameover');

      const resigned = (next.endingReason || '').includes('استعفا');
      if (next.winner !== 'draw' && !resigned) {
        const reward = economyActions.grantMatchReward(next.matchId, next.variant);
        if (!reward.ok && reward.code !== 'daily_cap' && reward.code !== 'duplicate') {
          setNotice(reward.messageFa);
        }
      }
      return true;
    }

    if (!next.winner) {
      setAppState('playing');
      if (soundEvent === 'mill') playDoozChimeSound();
      else if (soundEvent === 'remove') playStoneCaptureSound();
      else if (soundEvent === 'place' || soundEvent === 'move' || soundEvent === 'remote') {
        playStonePlaceSound();
      }
    }
    return true;
  }, []);

  const beginLocalMatch = useCallback(
    (nextVariant: MatchVariant, matchId: string = createMatchId()): MatchState => {
      const next = createMatchState(nextVariant, matchId);
      matchRef.current = next;
      variantRef.current = nextVariant;
      setVariant(nextVariant);
      setMatch(next);
      setSelectedFromIndex(null);
      setRematchRequested(false);
      setRematchWaiting(false);
      setAppState('playing');
      return next;
    },
    []
  );

  const applyLocalCommand = useCallback(
    (command: MatchCommand, actor: Player): boolean => {
      const result = applyCommand(matchRef.current, command, actor);
      if (!result.ok) {
        setNotice(result.messageFa);
        return false;
      }
      commitMatch(result.state, soundEventFor(result.events));
      if (modeRef.current === 'bluetooth' && btStateRef.current.role === 'host') {
        directMultiplayer.sendSnapshot(result.state);
      }
      return true;
    },
    [commitMatch]
  );

  const hostStartRematch = useCallback((): boolean => {
    const next = createMatchState(variantRef.current, createMatchId());
    if (!directMultiplayer.beginRematch(next)) {
      setNotice('شروع مجدد بدون تأیید حریف ممکن نیست.');
      return false;
    }
    matchRef.current = next;
    setMatch(next);
    setSelectedFromIndex(null);
    setAppState('playing');
    setRematchRequested(false);
    setRematchWaiting(false);
    playStonePlaceSound();
    return true;
  }, []);

  const acceptRematch = useCallback(() => {
    directMultiplayer.acceptRematch();
    setRematchRequested(false);
    if (directMultiplayer.getState().role === 'host') {
      hostStartRematch();
    } else {
      setRematchWaiting(true);
      setNotice('در انتظار شروع بازی جدید از میزبان...');
    }
  }, [hostStartRematch]);

  const declineRematch = useCallback(() => {
    directMultiplayer.declineRematch();
    setRematchRequested(false);
    setRematchWaiting(false);
    setNotice('درخواست بازی مجدد رد شد.');
  }, []);

  // Network subscriptions: one transport, many listeners. Modal open/close
  // never replaces the game receiver.
  useEffect(() => {
    directMultiplayer.init();

    const unsubscribeState = directMultiplayer.subscribeState((next) => {
      btStateRef.current = next;
      setBtState(next);
    });

    const unsubscribeCommands = directMultiplayer.subscribeCommands(({ command, commandId }) => {
      if (directMultiplayer.getState().role !== 'host') return;
      const current = matchRef.current;
      const result = applyCommand(current, command, 'player2');
      if (!result.ok) {
        setNotice(result.messageFa);
        directMultiplayer.sendSnapshot(current);
        return;
      }
      commitMatch(result.state, soundEventFor(result.events));
      directMultiplayer.sendSnapshot(result.state, commandId);
    });

    const unsubscribeSnapshots = directMultiplayer.subscribeSnapshots((next) => {
      if (directMultiplayer.getState().role !== 'guest') return;
      modeRef.current = 'bluetooth';
      setMode('bluetooth');
      variantRef.current = next.variant;
      setVariant(next.variant);
      commitMatch(next, 'remote');
      if (!next.winner) setAppState('playing');
    });

    const unsubscribeRematch = directMultiplayer.subscribeRematch((event) => {
      if (event.type === 'requested') {
        setRematchRequested(true);
        setRematchWaiting(false);
        return;
      }
      if (event.type === 'accepted') {
        setRematchWaiting(false);
        if (directMultiplayer.getState().role === 'host') hostStartRematch();
        return;
      }
      if (event.type === 'declined') {
        setRematchRequested(false);
        setRematchWaiting(false);
        setNotice('حریف درخواست بازی مجدد را رد کرد.');
        return;
      }
      if (event.type === 'started') {
        variantRef.current = event.state.variant;
        setVariant(event.state.variant);
        commitMatch(event.state, 'none');
        setAppState('playing');
        setRematchRequested(false);
        setRematchWaiting(false);
      }
    });

    const unsubscribeErrors = directMultiplayer.subscribeErrors(({ messageFa }) => {
      setNotice(messageFa);
    });

    return () => {
      unsubscribeState();
      unsubscribeCommands();
      unsubscribeSnapshots();
      unsubscribeRematch();
      unsubscribeErrors();
    };
  }, [commitMatch, hostStartRematch]);

  const startGame = useCallback(() => {
    if (modeRef.current === 'bluetooth') {
      setIsBluetoothOpen(true);
      return;
    }
    beginLocalMatch(variantRef.current);
  }, [beginLocalMatch]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      beginLocalMatch(variantRef.current);
    }
  }, [beginLocalMatch]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (appState === 'title' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        startGame();
      } else if (event.key === 'Escape') {
        setIsModesOpen((previous) => !previous);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appState, startGame]);

  // AI runs through the same command/reducer as human players.
  useEffect(() => {
    if (appState !== 'playing' || mode !== 'vs_ai') return;
    const game = match.variant === 'three_dooz' ? match.three : match.twelve;
    if (game.winner || game.turn !== 'player2') return;
    const matchId = match.matchId;
    const timer = setTimeout(() => {
      const current = matchRef.current;
      if (current.matchId !== matchId || current.winner) return;
      if (current.variant === 'three_dooz') {
        const aiMove = getThreeDoozAIMove(current.three, aiDifficulty);
        if (!aiMove) return;
        const command: MatchCommand =
          aiMove.action === 'place'
            ? { type: 'PLACE', index: aiMove.to }
            : { type: 'MOVE', from: aiMove.from as number, to: aiMove.to };
        applyLocalCommand(command, 'player2');
        return;
      }
      const aiMove = getTwelveDoozAIMove(current.twelve, aiDifficulty);
      if (!aiMove) return;
      let command: MatchCommand | null = null;
      if (aiMove.action === 'remove' && aiMove.removeIndex !== undefined) {
        command = { type: 'REMOVE', index: aiMove.removeIndex };
      } else if (aiMove.action === 'place' && aiMove.to !== undefined) {
        command = { type: 'PLACE', index: aiMove.to };
      } else if (
        aiMove.action === 'move' &&
        aiMove.from !== undefined &&
        aiMove.to !== undefined
      ) {
        command = { type: 'MOVE', from: aiMove.from, to: aiMove.to };
      }
      if (command) applyLocalCommand(command, 'player2');
    }, 520);
    return () => clearTimeout(timer);
  }, [appState, mode, match, aiDifficulty, applyLocalCommand]);

  const localActor: Player | null =
    mode === 'pass_and_play'
      ? currentTurn(match)
      : localPlayerFor(mode, btState);

  const submitLocalCommand = useCallback((command: MatchCommand) => {
    const current = matchRef.current;
    const actor = localPlayerFor(modeRef.current, btStateRef.current) ??
      (modeRef.current === 'pass_and_play' ? currentTurn(current) : null);
    if (!actor) return;
    if (currentTurn(current) !== actor) {
      setNotice(modeRef.current === 'vs_ai' ? 'نوبت هوش مصنوعی است.' : 'نوبت شما نیست.');
      return;
    }
    if (modeRef.current === 'bluetooth') {
      if (btStateRef.current.phase !== 'ready') {
        setNotice('اتصال بلوتوث آماده نیست. ابتدا دو گوشی را وصل کنید.');
        return;
      }
      if (btStateRef.current.role === 'guest') {
        if (!directMultiplayer.sendCommand(current, command)) {
          setNotice('ارسال فرمان به میزبان انجام نشد.');
        }
        return;
      }
      applyLocalCommand(command, 'player1');
      return;
    }
    applyLocalCommand(command, actor);
  }, [applyLocalCommand]);

  const handleCellClick = (index: number) => {
    if (appState !== 'playing') return;
    const current = matchRef.current;
    if (current.winner) return;
    if (mode === 'vs_ai' && currentTurn(current) === 'player2') return;
    const actor = localPlayerFor(mode, btState) ?? localActor;
    if (!actor) return;
    if (currentTurn(current) !== actor) {
      if (mode === 'bluetooth') setNotice('نوبت شما نیست.');
      return;
    }
    if (mode === 'bluetooth' && btState.phase !== 'ready') {
      setNotice('اتصال بلوتوث برقرار نیست.');
      return;
    }

    if (current.variant === 'three_dooz') {
      const game = current.three;
      if (game.phase === 'placing') {
        if (game.board[index] !== null) {
          setNotice('این خانه پر است.');
          return;
        }
        submitLocalCommand({ type: 'PLACE', index });
        return;
      }
      if (game.phase === 'moving') {
        if (game.board[index] === actor) {
          playStoneSelectSound();
          setSelectedFromIndex((previous) => (previous === index ? null : index));
          return;
        }
        if (game.board[index] === null && selectedFromIndex !== null) {
          const valid = getLegalMoveDestinations(game.board, selectedFromIndex, false);
          if (!valid.includes(index)) {
            setNotice('این مقصد با مهره انتخاب‌شده همسایه نیست.');
            return;
          }
          submitLocalCommand({ type: 'MOVE', from: selectedFromIndex, to: index });
        }
      }
      return;
    }

    const game = current.twelve;
    if (game.mustRemoveOpponentStone) {
      const opponent: Player = actor === 'player1' ? 'player2' : 'player1';
      if (game.board[index] !== opponent) return;
      const removable = getRemovableOpponentStones(game.board, opponent);
      if (!removable.includes(index)) {
        setNotice('این مهره محافظت‌شده است و قابل گرفتن نیست.');
        return;
      }
      submitLocalCommand({ type: 'REMOVE', index });
      return;
    }
    if (game.phase === 'placing') {
      if (game.board[index] !== null) {
        setNotice('این خانه پر است.');
        return;
      }
      submitLocalCommand({ type: 'PLACE', index });
      return;
    }
    if (game.phase === 'moving' || game.phase === 'flying') {
      if (game.board[index] === actor) {
        playStoneSelectSound();
        setSelectedFromIndex((previous) => (previous === index ? null : index));
        return;
      }
      if (game.board[index] === null && selectedFromIndex !== null) {
        const canFly = countStonesOnBoard(game.board, actor) === 3;
        const valid = getLegalTwelveDoozMoves(game.board, selectedFromIndex, canFly);
        if (!valid.includes(index)) {
          setNotice('این حرکت برای مهره انتخاب‌شده مجاز نیست.');
          return;
        }
        submitLocalCommand({ type: 'MOVE', from: selectedFromIndex, to: index });
      }
    }
  };

  const localSkin = resolveStoneSkin(economy.equipped.stone_skin);
  const remoteSkin = resolveStoneSkin(btState.remoteStoneSkinId);
  const boardTheme = resolveBoardTheme(economy.equipped.board_theme);
  const profileFrame = resolveProfileFrame(economy.equipped.profile_frame);
  const remoteProfileFrame = resolveProfileFrame(btState.remoteProfileFrameId);
  const isBluetoothGuest = mode === 'bluetooth' && btState.role === 'guest';
  const p1Frame = mode === 'bluetooth' ? (isBluetoothGuest ? remoteProfileFrame : profileFrame) : profileFrame;
  const p2Frame =
    mode === 'bluetooth' ? (isBluetoothGuest ? profileFrame : remoteProfileFrame) : undefined;
  const stoneAppearance: Record<Player, (typeof localSkin)['p1']> =
    mode === 'bluetooth' && btState.remoteStoneSkinId
      ? isBluetoothGuest
        ? { player1: remoteSkin.p1, player2: localSkin.p2 }
        : { player1: localSkin.p1, player2: remoteSkin.p2 }
      : { player1: localSkin.p1, player2: localSkin.p2 };

  const currentGame = match.variant === 'three_dooz' ? match.three : match.twelve;
  const currentTurnPlayer = currentGame.turn;
  const currentPhase = currentGame.phase;
  const currentUnplaced = currentGame.unplacedCount;
  const currentP1OnBoard =
    match.variant === 'three_dooz'
      ? match.three.board.filter((cell) => cell === 'player1').length
      : countStonesOnBoard(match.twelve.board, 'player1');
  const currentP2OnBoard =
    match.variant === 'three_dooz'
      ? match.three.board.filter((cell) => cell === 'player2').length
      : countStonesOnBoard(match.twelve.board, 'player2');
  const currentWinner = match.winner;
  const currentReason = match.endingReason;
  const currentMoveCount = currentGame.moveCount;

  const selectedForLocal = localActor !== null && currentTurnPlayer === localActor ? selectedFromIndex : null;
  const threeValidDests =
    match.variant === 'three_dooz' && selectedForLocal !== null
      ? getLegalMoveDestinations(match.three.board, selectedForLocal, false)
      : [];
  const twelveValidDests =
    match.variant === 'twelve_dooz' && selectedForLocal !== null
      ? getLegalTwelveDoozMoves(
          match.twelve.board,
          selectedForLocal,
          countStonesOnBoard(match.twelve.board, localActor as Player) === 3
        )
      : [];
  const removableIndices =
    match.variant === 'twelve_dooz' &&
    match.twelve.mustRemoveOpponentStone &&
    localActor !== null &&
    currentTurnPlayer === localActor
      ? getRemovableOpponentStones(
          match.twelve.board,
          localActor === 'player1' ? 'player2' : 'player1'
        )
      : [];

  const p1Name =
    mode === 'vs_ai'
      ? 'شما (فیروزه)'
      : mode === 'bluetooth'
        ? btState.role === 'guest'
          ? btState.remoteName || 'میزبان'
          : 'شما (میزبان)'
        : 'بازیکن ۱';
  const p2Name =
    mode === 'vs_ai'
      ? 'هوش مصنوعی'
      : mode === 'bluetooth'
        ? btState.role === 'guest'
          ? 'شما (مهمان)'
          : btState.remoteName || 'مهمان'
        : 'بازیکن ۲';

  const backToMenu = () => {
    if (mode === 'bluetooth') directMultiplayer.disconnect();
    setAppState('title');
    setRematchRequested(false);
    setRematchWaiting(false);
  };

  const requestRestart = () => {
    if (mode === 'bluetooth') {
      if (btState.phase !== 'ready') {
        setNotice('برای بازی مجدد، ابتدا اتصال بلوتوث را برقرار کنید.');
        return;
      }
      setRematchWaiting(true);
      directMultiplayer.requestRematch();
      return;
    }
    beginLocalMatch(variantRef.current);
  };

  const openRewardedAd = () => {
    if (mode === 'bluetooth' && appState === 'playing') {
      setNotice('در میانه مسابقه بلوتوث، تبلیغ جایزه‌ای نمایش داده نمی‌شود.');
      return;
    }
    if (!getAdAvailability(economyRef.current).canClaim) {
      setNotice('سقف یا فاصله زمانی تبلیغ جایزه‌ای رعایت نشده است.');
      return;
    }
    setIsRewardedAdOpen(true);
  };

  const handleBluetoothReady = useCallback(
    (session: SessionInfo) => {
      modeRef.current = 'bluetooth';
      setMode('bluetooth');
      variantRef.current = session.variant;
      setVariant(session.variant);
      setIsBluetoothOpen(false);
      if (session.role === 'host') {
        const initial = beginLocalMatch(session.variant, session.matchId);
        if (!directMultiplayer.sendSnapshot(initial)) {
          setNotice('ارسال وضعیت اولیه به گوشی مهمان انجام نشد.');
        }
        setNotice('اتصال آماده شد. بازی را شروع کنید.');
      } else {
        // The guest may already have received the host snapshot. Only create a
        // placeholder when no state for this match has arrived yet, otherwise a
        // late ready callback could wipe the authoritative snapshot.
        if (matchRef.current.matchId !== session.matchId) {
          beginLocalMatch(session.variant, session.matchId);
        }
        setAppState('playing');
        setNotice('اتصال برقرار شد؛ در انتظار وضعیت اولیه از میزبان...');
      }
    },
    [beginLocalMatch]
  );

  const btIdentity = useMemo(
    () => ({
      displayName: 'بازیکن دوز',
      stoneSkinId: economy.equipped.stone_skin,
      profileFrameId: economy.equipped.profile_frame,
    }),
    [economy.equipped.stone_skin, economy.equipped.profile_frame]
  );

  const adsAllowed = !(mode === 'bluetooth' && appState === 'playing');

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full bg-[#120e0a] text-amber-100 flex flex-col justify-between items-center relative overflow-hidden select-none"
    >
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-600/10 rounded-full blur-[120px] pointer-events-none" />

      {appState === 'title' && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#18110b] via-[#120e0a] to-[#0c0906]">
          <div className="flex flex-col items-center pt-4 text-center max-w-sm w-full">
            <div className="w-full flex items-center justify-between px-2 mb-2">
              <button
                type="button"
                onClick={() => setIsShopOpen(true)}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-2xl bg-amber-950/80 border-2 border-yellow-500/60 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="font-black text-xs text-yellow-300">{economy.coins}</span>
                <span className="text-[10px] text-emerald-400 font-bold mr-0.5">+</span>
              </button>

              <button
                type="button"
                onClick={toggleSound}
                className="p-2 rounded-2xl bg-amber-900/40 border border-amber-700/50 text-amber-200 hover:bg-amber-800/60 transition-all cursor-pointer"
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

            <h1 className="text-2xl sm:text-3xl font-black text-amber-100 tracking-tight drop-shadow-md">
              بازی دوز اصیل ایرانی
            </h1>

            <div className="flex w-full bg-stone-900/90 p-1 rounded-2xl border border-amber-700/50 mt-3 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setVariant('three_dooz');
                  variantRef.current = 'three_dooz';
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  variant === 'three_dooz'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-stone-400 hover:text-amber-200'
                }`}
              >
                دوز ۳ تایی سنتی
              </button>
              <button
                type="button"
                onClick={() => {
                  setVariant('twelve_dooz');
                  variantRef.current = 'twelve_dooz';
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  variant === 'twelve_dooz'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-stone-400 hover:text-amber-200'
                }`}
              >
                دوز ۱۲ تایی قهوه‌خانه‌ای
              </button>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-2.5 my-auto">
            <button
              type="button"
              onClick={() => {
                setMode('pass_and_play');
                modeRef.current = 'pass_and_play';
                beginLocalMatch(variantRef.current);
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/80 to-amber-900/60 border border-amber-600/50 hover:border-amber-400 flex items-center justify-between text-right shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-800/60 border border-amber-500/40 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <span className="font-black text-sm text-amber-100 block">دو نفره آفلاین (یک گوشی)</span>
                  <span className="text-[11px] text-amber-300/80 block">بدون اینترنت و بدون مجوز بلوتوث</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('bluetooth');
                modeRef.current = 'bluetooth';
                setIsBluetoothOpen(true);
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/80 to-indigo-950/60 border border-blue-600/50 hover:border-blue-400 flex items-center justify-between text-right shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-blue-500/40 flex items-center justify-center">
                  <Bluetooth className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <span className="font-black text-sm text-blue-100 block">بازی با بلوتوث بین دو گوشی اندروید</span>
                  <span className="text-[11px] text-blue-300/80 block">آفلاین و مستقیم؛ ابتدا در تنظیمات اندروید جفت کنید</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('vs_ai');
                modeRef.current = 'vs_ai';
                beginLocalMatch(variantRef.current);
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/80 to-stone-900/60 border border-purple-600/50 hover:border-purple-400 flex items-center justify-between text-right shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <span className="font-black text-sm text-purple-100 block">بازی با هوش مصنوعی (آفلاین)</span>
                  <span className="text-[11px] text-purple-300/80 block">مسابقه با ربات در سه سطح انتخابی</span>
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
                  <span className="font-black text-sm text-yellow-200 block">فروشگاه مهره‌ها و صفحه‌ها</span>
                  <span className="text-[11px] text-amber-300/80 block">آیتم ظاهری واقعی + تبلیغ جایزه‌ای اختیاری</span>
                </div>
              </div>
            </button>
          </div>

          <div className="w-full max-w-sm px-1">
            <TapsellBanner />
          </div>

          <div className="w-full max-w-sm pb-2 space-y-2">
            <button
              type="button"
              data-start="true"
              onClick={startGame}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white font-black text-base shadow-2xl hover:from-amber-400 hover:to-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              شروع بازی {variant === 'three_dooz' ? 'دوز ۳ تایی' : 'دوز ۱۲ تایی'}
            </button>

            <div className="flex items-center justify-between px-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => setIsRulesOpen(true)}
                className="text-amber-400 hover:text-amber-200 flex items-center gap-1 font-bold cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                راهنمای قوانین دوز
              </button>
              <button
                type="button"
                onClick={() => setIsModesOpen(true)}
                className="text-stone-400 hover:text-stone-200 font-bold cursor-pointer"
              >
                تنظیمات پیشرفته
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'bluetooth' && appState !== 'title' && (
        <div className="w-full max-w-md mx-auto px-3 pt-2">
          <div
            className={`rounded-2xl border px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-bold ${
              btState.phase === 'ready'
                ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-100'
                : 'bg-rose-950/60 border-rose-600/50 text-rose-100'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {btState.phase === 'ready' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {btState.phase === 'ready'
                ? `متصل به ${btState.remoteName || 'گوشی حریف'}`
                : btState.statusText}
            </span>
            {btState.phase !== 'ready' && (
              <button
                type="button"
                onClick={() => setIsBluetoothOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-blue-700 text-white cursor-pointer"
              >
                اتصال
              </button>
            )}
            {btState.phase === 'ready' && (
              <button
                type="button"
                onClick={() => {
                  directMultiplayer.disconnect();
                  setNotice('اتصال بلوتوث قطع شد.');
                }}
                className="px-2 py-1 rounded-lg bg-stone-800 text-stone-200 cursor-pointer flex items-center gap-1"
              >
                <Unplug className="w-3 h-3" />
                قطع
              </button>
            )}
          </div>
        </div>
      )}

      <HeaderHUD
        variant={match.variant}
        mode={mode}
        turn={currentTurnPlayer}
        p1Unplaced={currentUnplaced.player1}
        p2Unplaced={currentUnplaced.player2}
        p1OnBoard={currentP1OnBoard}
        p2OnBoard={currentP2OnBoard}
        phase={currentPhase}
        mustRemoveStone={match.variant === 'twelve_dooz' && match.twelve.mustRemoveOpponentStone}
        isSoundOn={soundOn}
        coins={economy.coins}
        onToggleSound={toggleSound}
        onRestart={requestRestart}
        onBackToMenu={backToMenu}
        onOpenShop={() => setIsShopOpen(true)}
        stoneAppearance={stoneAppearance}
        p1Frame={p1Frame}
        p2Frame={p2Frame}
        p1Name={p1Name}
        p2Name={p2Name}
      />

      <main className="w-full flex-1 flex flex-col items-center justify-center px-2 py-1 max-w-md mx-auto">
        {match.variant === 'three_dooz' ? (
          <ThreeDoozBoard
            board={match.three.board}
            selectedFromIndex={selectedForLocal}
            validDestinations={threeValidDests}
            winningLine={match.three.winningLine}
            onCellClick={handleCellClick}
            theme={boardTheme}
            stoneAppearance={stoneAppearance}
          />
        ) : (
          <TwelveDoozBoard
            board={match.twelve.board}
            mustRemoveStone={match.twelve.mustRemoveOpponentStone}
            removableIndices={removableIndices}
            selectedFromIndex={selectedForLocal}
            validDestinations={twelveValidDests}
            lastFormedLines={match.twelve.lastFormedLines}
            onCellClick={handleCellClick}
            theme={boardTheme}
            stoneAppearance={stoneAppearance}
          />
        )}
      </main>

      <div className="w-full max-w-md mx-auto px-3 pb-3 pt-1 z-20 flex items-center justify-between gap-2 select-none">
        <button
          type="button"
          onClick={backToMenu}
          className="flex-1 py-2.5 px-3 rounded-2xl bg-stone-900/90 border border-stone-700/60 text-amber-200 font-black text-xs hover:bg-stone-800 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-md"
        >
          <span>بازگشت به منو</span>
        </button>

        <button
          type="button"
          onClick={() => setIsModesOpen(true)}
          className="flex-1 py-2.5 px-3 rounded-2xl bg-stone-900/90 border border-stone-700/60 text-stone-300 font-bold text-xs hover:bg-stone-800 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-md"
        >
          <span>تغییر حالت بازی</span>
        </button>

        <button
          type="button"
          onClick={() => setIsRulesOpen(true)}
          className="py-2.5 px-3 rounded-2xl bg-amber-950/60 border border-amber-700/60 text-amber-300 font-bold text-xs hover:bg-amber-900/70 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-md"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>قوانین</span>
        </button>
      </div>

      <ModeSelectorModal
        isOpen={isModesOpen}
        currentVariant={variant}
        currentMode={mode}
        aiDifficulty={aiDifficulty}
        onSelect={(newVariant, newMode, newDifficulty) => {
          if (!isMatchVariant(newVariant)) return;
          setAiDifficulty(newDifficulty);
          setVariant(newVariant);
          variantRef.current = newVariant;
          if (mode === 'bluetooth' && newMode !== 'bluetooth') {
            directMultiplayer.disconnect();
          }
          if (newMode === 'bluetooth') {
            setMode('bluetooth');
            modeRef.current = 'bluetooth';
            setIsBluetoothOpen(true);
            return;
          }
          if (newMode === 'p2p_room') {
            setNotice('اتاق آنلاین در این نسخه فعال نیست. فعلاً از بلوتوث یا بازی محلی استفاده کنید.');
            return;
          }
          setMode(newMode);
          modeRef.current = newMode;
          beginLocalMatch(newVariant);
        }}
        onClose={() => setIsModesOpen(false)}
      />

      <BluetoothModal
        isOpen={isBluetoothOpen}
        variant={variant}
        identity={btIdentity}
        onReady={handleBluetoothReady}
        onClose={() => setIsBluetoothOpen(false)}
      />

      <GameOverModal
        isOpen={appState === 'gameover'}
        winner={currentWinner}
        reason={currentReason}
        moveCount={currentMoveCount}
        mode={mode}
        variant={match.variant}
        scores={scores}
        onRestart={requestRestart}
        onOpenModes={() => setIsModesOpen(true)}
        onWatchAd={adsAllowed ? openRewardedAd : undefined}
      />

      <RulesModal
        isOpen={isRulesOpen}
        activeVariant={match.variant}
        onClose={() => setIsRulesOpen(false)}
      />

      <ShopModal
        isOpen={isShopOpen}
        adsAllowed={adsAllowed}
        onWatchAdClick={openRewardedAd}
        onClose={() => setIsShopOpen(false)}
      />

      <RewardedAdModal
        isOpen={isRewardedAdOpen}
        rewardAmount={AD_REWARD_COINS}
        onRewardGranted={() => {
          const result = economyActions.claimAdReward();
          if (!result.ok) {
            setNotice(result.messageFa);
            return false;
          }
          setNotice(`${AD_REWARD_COINS} سکه پس از تأیید رسمی تبلیغ اضافه شد.`);
          return true;
        }}
        onClose={() => setIsRewardedAdOpen(false)}
      />

      {rematchRequested && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90">
          <div className="w-full max-w-sm rounded-3xl border-2 border-blue-600/70 bg-[#12100d] p-5 text-center">
            <h3 className="text-base font-black text-blue-100">درخواست بازی مجدد</h3>
            <p className="text-xs text-blue-200/80 mt-2 leading-6">
              حریف می‌خواهد یک مسابقه تازه شروع شود. فقط با تأیید شما وضعیت بازی بازنشانی می‌شود.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={acceptRematch}
                className="flex-1 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black cursor-pointer"
              >
                قبول و شروع مجدد
              </button>
              <button
                type="button"
                onClick={declineRematch}
                className="flex-1 py-2.5 rounded-2xl bg-stone-800 text-stone-300 text-xs font-bold hover:bg-stone-700 cursor-pointer"
              >
                رد درخواست
              </button>
            </div>
          </div>
        </div>
      )}

      {rematchWaiting && !rematchRequested && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90">
          <div className="w-full max-w-sm rounded-3xl border-2 border-amber-600/70 bg-[#12100d] p-5 text-center">
            <h3 className="text-base font-black text-amber-100">در انتظار پاسخ حریف</h3>
            <p className="text-xs text-amber-200/80 mt-2 leading-6">
              تا تأیید حریف، بازی فعلی حفظ می‌شود و هیچ وضعیتی بازنشانی نمی‌شود.
            </p>
            <button
              type="button"
              onClick={declineRematch}
              className="w-full mt-4 py-2.5 rounded-2xl bg-stone-800 text-stone-300 text-xs font-bold hover:bg-stone-700 cursor-pointer"
            >
              انصراف از درخواست
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-2rem)] max-w-sm">
          <div className="rounded-2xl border-2 border-amber-500/70 bg-[#1b130d]/95 px-3 py-2.5 shadow-2xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <span className="text-[11px] font-bold text-amber-100 leading-5 flex-1">{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="بستن پیام"
              className="text-amber-300 hover:text-amber-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
