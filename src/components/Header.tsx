import React from 'react';
import { Role } from '../types';
import { Shield, BookOpen, Clock, RefreshCw, Radio } from 'lucide-react';

interface HeaderProps {
  role: Role;
  onSelectRole: (role: Role) => void;
  onOpenDeck: () => void;
  onToggleTimer: () => void;
  showTimer: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  generationId?: number;
}

export function Header({
  role,
  onSelectRole,
  onOpenDeck,
  onToggleTimer,
  showTimer,
  onRefresh,
  isRefreshing,
  generationId,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center font-black text-white shadow-lg shadow-rose-950/50">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-white tracking-wider">
                БУНКЕР <span className="text-rose-500">IT</span>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700 hidden sm:inline-block">
                v2.0
              </span>
            </div>
            {generationId && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                <span>Партия #{generationId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Role Navigation Switcher */}
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
          <button
            onClick={() => onSelectRole('player')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              role === 'player'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🪪</span>
            <span>Игрок</span>
          </button>

          <button
            onClick={() => onSelectRole('host')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              role === 'host'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🔐</span>
            <span>Ведущий</span>
          </button>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTimer}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
              showTimer
                ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
            title="Переключить таймер раунда"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Таймер</span>
          </button>

          <button
            onClick={onOpenDeck}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Просмотр всей колоды 300 карт"
          >
            <BookOpen className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Колода карт</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
            title="Обновить состояние партии"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-rose-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
