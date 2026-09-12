import React, { useState } from 'react';
import { Card, GameSession, Player } from '../types';
import { WorldSection } from './WorldSection';
import { PlayerCardItem } from './PlayerCardItem';
import { PerkActionModal } from './PerkActionModal';
import { RoundTimer } from './RoundTimer';
import { QuickDistributeModal } from './QuickDistributeModal';
import { formatPlayerDossier, copyTextToClipboard } from '../utils/cardDistribution';
import {
  RotateCw,
  Trash2,
  LogOut,
  Sliders,
  CheckCheck,
  EyeOff,
  UserCheck,
  Skull,
  ShieldCheck,
  Edit2,
  Check,
  Sparkles,
  Layers,
  Info,
  UserPlus,
  X,
  Clock,
  Copy,
  Send,
  FileText,
} from 'lucide-react';

interface HostPanelProps {
  session: GameSession | null;
  onGenerate: (playerCount: number, perksPerPlayer: number) => Promise<void>;
  onClear: () => Promise<void>;
  onLogout: () => void;
  onToggleCard: (cardId: string, revealed?: boolean, perkUsed?: boolean) => Promise<void>;
  onPlayerCardsAll: (playerId: string, revealed: boolean) => Promise<void>;
  onUpdateSession: (updatedSession: GameSession) => Promise<void>;
  onUpdateTimer?: (
    action: 'start' | 'pause' | 'reset' | 'set_time',
    payload?: { initialSeconds?: number; remainingSeconds?: number }
  ) => Promise<void>;
}

export function HostPanel({
  session,
  onGenerate,
  onClear,
  onLogout,
  onToggleCard,
  onPlayerCardsAll,
  onUpdateSession,
  onUpdateTimer,
}: HostPanelProps) {
  const [playerCount, setPlayerCount] = useState<number>(session?.playerCount || 6);
  const [perksPerPlayer, setPerksPerPlayer] = useState<number>(session?.perksPerPlayer ?? 2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activePerkModal, setActivePerkModal] = useState<{ card: Card; owner: Player } | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [isRemovingPlayerId, setIsRemovingPlayerId] = useState<string | null>(null);

  // Quick card distribution state
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [distributeInitialPlayerId, setDistributeInitialPlayerId] = useState<string | null>(null);
  const [copiedPlayerId, setCopiedPlayerId] = useState<string | null>(null);

  const handleCopyPlayerDossier = async (player: Player) => {
    const text = formatPlayerDossier(player, session);
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopiedPlayerId(player.id);
      setActionNotice(`Карты игрока «${player.name}» скопированы в буфер обмена!`);
      setTimeout(() => setCopiedPlayerId(null), 2500);
    }
  };

  const handleOpenDistribute = (playerId?: string) => {
    setDistributeInitialPlayerId(playerId || null);
    setIsDistributeModalOpen(true);
  };

  const handleAddPlayer = async () => {
    if (!session) return;
    try {
      setIsAddingPlayer(true);
      const res = await fetch('/api/players/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Не удалось добавить игрока');
      }
      const data = await res.json();
      if (data.session) {
        await onUpdateSession(data.session);
        setActionNotice(`Игрок «${data.newPlayer?.name || 'Новый игрок'}» успешно добавлен с уникальным набором карт!`);
        setNewPlayerName('');
        setIsAddPlayerModalOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      setActionNotice(`Ошибка: ${err.message || 'Не удалось добавить игрока'}`);
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleRemovePlayer = async (player: Player) => {
    if (!session) return;
    if (!window.confirm(`Удалить игрока «${player.name}» из партии? Его карты освободятся в колоду.`)) {
      return;
    }
    try {
      setIsRemovingPlayerId(player.id);
      const res = await fetch('/api/players/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Не удалось удалить игрока');
      }
      const data = await res.json();
      if (data.session) {
        await onUpdateSession(data.session);
        setActionNotice(`Игрок «${player.name}» удалён из партии.`);
      }
    } catch (err: any) {
      console.error(err);
      setActionNotice(`Ошибка: ${err.message || 'Не удалось удалить игрока'}`);
    } finally {
      setIsRemovingPlayerId(null);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    await onGenerate(playerCount, perksPerPlayer);
    setIsGenerating(false);
  };

  const startRename = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditingName(player.name);
  };

  const saveRename = async (playerId: string) => {
    if (!session || !editingName.trim()) return;
    const nextSession = {
      ...session,
      players: session.players.map((p) =>
        p.id === playerId ? { ...p, name: editingName.trim() } : p
      ),
    };
    await onUpdateSession(nextSession);
    setEditingPlayerId(null);
  };

  const toggleEliminated = async (player: Player) => {
    if (!session) return;
    const nextSession = {
      ...session,
      players: session.players.map((p) =>
        p.id === player.id ? { ...p, isEliminated: !p.isEliminated } : p
      ),
    };
    await onUpdateSession(nextSession);
  };

  const toggleInBunker = async (player: Player) => {
    if (!session) return;
    const nextSession = {
      ...session,
      players: session.players.map((p) =>
        p.id === player.id ? { ...p, inBunker: !p.inBunker } : p
      ),
    };
    await onUpdateSession(nextSession);
  };

  // Round-by-round bulk category reveal helper
  const revealCategoryForAll = async (category: string) => {
    if (!session) return;
    const nextSession = {
      ...session,
      players: session.players.map((p) => ({
        ...p,
        cards: p.cards.map((c) =>
          c.label === category ? { ...c, revealed: true } : c
        ),
      })),
    };
    await onUpdateSession(nextSession);
  };

  // Handle perk action execution
  const handleExecutePerkAction = async (payload: {
    perkId: string;
    action: string;
    targetPlayerId?: string;
    secondPlayerId?: string;
    category?: string;
    statusText?: string;
    cardId?: string;
  }) => {
    try {
      const res = await fetch('/api/perks/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.session) {
        await onUpdateSession(data.session);
      }
      if (data.actionLog) {
        setActionNotice(data.actionLog);
        setTimeout(() => setActionNotice(null), 6000);
      }
    } catch (e) {
      console.error('Failed to apply perk:', e);
    }
  };

  const handleRevokePerk = async (perkId: string) => {
    try {
      const res = await fetch('/api/perks/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perkId }),
      });
      const data = await res.json();
      if (data.session) {
        await onUpdateSession(data.session);
      }
      setActionNotice('Действие перка отозвано');
      setTimeout(() => setActionNotice(null), 3500);
    } catch (e) {
      console.error('Failed to revoke perk:', e);
    }
  };

  const categories = ['Профессия', 'Биология', 'Здоровье', 'Хобби', 'Багаж', 'Факт'];

  return (
    <div className="space-y-6">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-pink-950/90 border border-pink-700/80 text-pink-200 text-xs sm:text-sm font-medium flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-pink-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/80 text-[10px] font-mono uppercase tracking-widest font-bold">
                Game Master Control
              </span>
              <span className="text-xs text-slate-400">
                Пароль активен
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
              <span>🤖</span> Панель ведущего «Бункер IT»
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Система выдаёт карты из IT-колоды (300 карт). Ведущий управляет раскрытием характеристик на общем табло по ходу раундов.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти из режима ведущего</span>
            </button>
          </div>
        </div>

        {/* Session Settings Controls */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Игроков (2 - 30): <span className="text-rose-400 font-mono text-sm">{playerCount}</span>
            </label>
            <input
              type="range"
              min={2}
              max={30}
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Перков на игрока (0 - 5): <span className="text-pink-400 font-mono text-sm">{perksPerPlayer}</span>
            </label>
            <input
              type="range"
              min={0}
              max={5}
              value={perksPerPlayer}
              onChange={(e) => setPerksPerPlayer(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{session ? 'Перераздать партию' : 'Сгенерировать партию'}</span>
            </button>
          </div>

          <div>
            {session && (
              <button
                onClick={onClear}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/70 hover:text-rose-300 text-slate-400 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700/60"
              >
                <Trash2 className="w-4 h-4" />
                <span>Очистить стол</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {!session ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <Sliders className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300 mb-1">Партия ещё не создана</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Выберите количество игроков и перков в блоке сверху и нажмите кнопку «Сгенерировать партию».
          </p>
          <button
            onClick={handleGenerate}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow cursor-pointer inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Начать партию на {playerCount} игроков</span>
          </button>
        </div>
      ) : (
        <>
          {/* Host Timer Controls (exclusive to Host) */}
          <div className="bg-slate-900/90 border border-amber-900/60 rounded-2xl p-4 shadow-lg backdrop-blur-md">
            <RoundTimer
              role="host"
              timer={session.timer}
              onUpdateTimer={onUpdateTimer}
            />
          </div>

          {/* World Section */}
          <WorldSection
            worldCards={session.world}
            role="host"
            onToggleReveal={(cardId, rev) => onToggleCard(cardId, rev)}
          />

          {/* Round Category Reveal Shortcuts */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Раунды игры — открыть категорию сразу у всех игроков:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => revealCategoryForAll(cat)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700 hover:border-rose-500/50 cursor-pointer"
                >
                  Открыть {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Players Management */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🪪</span>
                <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
                  Карты игроков ({session.players.length})
                </h2>
                <span className="text-xs text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 hidden sm:inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Уникальные характеристики
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleOpenDistribute()}
                  className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-800/70 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer hover:scale-[1.02]"
                  title="Быстрая раздача карт текстом для Telegram / Discord"
                >
                  <Copy className="w-4 h-4 text-rose-400" />
                  <span>Быстрая раздача карт (Текст)</span>
                </button>

                <button
                  onClick={() => setIsAddPlayerModalOpen(true)}
                  className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Добавить игрока</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {session.players.map((player, idx) => {
                const revealed = player.cards.filter((c) => c.revealed).length;
                const total = player.cards.length;

                return (
                  <div
                    key={player.id}
                    className={`bg-slate-900/90 border rounded-xl overflow-hidden transition-all shadow-md ${
                      player.isEliminated
                        ? 'border-red-900/60 bg-slate-950/90'
                        : player.inBunker
                        ? 'border-emerald-700/60'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Player Header with Controls */}
                    <div className="p-4 bg-slate-950/60 border-b border-slate-800/80">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              player.isEliminated
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : player.inBunker
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {idx + 1}
                          </div>

                          {editingPlayerId === player.id ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                autoFocus
                                className="px-2 py-1 bg-slate-900 border border-rose-500 rounded text-sm text-white focus:outline-none w-full max-w-[200px]"
                              />
                              <button
                                onClick={() => saveRename(player.id)}
                                className="p-1 rounded bg-rose-600 text-white hover:bg-rose-500"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 truncate">
                              <h3 className="font-bold text-base text-white truncate">
                                {player.name}
                              </h3>
                              <button
                                onClick={() => startRename(player)}
                                className="text-slate-500 hover:text-slate-300 p-0.5"
                                title="Переименовать игрока"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 shrink-0 font-medium">
                          <span className="text-rose-400 font-bold">{revealed}</span> из {total} открыто
                        </div>
                      </div>

                      {/* Active Statuses from Perks */}
                      {player.statuses && player.statuses.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {player.statuses.map((st, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2 py-0.5 rounded bg-pink-950/90 border border-pink-700/80 text-pink-300 text-[11px] font-semibold"
                            >
                              {st}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Status / Voting action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onPlayerCardsAll(player.id, true)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <CheckCheck className="w-3 h-3" />
                            <span>Открыть все</span>
                          </button>
                          <button
                            onClick={() => onPlayerCardsAll(player.id, false)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <EyeOff className="w-3 h-3" />
                            <span>Закрыть все</span>
                          </button>
                          <button
                            onClick={() => handleCopyPlayerDossier(player)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              copiedPlayerId === player.id
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-900/50'
                            }`}
                            title="Скопировать карты игрока в буфер обмена для быстрой отправки в чат"
                          >
                            {copiedPlayerId === player.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-rose-400" />
                            )}
                            <span>{copiedPlayerId === player.id ? 'Скопировано!' : 'Раздать карты'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleInBunker(player)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                              player.inBunker
                                ? 'bg-emerald-900 text-emerald-200 border border-emerald-700'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>{player.inBunker ? 'В бункере ✓' : 'В бункер'}</span>
                          </button>

                          <button
                            onClick={() => toggleEliminated(player)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                              player.isEliminated
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                            }`}
                          >
                            <Skull className="w-3 h-3" />
                            <span>{player.isEliminated ? 'Исключён ✕' : 'Исключить'}</span>
                          </button>

                          <button
                            onClick={() => handleRemovePlayer(player)}
                            disabled={isRemovingPlayerId === player.id}
                            className="px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors bg-slate-800 hover:bg-rose-950/70 text-slate-400 hover:text-rose-300 border border-slate-700/50"
                            title="Удалить игрока из партии"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Удалить</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Player Cards List */}
                    <div className="p-3.5 space-y-2">
                      {player.cards.map((card) => (
                        <PlayerCardItem
                          key={card.id}
                          card={card}
                          role="host"
                          onToggleReveal={(cardId, rev) => onToggleCard(cardId, rev)}
                          onTogglePerk={(cardId, used) => {
                            if (!used) {
                              handleRevokePerk(cardId);
                            } else {
                              setActivePerkModal({ card, owner: player });
                            }
                          }}
                          onOpenPerkModal={(c) => setActivePerkModal({ card: c, owner: player })}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Interactive Perk Execution Modal */}
      {activePerkModal && (
        <PerkActionModal
          isOpen={!!activePerkModal}
          perkCard={activePerkModal.card}
          ownerPlayer={activePerkModal.owner}
          session={session}
          onClose={() => setActivePerkModal(null)}
          onApplyPerk={handleExecutePerkAction}
        />
      )}

      {/* Add Player Mid-Game Modal */}
      {isAddPlayerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Добавить нового игрока</h3>
                  <p className="text-xs text-slate-400">По ходу текущей партии</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddPlayerModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Имя нового участника:
                </label>
                <input
                  type="text"
                  placeholder={`Игрок ${(session?.players?.length || 0) + 1}`}
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Гарантия уникальности карт</span>
                </div>
                <p>
                  Игроку будут автоматически выданы 6 базовых характеристик (Профессия, Биология, Здоровье, Хобби, Багаж, Факт) и {session?.perksPerPlayer ?? 2} перка. Ни одна из выданных карт не будет повторять характеристики уже находящихся за столом участников!
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddPlayerModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleAddPlayer}
                disabled={isAddingPlayer}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isAddingPlayer ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Вытягиваем карты...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Добавить за стол</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Cards Distribution Modal */}
      <QuickDistributeModal
        isOpen={isDistributeModalOpen}
        onClose={() => setIsDistributeModalOpen(false)}
        session={session}
        initialPlayerId={distributeInitialPlayerId}
      />
    </div>
  );
}
