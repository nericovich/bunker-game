import React, { useState, useEffect } from 'react';
import { Card, GameSession, Player } from '../types';
import { getPerkConfig, PerkConfig } from '../utils/perkRules';
import { X, Sparkles, Check, AlertCircle, ArrowRightLeft, UserX, RefreshCw } from 'lucide-react';

interface PerkActionModalProps {
  isOpen: boolean;
  perkCard: Card | null;
  ownerPlayer: Player | null;
  session: GameSession | null;
  onClose: () => void;
  onApplyPerk: (payload: {
    perkId: string;
    action: string;
    targetPlayerId?: string;
    secondPlayerId?: string;
    category?: string;
    statusText?: string;
    cardId?: string;
  }) => Promise<void>;
}

export function PerkActionModal({
  isOpen,
  perkCard,
  ownerPlayer,
  session,
  onClose,
  onApplyPerk,
}: PerkActionModalProps) {
  if (!isOpen || !perkCard || !session) return null;

  const config: PerkConfig = getPerkConfig(perkCard);

  const [targetPlayerId, setTargetPlayerId] = useState<string>(
    config.requiresTarget
      ? (config.actionType === 'reroll_own_card' ? ownerPlayer?.id || '' : session.players[0]?.id || '')
      : ''
  );

  const [secondPlayerId, setSecondPlayerId] = useState<string>(
    session.players.length > 1 ? session.players[1].id : ''
  );

  const [selectedCategory, setSelectedCategory] = useState<string>(
    config.category || 'Факт'
  );

  const [statusText, setStatusText] = useState<string>(
    config.defaultStatus || `✨ Активен перк: ${perkCard.title}`
  );

  const [selectedUsedPerkId, setSelectedUsedPerkId] = useState<string>('');
  const [selectedCardToReveal, setSelectedCardToReveal] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // List of all used perks across all players for undo/cancel perks (Ctrl+Z)
  const usedPerks: Array<{ perk: Card; owner: Player }> = [];
  session.players.forEach((p) => {
    p.cards.forEach((c) => {
      if (c.label.startsWith('Перк') && c.perk_used && c.id !== perkCard.id) {
        usedPerks.push({ perk: c, owner: p });
      }
    });
  });

  // Eliminated players
  const eliminatedPlayers = session.players.filter((p) => p.isEliminated);

  // Target player object
  const targetPlayer = session.players.find((p) => p.id === targetPlayerId);

  // Closed cards of target player (for debug logs / audit / merge)
  const closedCardsOfTarget = targetPlayer?.cards.filter((c) => !c.revealed) || [];

  const handleExecute = async () => {
    setIsSubmitting(true);
    try {
      await onApplyPerk({
        perkId: perkCard.id,
        action: config.actionType,
        targetPlayerId: config.requiresTarget
          ? targetPlayerId
          : config.requiresEliminatedTarget
          ? targetPlayerId
          : ownerPlayer?.id,
        secondPlayerId: config.requiresSecondTarget ? secondPlayerId : undefined,
        category: config.requiresCategory || config.category ? selectedCategory : undefined,
        statusText: config.actionType === 'add_status' || config.actionType === 'add_timer' ? statusText : undefined,
        cardId: selectedCardToReveal || undefined,
      });
      onClose();
    } catch (e) {
      console.error('Error applying perk:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['Профессия', 'Биология', 'Здоровье', 'Хобби', 'Багаж', 'Факт'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-pink-600/30 border border-pink-500/50 flex items-center justify-center text-pink-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-pink-400">
                Применение игрового перка
              </div>
              <h2 className="text-base font-bold text-white">
                {perkCard.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Perk description card */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-pink-900/40 text-slate-300">
            <div className="text-[11px] font-bold text-pink-300 mb-1 flex items-center justify-between">
              <span>Эффект карты:</span>
              {ownerPlayer && (
                <span className="text-slate-400 font-normal">
                  Владелец: <strong className="text-white">{ownerPlayer.name}</strong>
                </span>
              )}
            </div>
            <p className="leading-relaxed">{perkCard.description}</p>
          </div>

          {/* Action explanation */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 text-slate-300 flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-semibold text-white">Игровое действие: </span>
              {config.actionExplanation}
            </div>
          </div>

          {/* Form fields depending on Perk Type */}

          {/* 1. Requires Target Player */}
          {config.requiresTarget && config.actionType !== 'reroll_own_card' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Целевой игрок:
              </label>
              <select
                value={targetPlayerId}
                onChange={(e) => setTargetPlayerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                {session.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === ownerPlayer?.id ? '(Владелец перка)' : ''} {p.isEliminated ? '— Исключён' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 2. Requires Second Target (Swap cards) */}
          {config.requiresSecondTarget && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-pink-400" />
                Второй игрок для обмена картами:
              </label>
              <select
                value={secondPlayerId}
                onChange={(e) => setSecondPlayerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                {session.players
                  .filter((p) => p.id !== targetPlayerId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.id === ownerPlayer?.id ? '(Владелец перка)' : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* 3. Requires Eliminated Target (Revive) */}
          {config.requiresEliminatedTarget && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <UserX className="w-3.5 h-3.5 text-rose-400" />
                Кого вернуть в игру:
              </label>
              {eliminatedPlayers.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
                  Сейчас в партии нет исключённых игроков. Перк можно применить после голосования, когда кто-то выбудет!
                </div>
              ) : (
                <select
                  value={targetPlayerId}
                  onChange={(e) => setTargetPlayerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  <option value="">-- Выберите исключённого игрока --</option>
                  {eliminatedPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Исключён)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 4. Requires Category Selection */}
          {(config.requiresCategory || (!config.category && (config.actionType === 'reroll_target_card' || config.actionType === 'reroll_all_category'))) && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Категория карты:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 5. Reveal specific card selector (Мерж без апрува / Дебаг логи) */}
          {config.actionType === 'reveal_card' && closedCardsOfTarget.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Закрытая карта для вскрытия:
              </label>
              <select
                value={selectedCardToReveal}
                onChange={(e) => setSelectedCardToReveal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="">-- Выберите карту --</option>
                {closedCardsOfTarget.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}: {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 6. Used perk selector (Ctrl+Z) */}
          {config.requiresUsedPerk && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Какой ранее сыгранный перк отменить:
              </label>
              {usedPerks.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 text-xs">
                  Пока никто из других игроков не активировал перки.
                </div>
              ) : (
                <select
                  value={selectedUsedPerkId}
                  onChange={(e) => setSelectedUsedPerkId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  <option value="">-- Выберите сыгранный перк --</option>
                  {usedPerks.map(({ perk, owner }) => (
                    <option key={perk.id} value={perk.id}>
                      {owner.name}: {perk.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 7. Status Text customizer */}
          {config.actionType === 'add_status' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Текст отображаемого статуса / бейджа:
              </label>
              <input
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Отмена
          </button>

          <button
            onClick={handleExecute}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{config.actionButtonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
