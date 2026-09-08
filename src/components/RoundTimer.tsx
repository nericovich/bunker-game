import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Volume2, VolumeX } from 'lucide-react';

interface RoundTimerProps {
  onTimeUp?: () => void;
}

export function RoundTimer({ onTimeUp }: RoundTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [initialSeconds, setInitialSeconds] = useState<number>(60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const intervalRef = useRef<number | null>(null);

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
      console.warn('AudioContext not allowed or not supported yet', e);
    }
  };

  useEffect(() => {
    if (isActive) {
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsActive(false);
            playBeep();
            if (onTimeUp) onTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, soundEnabled, onTimeUp]);

  const handleSetTime = (seconds: number) => {
    setIsActive(false);
    setInitialSeconds(seconds);
    setSecondsLeft(seconds);
  };

  const toggleTimer = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(initialSeconds);
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(initialSeconds);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const percent = initialSeconds > 0 ? ((initialSeconds - secondsLeft) / initialSeconds) * 100 : 0;

  return (
    <div className="bg-slate-900/90 border border-slate-700/70 rounded-xl p-3 text-white shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-rose-400 animate-pulse" />
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Таймер круга</span>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-slate-400 hover:text-slate-200 p-1 transition-colors"
          title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
        </button>
      </div>

      {/* Big Display */}
      <div className="flex items-center justify-between my-2">
        <div className={`font-mono text-2xl font-bold tracking-tight ${secondsLeft <= 10 && isActive ? 'text-rose-400 animate-bounce' : 'text-amber-300'}`}>
          {formatTime(secondsLeft)}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTimer}
            className={`p-2 rounded-lg font-medium text-xs flex items-center gap-1 transition-all ${
              isActive
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isActive ? 'Пауза' : 'Старт'}</span>
          </button>

          <button
            onClick={resetTimer}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Сбросить"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-2.5">
        <div
          className={`h-full transition-all duration-300 ${secondsLeft <= 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Presets */}
      <div className="grid grid-cols-4 gap-1 text-[11px]">
        {[30, 60, 90, 120].map((s) => (
          <button
            key={s}
            onClick={() => handleSetTime(s)}
            className={`py-1 rounded font-mono transition-colors ${
              initialSeconds === s
                ? 'bg-rose-950 text-rose-300 border border-rose-800/80 font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            {s}с
          </button>
        ))}
      </div>
    </div>
  );
}
