import React, { useState } from 'react';
import { GameTimer, Player, WorldCard } from '../types';
import { WorldSection } from './WorldSection';
import { PlayerCardItem } from './PlayerCardItem';
import { RoundTimer } from './RoundTimer';
import { ChevronDown, ChevronUp, User, ShieldCheck, Skull, RefreshCw, Clock } from 'lucide-react';

interface PlayerBoardProps {
  world: WorldCard[];
  players: Player[];
  timer?: GameTimer;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function PlayerBoard({
  world,
  players,
  timer,
  onRefresh,
  isRefreshing = false,
}: PlayerBoardProps) {
  // State for expanded players (default all expanded like in Streamlit)
  const [collapsedPlayers, setCollapsedPlayers] = useState<Record<string, boolean>>({});

  const togglePlayer = (id: string) => {
    setCollapsedPlayers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => setCollapsedPlayers({});
  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    players.forEach((p) => {
      next[p.id] = true;
    });
    setCollapsedPlayers(next);
  };

  const getRevealedCount = (player: Player) => {
    return player.cards.filter((c) => c.revealed).length;
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>🪪</span> Табло игроков «Бункер IT»
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Здесь видны все игроки. Содержимое характеристик появляется в реальном времени, когда ведущий открывает карту.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-rose-400' : ''}`} />
                <span>Обновить</span>
              </button>
            )}
            <button
              onClick={expandAll}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              Развернуть всех
            </button>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              Свернуть
            </button>
          </div>
        </div>
      </div>

      {/* Synchronized Round Timer for Players (Read-only) */}
      {timer && (timer.isRunning || (timer.remainingSeconds !== undefined && timer.remainingSeconds < timer.initialSeconds)) && (
        <div className="bg-slate-900/90 border border-amber-800/80 rounded-2xl p-4 shadow-lg">
          <RoundTimer role="player" timer={timer} />
        </div>
      )}

      {/* World Cards */}
      <WorldSection worldCards={world} role="player" />

      {/* Players Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">👥</span>
            <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
              Игроки ({players.length})
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {players.map((player, idx) => {
            const revealed = getRevealedCount(player);
            const total = player.cards.length;
            const isCollapsed = !!collapsedPlayers[player.id];

            return (
              <div
                key={player.id || idx}
                className={`bg-slate-900/90 border rounded-xl overflow-hidden transition-all shadow-sm ${
                  player.isEliminated
                    ? 'border-red-900/50 opacity-75 bg-slate-950/90'
                    : player.inBunker
                    ? 'border-emerald-800/70'
                    : 'border-slate-800'
                }`}
              >
                {/* Accordion Header */}
                <button
                  onClick={() => togglePlayer(player.id)}
                  className="w-full text-left p-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                        player.isEliminated
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                          : player.inBunker
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm sm:text-base truncate">
                          {player.name}
                        </span>
                        {player.isEliminated && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/60 text-[10px] font-bold uppercase flex items-center gap-0.5">
                            <Skull className="w-2.5 h-2.5" />
                            Исключён
                          </span>
                        )}
                        {player.inBunker && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-[10px] font-bold uppercase flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            В бункере
                          </span>
                        )}
                      </div>

                      {/* Active Perk Status Badges */}
                      {player.statuses && player.statuses.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {player.statuses.map((st, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-1.5 py-0.5 rounded-md bg-pink-950/80 border border-pink-700/60 text-pink-300 text-[10px] font-medium"
                            >
                              {st}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-slate-400 mt-0.5">
                        открыто <span className="text-rose-400 font-semibold">{revealed}</span> из{' '}
                        {total} характеристик
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all"
                        style={{ width: `${(revealed / total) * 100}%` }}
                      />
                    </div>
                    {isCollapsed ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Accordion Body: Cards */}
                {!isCollapsed && (
                  <div className="p-3.5 pt-0 border-t border-slate-800/80 mt-1 space-y-2">
                    {player.cards.map((card) => (
                      <PlayerCardItem
                        key={card.id}
                        card={card}
                        role="player"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
