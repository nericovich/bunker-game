import React, { useState } from 'react';
import { Player, GameSession } from '../types';
import {
  formatPlayerDossier,
  formatAllPlayersDossier,
  copyTextToClipboard,
} from '../utils/cardDistribution';
import {
  X,
  Copy,
  Check,
  Share2,
  Users,
  Send,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface QuickDistributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: GameSession | null;
  initialPlayerId?: string | null;
}

export function QuickDistributeModal({
  isOpen,
  onClose,
  session,
  initialPlayerId,
}: QuickDistributeModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(initialPlayerId || null);

  if (!isOpen || !session) return null;

  const handleCopyPlayer = async (player: Player) => {
    const text = formatPlayerDossier(player, session);
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopiedId(player.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleCopyAll = async () => {
    const text = formatAllPlayersDossier(session.players, session);
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  const handleShare = async (player: Player) => {
    const text = formatPlayerDossier(player, session);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Карты игрока: ${player.name}`,
          text,
        });
      } catch (err) {
        // Fallback to copy
        await handleCopyPlayer(player);
      }
    } else {
      await handleCopyPlayer(player);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center font-bold text-lg">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Быстрая раздача карт</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800/70 text-emerald-400 text-xs font-medium">
                  {session.players.length} игроков
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Скопируйте досье каждого игрока в текстовом формате и отправьте в личные сообщения
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-slate-300 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-rose-400" />
            <span>Готовые текстовые шаблоны для Telegram, Discord и мессенджеров</span>
          </div>

          <button
            onClick={handleCopyAll}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              copiedAll
                ? 'bg-emerald-600 text-white shadow-emerald-950'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950 hover:scale-[1.02]'
            }`}
          >
            {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAll ? 'Все карты скопированы!' : 'Скопировать всех игроков разом'}</span>
          </button>
        </div>

        {/* Players List with Quick Copy */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {session.players.map((player, idx) => {
            const isCopied = copiedId === player.id;
            const isExpanded = expandedPlayerId === player.id;
            const dossierText = formatPlayerDossier(player, session);
            const standardCount = player.cards.filter((c) => !c.label.startsWith('Перк')).length;
            const perksCount = player.cards.filter((c) => c.label.startsWith('Перк')).length;

            return (
              <div
                key={player.id}
                className={`border rounded-xl transition-all overflow-hidden ${
                  isCopied
                    ? 'border-emerald-700 bg-emerald-950/20'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                }`}
              >
                <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-slate-100 text-sm truncate flex items-center gap-2">
                        <span>{player.name}</span>
                        {player.isEliminated && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 border border-rose-800 text-rose-400 font-normal">
                            Исключён
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {standardCount} хар-к • {perksCount} {perksCount === 1 ? 'перк' : perksCount < 5 ? 'перка' : 'перков'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                      className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
                      title={isExpanded ? 'Скрыть текст' : 'Предпросмотр текста'}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isExpanded ? 'Скрыть' : 'Текст'}</span>
                    </button>

                    {'share' in navigator && (
                      <button
                        onClick={() => handleShare(player)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Поделиться через приложение"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleCopyPlayer(player)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-600 text-white shadow-emerald-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Скопировано!' : 'Скопировать карты'}</span>
                    </button>
                  </div>
                </div>

                {/* Expandable text preview */}
                {isExpanded && (
                  <div className="p-3 bg-slate-950 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono text-slate-400">
                        Текст для отправки игроку:
                      </span>
                      <button
                        onClick={() => handleCopyPlayer(player)}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Копировать</span>
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/90 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
                      {dossierText}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            Совет: В Telegram можно отправить сообщение с моноширинным или скрытым текстом (спойлером).
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
