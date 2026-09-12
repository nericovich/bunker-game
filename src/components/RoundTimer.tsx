import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Volume2, VolumeX, Lock, ShieldCheck } from 'lucide-react';
import { GameTimer, Role } from '../types';

interface RoundTimerProps {
  role?: Role;
  timer?: GameTimer;
  onUpdateTimer?: (
    action: 'start' | 'pause' | 'reset' | 'set_time',
    payload?: { initialSeconds?: number; remainingSeconds?: number }
  ) => Promise<void> | void;
  onTimeUp?: () => void;
  className?: string;
  compact?: boolean;
}

export function RoundTimer({
  role = 'player',
  timer,
  onUpdateTimer,
  onTimeUp,
  className = '',
  compact = false,
}: RoundTimerProps) {
  const isHost = role === 'host';

  // Fallback local state if no server timer provided
  const [localSecondsLeft, setLocalSecondsLeft] = useState<number>(timer?.remainingSeconds ?? timer?.initialSeconds ?? 60);
  const [localInitialSeconds, setLocalInitialSeconds] = useState<number>(timer?.initialSeconds ?? 60);
  const [localIsRunning, setLocalIsRunning] = useState<boolean>(timer?.isRunning ?? false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const hasBeepedRef = useRef<boolean>(false);

  // Derive active status and remaining seconds from synchronized timer or local state
  const isRunning = timer ? timer.isRunning : localIsRunning;
  const initialSeconds = timer ? timer.initialSeconds : localInitialSeconds;

  const calculateSecondsLeft = (): number => {
    if (timer) {
      if (timer.isRunning && timer.endsAt) {
        const diff = Math.ceil((timer.endsAt - Date.now()) / 1000);
        return Math.max(0, diff);
      }
      return timer.remainingSeconds ?? timer.initialSeconds ?? 60;
    }
    return localSecondsLeft;
  };

  const [displaySeconds, setDisplaySeconds] = useState<number>(calculateSecondsLeft);

  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('AudioContext beep error', e);
    }
  };

  // Keep ticking every 250ms for accurate and smooth countdown
  useEffect(() => {
    const tick = () => {
      const sec = calculateSecondsLeft();
      setDisplaySeconds(sec);

      if (isRunning && sec === 0 && !hasBeepedRef.current) {
        hasBeepedRef.current = true;
        playBeep();
        if (onTimeUp) onTimeUp();
      } else if (sec > 0) {
        hasBeepedRef.current = false;
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [timer?.endsAt, timer?.isRunning, timer?.remainingSeconds, isRunning]);

  const handleTogglePlay = async () => {
    if (!isHost) return;

    if (onUpdateTimer) {
      if (isRunning) {
        await onUpdateTimer('pause', { remainingSeconds: displaySeconds });
      } else {
        const toStart = displaySeconds > 0 ? displaySeconds : initialSeconds;
        await onUpdateTimer('start', { remainingSeconds: toStart });
      }
    } else {
      // Local fallback
      if (isRunning) {
        setLocalIsRunning(false);
      } else {
        if (displaySeconds === 0) setLocalSecondsLeft(localInitialSeconds);
        setLocalIsRunning(true);
      }
    }
  };

  const handleReset = async () => {
    if (!isHost) return;
    hasBeepedRef.current = false;
    if (onUpdateTimer) {
      await onUpdateTimer('reset', { initialSeconds });
    } else {
      setLocalIsRunning(false);
      setLocalSecondsLeft(localInitialSeconds);
    }
  };

  const handleSetTime = async (seconds: number) => {
    if (!isHost) return;
    hasBeepedRef.current = false;
    if (onUpdateTimer) {
      await onUpdateTimer('set_time', { initialSeconds: seconds });
    } else {
      setLocalIsRunning(false);
      setLocalInitialSeconds(seconds);
      setLocalSecondsLeft(seconds);
    }
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const percent = initialSeconds > 0 ? ((initialSeconds - displaySeconds) / initialSeconds) * 100 : 0;
  const isDanger = displaySeconds <= 10 && displaySeconds > 0;
  const isFinished = displaySeconds === 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow ${className}`}>
        <Clock className={`w-4 h-4 ${isRunning ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
        <span className={`font-mono text-base font-bold ${isDanger ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
          {formatTime(displaySeconds)}
        </span>
        {isHost && (
          <div className="flex items-center gap-1 ml-1 border-l border-slate-700 pl-2">
            <button
              onClick={handleTogglePlay}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title={isRunning ? 'Пауза' : 'Старт'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleReset}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Сброс"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-slate-900/95 border rounded-2xl p-4 text-white shadow-xl backdrop-blur-md transition-all ${
        isDanger && isRunning
          ? 'border-rose-600/90 shadow-rose-950/40 animate-pulse'
          : 'border-slate-700/80'
      } ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isRunning ? 'bg-amber-950 text-amber-400 border border-amber-800/80' : 'bg-slate-800 text-slate-400'}`}>
            <Clock className={`w-4 h-4 ${isRunning ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
              <span>Таймер раунда</span>
              {isRunning && (
                <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-mono animate-pulse">
                  Идёт
                </span>
              )}
            </div>
            {!isHost && (
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>Управление у ведущего</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          title={soundEnabled ? 'Звук включён (нажмите чтобы выключить)' : 'Звук выключен'}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>

      {/* Countdown and Control Buttons */}
      <div className="flex items-center justify-between my-2.5">
        <div className="flex items-baseline gap-2">
          <div
            className={`font-mono text-3xl sm:text-4xl font-black tracking-tight ${
              isDanger && isRunning
                ? 'text-rose-400'
                : isFinished
                ? 'text-rose-500'
                : isRunning
                ? 'text-amber-300'
                : 'text-slate-100'
            }`}
          >
            {formatTime(displaySeconds)}
          </div>
          <span className="text-xs font-mono text-slate-500">/ {initialSeconds}с</span>
        </div>

        {/* HOST CONTROLS ONLY */}
        {isHost ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePlay}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950 hover:scale-105'
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isRunning ? 'Пауза' : 'Старт'}</span>
            </button>

            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Сбросить таймер"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* READ-ONLY BADGE FOR PLAYER */
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Синхронизировано</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800/90 rounded-full h-2 overflow-hidden mb-3 border border-slate-800">
        <div
          className={`h-full transition-all duration-300 ${
            displaySeconds <= 10 && displaySeconds > 0
              ? 'bg-rose-500'
              : isFinished
              ? 'bg-rose-700'
              : 'bg-gradient-to-r from-amber-500 to-emerald-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Presets — HOST ONLY */}
      {isHost ? (
        <div className="grid grid-cols-4 gap-1.5 text-xs">
          {[30, 60, 90, 120].map((s) => (
            <button
              key={s}
              onClick={() => handleSetTime(s)}
              className={`py-1.5 rounded-lg font-mono font-semibold transition-all cursor-pointer ${
                initialSeconds === s
                  ? 'bg-rose-950 text-rose-300 border border-rose-800 shadow-sm font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50'
              }`}
            >
              {s}с
            </button>
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 text-center py-0.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
          Ведущий устанавливает время на аргументацию или речь в защиту
        </div>
      )}
    </div>
  );
}
