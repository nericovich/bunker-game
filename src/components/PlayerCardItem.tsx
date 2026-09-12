import React, { useState } from 'react';
import { Card, CARD_COLORS, isPerkApplicable, Role } from '../types';
import { Check, RotateCcw, AlertTriangle, Eye, EyeOff, Sparkles, Copy } from 'lucide-react';
import { formatSingleCard, copyTextToClipboard } from '../utils/cardDistribution';

interface PlayerCardItemProps {
  key?: React.Key;
  card: Card;
  role: Role;
  onToggleReveal?: (cardId: string, revealed: boolean) => void;
  onTogglePerk?: (cardId: string, perkUsed: boolean) => void;
  onOpenPerkModal?: (card: Card) => void;
}

export function PlayerCardItem({
  card,
  role,
  onToggleReveal,
  onTogglePerk,
  onOpenPerkModal,
}: PlayerCardItemProps) {
  const [isCopied, setIsCopied] = useState(false);
  const isPerk = card.label.startsWith('Перк');
  const baseCategory = isPerk ? 'Перк' : card.label;
  const categoryColor = CARD_COLORS[baseCategory] || '#475569';
  const canApplyAuto = isPerkApplicable(card);

  const handleCopy = async () => {
    const text = formatSingleCard(card);
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Player view and hidden
  if (role === 'player' && !card.revealed) {
    return (
      <div className="bg-slate-900/50 border border-dashed border-slate-700/80 rounded-lg p-2.5 flex items-center justify-between transition-all hover:bg-slate-900/70">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white"
            style={{ backgroundColor: categoryColor }}
          >
            {card.label}
          </span>
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <EyeOff className="w-3 h-3 text-slate-500" />
            Закрыто ведущим
          </span>
        </div>
        <div className="w-2 h-2 rounded-full bg-slate-700" />
      </div>
    );
  }

  // Revealed card or Host View
  return (
    <div
      className={`rounded-lg p-3 transition-all ${
        card.revealed
          ? 'bg-slate-900/90 border border-slate-700/80 shadow-sm'
          : 'bg-slate-950/70 border border-slate-800 border-dashed opacity-85'
      } ${isPerk ? 'border-r-4' : ''}`}
      style={isPerk ? { borderRightColor: '#db2777' } : {}}
    >
      {/* Top Header: Badge + Host Actions */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white"
            style={{ backgroundColor: categoryColor }}
          >
            {card.label}
          </span>

          {isPerk && (
            <span className="text-[10px] text-pink-400 font-semibold flex items-center gap-0.5">
              <Sparkles className="w-3 h-3" />
              Перк
            </span>
          )}
        </div>

        {/* Host Actions: Copy + Reveal Toggle */}
        {role === 'host' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all ${
                isCopied
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Скопировать эту карту в текстовом формате"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{isCopied ? 'Скопировано!' : 'Копия'}</span>
            </button>

            {onToggleReveal && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={card.revealed}
                  onChange={(e) => onToggleReveal(card.id, e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-rose-600 focus:ring-rose-500 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span
                  className={`text-[11px] font-semibold ${
                    card.revealed ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {card.revealed ? 'Открыто' : 'Закрыто'}
                </span>
              </label>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <div className="text-sm font-bold text-slate-100 mb-1 leading-snug">
        {card.title}
      </div>

      {/* Description */}
      <div className="text-xs text-slate-300 leading-relaxed">
        {card.description}
      </div>

      {/* Perk Actions & Statuses */}
      {isPerk && (
        <div className="mt-2.5 pt-2 border-t border-slate-800">
          {card.perk_used ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>Перк применён</span>
              </div>

              {role === 'host' && onTogglePerk && (
                <button
                  onClick={() => onTogglePerk(card.id, false)}
                  className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Отозвать</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {role === 'host' && (
                <div>
                  {!card.revealed ? (
                    <div className="text-[11px] text-slate-500 italic">
                      Перк будет доступен для применения после открытия.
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (onOpenPerkModal) {
                          onOpenPerkModal(card);
                        } else if (onTogglePerk) {
                          onTogglePerk(card.id, true);
                        }
                      }}
                      className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Применить эффект перка</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
