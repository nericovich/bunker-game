import React from 'react';
import { WorldCard, Role } from '../types';
import { Eye, EyeOff, ShieldAlert, Building2, Flame } from 'lucide-react';

interface WorldSectionProps {
  worldCards: WorldCard[];
  role: Role;
  onToggleReveal?: (cardId: string, revealed: boolean) => void;
}

export function WorldSection({ worldCards, role, onToggleReveal }: WorldSectionProps) {
  const getIcon = (id: string) => {
    if (id.includes('apocalypse')) return <Flame className="w-4 h-4 text-rose-400" />;
    if (id.includes('bunker')) return <Building2 className="w-4 h-4 text-blue-400" />;
    return <ShieldAlert className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌍</span>
          <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wide">Мир партии</h2>
        </div>
        {role === 'host' && (
          <span className="text-xs text-slate-400">
            Ведущий может скрывать или открывать карты мира для игроков
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {worldCards.map((card) => {
          const isPlayerHidden = role === 'player' && !card.revealed;

          if (isPlayerHidden) {
            return (
              <div
                key={card.id}
                className="bg-slate-900/60 border border-dashed border-slate-700/80 rounded-xl p-4 flex flex-col justify-between min-h-[140px] transition-all"
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    {getIcon(card.id)}
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {card.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-semibold text-sm mt-3">
                    <EyeOff className="w-4 h-4 text-slate-600" />
                    <span>Закрыто ведущим</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 italic">
                  Информация станет доступна по ходу игры
                </div>
              </div>
            );
          }

          return (
            <div
              key={card.id}
              className="relative bg-slate-900/90 border-l-4 rounded-xl p-4 shadow-md transition-all hover:shadow-lg backdrop-blur-sm"
              style={{ borderLeftColor: card.accent_color }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  {getIcon(card.id)}
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: card.label_color }}
                  >
                    {card.label}
                  </span>
                </div>

                {role === 'host' && onToggleReveal && (
                  <button
                    onClick={() => onToggleReveal(card.id, !card.revealed)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      card.revealed
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                    }`}
                    title="Видимость для игроков"
                  >
                    {card.revealed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{card.revealed ? 'Открыто' : 'Скрыто'}</span>
                  </button>
                )}
              </div>

              <h3 className="text-base font-bold text-white mb-1.5 leading-snug">
                {card.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {card.description}
              </p>

              {role === 'host' && !card.revealed && (
                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Игроки видят эту карту как закрытую</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
