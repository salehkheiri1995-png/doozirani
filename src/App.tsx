/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Bluetooth, Smartphone, Bot, Users, Sparkles, HelpCircle, Shield, RotateCcw, Volume2, VolumeX, ShoppingBag, Coins, Video } from 'lucide-react';
import { Player, GameVariant, GameMode, AIDifficulty, PlayerStats } from './game/doozTypes';
import {
  ThreeDoozState,
  createInitialThreeDoozState,
  placeStoneThreeDooz,
  moveStoneThreeDooz,
  getLegalMoveDestinations,
} from './game/threeDoozLogic';
import {
  TwelveDoozState,
  createInitialTwelveDoozState,
  placeStoneTwelveDooz,
  moveStoneTwelveDooz,
  removeOpponentStone,
  getLegalTwelveDoozMoves,
  getRemovableOpponentStones,
  countStonesOnBoard,
} from './game/twelveDoozLogic';
import { getThreeDoozAIMove, getTwelveDoozAIMove } from './game/aiPlayer';
import { HeaderHUD } from './components/HeaderHUD';
import { ThreeDoozBoard } from './components/ThreeDoozBoard';
import { TwelveDoozBoard } from './components/TwelveDoozBoard';
import { StonePiece } from './components/StonePiece';
import { ModeSelectorModal } from './components/ModeSelectorModal';
import { BluetoothModal } from './components/BluetoothModal';
import { LocalRoomModal } from './components/LocalRoomModal';
import { GameOverModal } from './components/GameOverModal';
import { RulesModal } from './components/RulesModal';
import { ShopModal } from './components/ShopModal';
import { RewardedAdModal } from './components/RewardedAdModal';
import { TapsellBanner } from './components/TapsellBanner';
import { getPlayerCoins, savePlayerCoins, addPlayerCoins } from './utils/monetization';
import {
  playStonePlaceSound,
  playStoneSelectSound,
  playDoozChimeSound,
  playStoneCaptureSound,
  playVictorySound,
  setSoundEnabled,
  isSoundEnabled,
  triggerHaptic,
} from './utils/audio';
import { BluetoothManager, BluetoothConnectionState } from './utils/bluetooth';
import { P2PSyncEngine, RoomMessage } from './utils/p2pSync';

export default function App() {
  // App screen state ('title' | 'playing' | 'gameover')
  const [appState, setAppState] = useState<'title' | 'playing' | 'gameover'>('title');

  // Game configuration
  const [variant, setVariant] = useState<GameVariant>('three_dooz');
  const [mode, setMode] = useState<GameMode>('pass_and_play');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('hard');
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Game states
  const [threeState, setThreeState] = useState<ThreeDoozState>(createInitialThreeDoozState());
  const [twelveState, setTwelveState] = useState<TwelveDoozState>(createInitialTwelveDoozState());

  // Statistics
  const [scores, setScores] = useState<PlayerStats>({ player1: 0, player2: 0, draws: 0 });

  // Economy & Coins
  const [coins, setCoins] = useState<number>(() => getPlayerCoins());

  // Modals
  const [isModesOpen, setIsModesOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isRewardedAdOpen, setIsRewardedAdOpen] = useState(false);
  const [isBluetoothOpen, setIsBluetoothOpen] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [roomId, setRoomId] = useState('1234');

  // Networking managers
  const [btState, setBtState] = useState<BluetoothConnectionState>({
    isSupported: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    isScanning: false,
    isConnected: false,
    deviceName: null,
    error: null,
    isHost: false,
  });

  const btManagerRef = useRef<BluetoothManager | null>(null);
  const p2pEngineRef = useRef<P2PSyncEngine | null>(null);

  // Check URL query parameters for ?autostart=1
  useEffect(() => {
    document.body.dataset.state = appState;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        setAppState('playing');
        document.body.dataset.state = 'playing';
      }
    }
  }, []);

  // Sync dataset.state with appState
  useEffect(() => {
    document.body.dataset.state = appState;
  }, [appState]);

  // Handle Global Start / Enter / Space on Title screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (appState === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startGame();
      } else if (e.key === 'Escape') {
        setIsModesOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appState]);

  // Initialize Bluetooth and P2P Sync engines
  useEffect(() => {
    const bt = new BluetoothManager(
      (msg) => handleRemoteMessage(msg),
      (state) => setBtState(state)
    );
    btManagerRef.current = bt;

    const p2p = new P2PSyncEngine(roomId, (msg) => {
      if (msg.sender !== 'player1') {
        handleP2PMessage(msg);
      }
    });
    p2pEngineRef.current = p2p;

    return () => {
      p2p.destroy();
      bt.disconnect();
    };
  }, [roomId]);

  const handleRemoteMessage = (msg: any) => {
    // Bluetooth message received
    if (msg.type === 'PLACE_STONE') {
      handleCellClick(msg.payload.index, true);
    } else if (msg.type === 'MOVE_STONE') {
      handleCellClick(msg.payload.from, true);
      handleCellClick(msg.payload.to, true);
    } else if (msg.type === 'REMOVE_STONE') {
      handleCellClick(msg.payload.index, true);
    }
  };

  const handleP2PMessage = (msg: RoomMessage) => {
    if (msg.type === 'PLACE') {
      handleCellClick(msg.payload.index, true);
    } else if (msg.type === 'MOVE') {
      handleCellClick(msg.payload.from, true);
      handleCellClick(msg.payload.to, true);
    } else if (msg.type === 'REMOVE') {
      handleCellClick(msg.payload.index, true);
    } else if (msg.type === 'RESTART') {
      restartGame(false);
    }
  };

  const startGame = useCallback(() => {
    setAppState('playing');
    document.body.dataset.state = 'playing';
    playStonePlaceSound();
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const restartGame = (notifyPeer = true) => {
    setThreeState(createInitialThreeDoozState());
    setTwelveState(createInitialTwelveDoozState());
    setAppState('playing');
    playStonePlaceSound();

    if (notifyPeer && mode === 'p2p_room' && p2pEngineRef.current) {
      p2pEngineRef.current.send('player1', 'RESTART');
    }
  };

  // AI Turn Trigger
  useEffect(() => {
    if (appState !== 'playing' || mode !== 'vs_ai') return;

    if (variant === 'three_dooz' && threeState.turn === 'player2' && !threeState.winner) {
      const timer = setTimeout(() => {
        const move = getThreeDoozAIMove(threeState, aiDifficulty);
        if (move) {
          if (move.action === 'place') {
            const next = placeStoneThreeDooz(threeState, move.to);
            applyThreeDoozState(next);
          } else if (move.action === 'move' && move.from !== undefined) {
            const next = moveStoneThreeDooz(threeState, move.from, move.to);
            applyThreeDoozState(next);
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    if (variant === 'twelve_dooz' && twelveState.turn === 'player2' && !twelveState.winner) {
      const timer = setTimeout(() => {
        const move = getTwelveDoozAIMove(twelveState, aiDifficulty);
        if (move) {
          if (move.action === 'remove' && move.removeIndex !== undefined) {
            const next = removeOpponentStone(twelveState, move.removeIndex);
            applyTwelveDoozState(next);
          } else if (move.action === 'place' && move.to !== undefined) {
            const next = placeStoneTwelveDooz(twelveState, move.to);
            applyTwelveDoozState(next);
          } else if (move.action === 'move' && move.from !== undefined && move.to !== undefined) {
            const next = moveStoneTwelveDooz(twelveState, move.from, move.to);
            applyTwelveDoozState(next);
          }
        }
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [appState, mode, variant, threeState, twelveState, aiDifficulty]);

  // Apply Three Dooz State and check sound / victory
  const applyThreeDoozState = (next: ThreeDoozState) => {
    if (next.winner) {
      playVictorySound();
      setAppState('gameover');
      if (next.winner === 'player1') {
        setScores(prev => ({ ...prev, player1: prev.player1 + 1 }));
        const updatedCoins = addPlayerCoins(30);
        setCoins(updatedCoins);
      } else if (next.winner === 'player2') {
        setScores(prev => ({ ...prev, player2: prev.player2 + 1 }));
      } else {
        setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
      }
    } else {
      playStonePlaceSound();
    }
    setThreeState(next);
  };

  // Apply Twelve Dooz State and check sound / victory / mill
  const applyTwelveDoozState = (next: TwelveDoozState) => {
    if (next.winner) {
      playVictorySound();
      setAppState('gameover');
      if (next.winner === 'player1') {
        setScores(prev => ({ ...prev, player1: prev.player1 + 1 }));
        const updatedCoins = addPlayerCoins(50);
        setCoins(updatedCoins);
      } else if (next.winner === 'player2') {
        setScores(prev => ({ ...prev, player2: prev.player2 + 1 }));
      }
    } else if (next.mustRemoveOpponentStone) {
      playDoozChimeSound();
    } else {
      playStonePlaceSound();
    }
    setTwelveState(next);
  };

  // Cell Click Handler (Placing, Moving, Removing)
  const handleCellClick = (index: number, isRemote = false) => {
    if (appState !== 'playing') return;

    // In AI mode, prevent human from clicking on Player 2's turn
    if (mode === 'vs_ai' && !isRemote) {
      const currentTurn = variant === 'three_dooz' ? threeState.turn : twelveState.turn;
      if (currentTurn === 'player2') return;
    }

    if (variant === 'three_dooz') {
      handleThreeDoozClick(index, isRemote);
    } else if (variant === 'twelve_dooz') {
      handleTwelveDoozClick(index, isRemote);
    }
  };

  const handleThreeDoozClick = (index: number, isRemote: boolean) => {
    if (threeState.winner) return;

    if (threeState.phase === 'placing') {
      if (threeState.board[index] === null) {
        const next = placeStoneThreeDooz(threeState, index);
        applyThreeDoozState(next);

        if (!isRemote) {
          if (mode === 'p2p_room' && p2pEngineRef.current) {
            p2pEngineRef.current.send(threeState.turn, 'PLACE', { index });
          }
          if (mode === 'bluetooth' && btManagerRef.current) {
            btManagerRef.current.send({ type: 'PLACE_STONE', payload: { index } });
          }
        }
      }
    } else if (threeState.phase === 'moving') {
      const stone = threeState.board[index];

      // If clicking own stone, select it
      if (stone === threeState.turn) {
        playStoneSelectSound();
        setThreeState(prev => ({
          ...prev,
          selectedFromIndex: prev.selectedFromIndex === index ? null : index,
        }));
        return;
      }

      // If stone is selected and clicking valid empty destination
      if (threeState.selectedFromIndex !== null && stone === null) {
        const validDests = getLegalMoveDestinations(threeState.board, threeState.selectedFromIndex, false);
        if (validDests.includes(index)) {
          const from = threeState.selectedFromIndex;
          const next = moveStoneThreeDooz(threeState, from, index);
          applyThreeDoozState(next);

          if (!isRemote) {
            if (mode === 'p2p_room' && p2pEngineRef.current) {
              p2pEngineRef.current.send(threeState.turn, 'MOVE', { from, to: index });
            }
            if (mode === 'bluetooth' && btManagerRef.current) {
              btManagerRef.current.send({ type: 'MOVE_STONE', payload: { from, to: index } });
            }
          }
        }
      }
    }
  };

  const handleTwelveDoozClick = (index: number, isRemote: boolean) => {
    if (twelveState.winner) return;

    // 1. If currently in remove stone state
    if (twelveState.mustRemoveOpponentStone) {
      const opponent: Player = twelveState.turn === 'player1' ? 'player2' : 'player1';
      if (twelveState.board[index] === opponent) {
        const removable = getRemovableOpponentStones(twelveState.board, opponent);
        if (removable.includes(index)) {
          playStoneCaptureSound();
          const next = removeOpponentStone(twelveState, index);
          applyTwelveDoozState(next);

          if (!isRemote) {
            if (mode === 'p2p_room' && p2pEngineRef.current) {
              p2pEngineRef.current.send(twelveState.turn, 'REMOVE', { index });
            }
            if (mode === 'bluetooth' && btManagerRef.current) {
              btManagerRef.current.send({ type: 'REMOVE_STONE', payload: { index } });
            }
          }
        }
      }
      return;
    }

    // 2. Placing Phase
    if (twelveState.phase === 'placing') {
      if (twelveState.board[index] === null) {
        const next = placeStoneTwelveDooz(twelveState, index);
        applyTwelveDoozState(next);

        if (!isRemote) {
          if (mode === 'p2p_room' && p2pEngineRef.current) {
            p2pEngineRef.current.send(twelveState.turn, 'PLACE', { index });
          }
          if (mode === 'bluetooth' && btManagerRef.current) {
            btManagerRef.current.send({ type: 'PLACE_STONE', payload: { index } });
          }
        }
      }
      return;
    }

    // 3. Moving / Flying Phase
    if (twelveState.phase === 'moving' || twelveState.phase === 'flying') {
      const stone = twelveState.board[index];

      // Selecting own stone
      if (stone === twelveState.turn) {
        playStoneSelectSound();
        setTwelveState(prev => ({
          ...prev,
          selectedFromIndex: prev.selectedFromIndex === index ? null : index,
        }));
        return;
      }

      // Moving to destination
      if (twelveState.selectedFromIndex !== null && stone === null) {
        const canFly = countStonesOnBoard(twelveState.board, twelveState.turn) === 3;
        const validDests = getLegalTwelveDoozMoves(twelveState.board, twelveState.selectedFromIndex, canFly);

        if (validDests.includes(index)) {
          const from = twelveState.selectedFromIndex;
          const next = moveStoneTwelveDooz(twelveState, from, index);
          applyTwelveDoozState(next);

          if (!isRemote) {
            if (mode === 'p2p_room' && p2pEngineRef.current) {
              p2pEngineRef.current.send(twelveState.turn, 'MOVE', { from, to: index });
            }
            if (mode === 'bluetooth' && btManagerRef.current) {
              btManagerRef.current.send({ type: 'MOVE_STONE', payload: { from, to: index } });
            }
          }
        }
      }
    }
  };

  // Compute active variables for HUD and boards
  const currentTurn = variant === 'three_dooz' ? threeState.turn : twelveState.turn;
  const currentPhase = variant === 'three_dooz' ? threeState.phase : twelveState.phase;
  const currentUnplaced = variant === 'three_dooz' ? threeState.unplacedCount : twelveState.unplacedCount;
  const currentP1OnBoard = variant === 'three_dooz'
    ? threeState.board.filter(c => c === 'player1').length
    : countStonesOnBoard(twelveState.board, 'player1');
  const currentP2OnBoard = variant === 'three_dooz'
    ? threeState.board.filter(c => c === 'player2').length
    : countStonesOnBoard(twelveState.board, 'player2');
  const currentWinner = variant === 'three_dooz' ? threeState.winner : twelveState.winner;
  const currentReason = variant === 'three_dooz' ? (threeState.winner ? '۳ مهره در یک راستا ردیف شد!' : null) : twelveState.winningReason;
  const currentMoveCount = variant === 'three_dooz' ? threeState.moveCount : twelveState.moveCount;

  // Valid destinations for selected stone
  const threeValidDests =
    threeState.selectedFromIndex !== null
      ? getLegalMoveDestinations(threeState.board, threeState.selectedFromIndex, false)
      : [];

  const twelveValidDests =
    twelveState.selectedFromIndex !== null
      ? getLegalTwelveDoozMoves(
          twelveState.board,
          twelveState.selectedFromIndex,
          countStonesOnBoard(twelveState.board, twelveState.turn) === 3
        )
      : [];

  const removableIndices =
    twelveState.mustRemoveOpponentStone
      ? getRemovableOpponentStones(twelveState.board, twelveState.turn === 'player1' ? 'player2' : 'player1')
      : [];

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full bg-[#120e0a] text-amber-100 flex flex-col justify-between items-center relative overflow-hidden select-none"
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* 1. TITLE SCREEN OVERLAY */}
      {appState === 'title' && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#18110b] via-[#120e0a] to-[#0c0906]">
          {/* Top Title Lockup & Persian Crest */}
          <div className="flex flex-col items-center pt-4 text-center max-w-sm w-full">
            {/* Top Bar with Coins & Sound */}
            <div className="w-full flex items-center justify-between px-2 mb-2">
              <button
                type="button"
                onClick={() => setIsShopOpen(true)}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-2xl bg-amber-950/80 border-2 border-yellow-500/60 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="font-black text-xs text-yellow-300">{coins}</span>
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

            {/* Persian Crest */}
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

            {/* Variant Switcher (3-Dooz vs 12-Dooz) */}
            <div className="flex w-full bg-stone-900/90 p-1 rounded-2xl border border-amber-700/50 mt-3 shadow-inner">
              <button
                type="button"
                onClick={() => setVariant('three_dooz')}
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
                onClick={() => setVariant('twelve_dooz')}
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

          {/* Mobile Arcade Mode Selection Cards */}
          <div className="w-full max-w-sm space-y-2.5 my-auto">
            {/* Mode 1: Pass and play */}
            <button
              type="button"
              onClick={() => {
                setMode('pass_and_play');
                startGame();
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/80 to-amber-900/60 border border-amber-600/50 hover:border-amber-400 flex items-center justify-between text-right shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-800/60 border border-amber-500/40 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <span className="font-black text-sm text-amber-100 block">دو نفره آفلاین (یک گوشی)</span>
                  <span className="text-[11px] text-amber-300/80 block">پاس دادن گوشی و رقابت دو نفره روی همین صفحه</span>
                </div>
              </div>
            </button>

            {/* Mode 2: Bluetooth */}
            <button
              type="button"
              onClick={() => {
                setMode('bluetooth');
                setIsBluetoothOpen(true);
                startGame();
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/80 to-indigo-950/60 border border-blue-600/50 hover:border-blue-400 flex items-center justify-between text-right shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-blue-500/40 flex items-center justify-center">
                  <Bluetooth className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <span className="font-black text-sm text-blue-100 block">بازی با بلوتوث بین دو گوشی اندروید</span>
                  <span className="text-[11px] text-blue-300/80 block">اتصال مستقیم بی‌سیم بین دو موبایل بدون اینترنت</span>
                </div>
              </div>
            </button>

            {/* Mode 3: AI */}
            <button
              type="button"
              onClick={() => {
                setMode('vs_ai');
                startGame();
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/80 to-stone-900/60 border border-purple-600/50 hover:border-purple-400 flex items-center justify-between text-right shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <span className="font-black text-sm text-purple-100 block">بازی با هوش مصنوعی (آفلاین)</span>
                  <span className="text-[11px] text-purple-300/80 block">مسابقه با ربات در ۳ سطح آسان، متوسط و حرفه‌ای</span>
                </div>
              </div>
            </button>

            {/* Shop & Monetization Rewarded Ad */}
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
                  <span className="font-black text-sm text-yellow-200 block">فروشگاه مهره‌ها و کسب درآمد</span>
                  <span className="text-[11px] text-amber-300/80 block">تماشای فیلم تبلیغاتی (+۱۰۰ سکه) و آموزش کسب درآمد</span>
                </div>
              </div>
            </button>
          </div>

          {/* Tapsell Standard Banner */}
          <div className="w-full max-w-sm px-1">
            <TapsellBanner />
          </div>

          {/* Primary CTA & Start Handshake */}
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

      {/* 2. MAIN PLAYING HUD & SCREEN */}
      <HeaderHUD
        variant={variant}
        mode={mode}
        turn={currentTurn}
        p1Unplaced={currentUnplaced.player1}
        p2Unplaced={currentUnplaced.player2}
        p1OnBoard={currentP1OnBoard}
        p2OnBoard={currentP2OnBoard}
        phase={currentPhase}
        mustRemoveStone={variant === 'twelve_dooz' && twelveState.mustRemoveOpponentStone}
        isSoundOn={soundOn}
        coins={coins}
        onToggleSound={toggleSound}
        onRestart={() => restartGame(true)}
        onBackToMenu={() => setAppState('title')}
        onOpenShop={() => setIsShopOpen(true)}
      />

      {/* 3. GAMEPLAY BOARD */}
      <main className="w-full flex-1 flex flex-col items-center justify-center px-2 py-1 max-w-md mx-auto">
        {variant === 'three_dooz' ? (
          <ThreeDoozBoard
            board={threeState.board}
            turn={threeState.turn}
            phase={threeState.phase}
            selectedFromIndex={threeState.selectedFromIndex}
            validDestinations={threeValidDests}
            winningLine={threeState.winningLine}
            onCellClick={(idx) => handleCellClick(idx)}
          />
        ) : (
          <TwelveDoozBoard
            board={twelveState.board}
            turn={twelveState.turn}
            phase={twelveState.phase}
            mustRemoveStone={twelveState.mustRemoveOpponentStone}
            removableIndices={removableIndices}
            selectedFromIndex={twelveState.selectedFromIndex}
            validDestinations={twelveValidDests}
            lastFormedLines={twelveState.lastFormedLines}
            onCellClick={(idx) => handleCellClick(idx)}
          />
        )}
      </main>

      {/* 4. MOBILE GAME IN-PLAY ACTION BAR */}
      <div className="w-full max-w-md mx-auto px-3 pb-3 pt-1 z-20 flex items-center justify-between gap-2 select-none">
        {/* Prominent Back Button */}
        <button
          type="button"
          onClick={() => setAppState('title')}
          className="flex-1 py-2.5 px-3 rounded-2xl bg-stone-900/90 border border-stone-700/60 text-amber-200 font-black text-xs hover:bg-stone-800 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-md"
        >
          <span>بازگشت به منو</span>
        </button>

        {/* Change Mode */}
        <button
          type="button"
          onClick={() => setIsModesOpen(true)}
          className="flex-1 py-2.5 px-3 rounded-2xl bg-stone-900/90 border border-stone-700/60 text-stone-300 font-bold text-xs hover:bg-stone-800 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-md"
        >
          <span>تغییر حالت بازی</span>
        </button>

        {/* Rules */}
        <button
          type="button"
          onClick={() => setIsRulesOpen(true)}
          className="py-2.5 px-3 rounded-2xl bg-amber-950/60 border border-amber-700/60 text-amber-300 font-bold text-xs hover:bg-amber-900/70 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-md"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>قوانین</span>
        </button>
      </div>

      {/* 5. MODALS & OVERLAYS */}
      <ModeSelectorModal
        isOpen={isModesOpen}
        currentVariant={variant}
        currentMode={mode}
        aiDifficulty={aiDifficulty}
        onSelect={(newVariant, newMode, newDiff) => {
          setVariant(newVariant);
          setMode(newMode);
          setAiDifficulty(newDiff);
          restartGame();
          if (newMode === 'bluetooth') {
            setIsBluetoothOpen(true);
          } else if (newMode === 'p2p_room') {
            setIsRoomOpen(true);
          }
        }}
        onClose={() => setIsModesOpen(false)}
      />

      <BluetoothModal
        isOpen={isBluetoothOpen}
        btState={btState}
        onScanAndConnect={async () => {
          if (btManagerRef.current) {
            await btManagerRef.current.requestAndConnectDevice();
          }
        }}
        onSimulateConnect={() => {
          if (btManagerRef.current) {
            btManagerRef.current.simulateConnected();
          }
        }}
        onDisconnect={() => {
          if (btManagerRef.current) {
            btManagerRef.current.disconnect();
          }
        }}
        onClose={() => setIsBluetoothOpen(false)}
      />

      <LocalRoomModal
        isOpen={isRoomOpen}
        roomId={roomId}
        isHost={true}
        connectedPeers={1}
        onSetRoomId={(newId) => {
          setRoomId(newId);
          if (p2pEngineRef.current) {
            p2pEngineRef.current.setRoom(newId);
          }
        }}
        onClose={() => setIsRoomOpen(false)}
      />

      <GameOverModal
        isOpen={appState === 'gameover'}
        winner={currentWinner}
        reason={currentReason}
        moveCount={currentMoveCount}
        mode={mode}
        variant={variant}
        scores={scores}
        onRestart={() => restartGame(true)}
        onOpenModes={() => setIsModesOpen(true)}
        onWatchAd={() => setIsRewardedAdOpen(true)}
      />

      <RulesModal
        isOpen={isRulesOpen}
        activeVariant={variant}
        onClose={() => setIsRulesOpen(false)}
      />

      <ShopModal
        isOpen={isShopOpen}
        coins={coins}
        onCoinsChange={(newCoins) => setCoins(newCoins)}
        onWatchAdClick={() => setIsRewardedAdOpen(true)}
        onClose={() => setIsShopOpen(false)}
      />

      <RewardedAdModal
        isOpen={isRewardedAdOpen}
        rewardAmount={100}
        onRewardGranted={(amount) => {
          const next = addPlayerCoins(amount);
          setCoins(next);
        }}
        onClose={() => setIsRewardedAdOpen(false)}
      />
    </div>
  );
}
