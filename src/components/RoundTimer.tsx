import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Volume2,
  VolumeX,
  Lock,
  ShieldCheck,
  Plus,
  SlidersHorizontal,
  Check,
  X,
} from 'lucide-react';
import { GameTimer, Role } from '../types';

interface RoundTimerProps {
  role?: Role;
  timer?: GameTimer;
  onUpdateTimer?: (
    action: 'start' | 'pause' | 'reset' | 'set_time' | 'add_time',
    payload?: {
      initialSeconds?: number;
      remainingSeconds?: number;
      deltaSeconds?: number;
      startImmediately?: boolean;
    }
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
  const [localSecondsLeft, setLocalSecondsLeft] = useState<number>(
    timer?.remainingSeconds ?? timer?.initialSeconds ?? 60
  );
  const [localInitialSeconds, setLocalInitialSeconds] = useState<number>(timer?.initialSeconds ?? 60);
  const [localIsRunning, setLocalIsRunning] = useState<boolean>(timer?.isRunning ?? false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const hasBeepedRef = useRef<boolean>(false);

  // Custom time panel state
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState<string>('1');
  const [customSeconds, setCustomSeconds] = useState<string>('30');
  const [customError, setCustomError] = useState<string | null>(null);

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

  const handleSetTime = async (seconds: number, startImmediately = false) => {
    if (!isHost) return;
    hasBeepedRef.current = false;
    const bounded = Math.max(5, Math.min(3600, seconds));
    if (onUpdateTimer) {
      await onUpdateTimer('set_time', { initialSeconds: bounded, startImmediately });
    } else {
      setLocalInitialSeconds(bounded);
      setLocalSecondsLeft(bounded);
      setLocalIsRunning(startImmediately);
    }
  };

  // Add custom seconds (+15s, +30s, +1m, etc.) to the currently running or paused timer
  const handleAddTime = async (deltaSeconds: number) => {
    if (!isHost) return;
    hasBeepedRef.current = false;
    if (onUpdateTimer) {
      await onUpdateTimer('add_time', { deltaSeconds });
    } else {
      const newLeft = Math.max(5, Math.min(3600, displaySeconds + deltaSeconds));
      setLocalSecondsLeft(newLeft);
      setLocalInitialSeconds(Math.max(localInitialSeconds, newLeft));
    }
  };

  // Submit custom minutes + seconds from the input form
  const parseCustomTotalSeconds = (): number | null => {
    const mins = parseInt(customMinutes || '0', 10);
    const secs = parseInt(customSeconds || '0', 10);
    if (isNaN(mins) || isNaN(secs) || mins < 0 || secs < 0) {
      setCustomError('Введите корректные числа');
      return null;
    }
    const total = mins * 60 + secs;
    if (total < 5) {
      setCustomError('Минимум 5 секунд');
      return null;
    }
    if (total > 3600) {
      setCustomError('Максимум 60 минут (3600 с)');
      return null;
    }
    setCustomError(null);
    return total;
  };

  const handleApplyCustomTime = async (startImmediately: boolean = false) => {
    const total = parseCustomTotalSeconds();
    if (total === null) return;
    await handleSetTime(total, startImmediately);
    setShowCustomInput(false);
  };

  const handleAddCustomToCurrent = async () => {
    const total = parseCustomTotalSeconds();
    if (total === null) return;
    await handleAddTime(total);
    setShowCustomInput(false);
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
      <div
        className={`flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow ${className}`}
      >
        <Clock className={`w-4 h-4 ${isRunning ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
        <span
          className={`font-mono text-base font-bold ${
            isDanger ? 'text-rose-400 animate-pulse' : 'text-white'
          }`}
        >
          {formatTime(displaySeconds)}
        </span>
        {isHost && (
          <div className="flex items-center gap-1 ml-1 border-l border-slate-700 pl-2">
            <button
              onClick={handleTogglePlay}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
              title={isRunning ? 'Пауза' : 'Старт'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => handleAddTime(30)}
              className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-amber-400 hover:bg-amber-950/80 rounded border border-amber-800/60 transition-colors cursor-pointer"
              title="Добавить +30 секунд к таймеру"
            >
              +30с
            </button>
            <button
              onClick={handleReset}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
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
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isRunning
                ? 'bg-amber-950 text-amber-400 border border-amber-800/80'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
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

        <div className="flex items-center gap-1.5">
          {isHost && (
            <button
              onClick={() => {
                setShowCustomInput(!showCustomInput);
                setCustomError(null);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                showCustomInput
                  ? 'bg-rose-950 text-rose-300 border-rose-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title="Настроить кастомное время"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
              <span>Своё время</span>
            </button>
          )}

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
          <span className="text-xs font-mono text-slate-500">
            / {formatTime(initialSeconds)} ({initialSeconds}с)
          </span>
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

      {/* QUICK ADD TIME & PRESETS — HOST ONLY */}
      {isHost ? (
        <div className="space-y-2.5">
          {/* Quick Add Time Chips */}
          <div className="flex items-center justify-between gap-1.5 text-xs bg-slate-950/60 p-2 rounded-xl border border-slate-800/70">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Plus className="w-3 h-3 text-amber-400" />
              <span>Добавить время:</span>
            </span>
            <div className="flex items-center gap-1.5">
              {[
                { label: '+15с', secs: 15 },
                { label: '+30с', secs: 30 },
                { label: '+1м', secs: 60 },
                { label: '+2м', secs: 120 },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleAddTime(item.secs)}
                  className="px-2 py-1 rounded-lg bg-amber-950/50 hover:bg-amber-900/70 text-amber-300 border border-amber-800/60 font-mono font-bold text-[11px] transition-all hover:scale-105 cursor-pointer shadow-sm"
                  title={`Добавить ${item.label} прямо сейчас`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[
              { label: '30с', val: 30 },
              { label: '60с (1м)', val: 60 },
              { label: '90с (1.5м)', val: 90 },
              { label: '120с (2м)', val: 120 },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => handleSetTime(p.val)}
                className={`py-1.5 rounded-lg font-mono font-semibold transition-all cursor-pointer truncate ${
                  initialSeconds === p.val
                    ? 'bg-rose-950 text-rose-300 border border-rose-800 shadow-sm font-bold'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* CUSTOM TIME INPUT FORM (Expandable) */}
          {showCustomInput && (
            <div className="p-3 bg-slate-950 rounded-xl border border-rose-900/60 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
                  <span>Установка или добавление кастомного времени</span>
                </span>
                <button
                  onClick={() => setShowCustomInput(false)}
                  className="text-slate-400 hover:text-white p-1 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Minute and Second Inputs */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={customMinutes}
                    onChange={(e) => {
                      setCustomMinutes(e.target.value);
                      setCustomError(null);
                    }}
                    className="w-12 bg-transparent text-white font-mono font-bold text-sm text-center outline-none"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-400">мин</span>
                </div>

                <span className="text-slate-500 font-bold">:</span>

                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customSeconds}
                    onChange={(e) => {
                      setCustomSeconds(e.target.value);
                      setCustomError(null);
                    }}
                    className="w-12 bg-transparent text-white font-mono font-bold text-sm text-center outline-none"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-400">сек</span>
                </div>

                {/* Quick Quick-tags */}
                <div className="flex items-center gap-1 text-[11px] ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMinutes('0');
                      setCustomSeconds('45');
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    45с
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMinutes('2');
                      setCustomSeconds('30');
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    2.5м
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMinutes('3');
                      setCustomSeconds('0');
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    3м
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMinutes('5');
                      setCustomSeconds('0');
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    5м
                  </button>
                </div>
              </div>

              {customError && <div className="text-[11px] text-rose-400">{customError}</div>}

              {/* Action Buttons for Custom Time */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleApplyCustomTime(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer border border-slate-700 flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Установить базовое время</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddCustomToCurrent}
                  className="px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 text-xs font-bold transition-colors cursor-pointer border border-amber-800/80 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Прибавить к текущему</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyCustomTime(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md shadow-rose-950 flex items-center gap-1 ml-auto"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Запустить сразу</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 text-center py-0.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
          Ведущий устанавливает время на аргументацию или речь в защиту
        </div>
      )}
    </div>
  );
}
