import React, { useState, useEffect } from 'react';
import { GameSession, Player, Role } from '../types';
import {
  getPlayerVoteWeight,
  getPlayerImmunity,
  hasGoldenParachute,
} from '../utils/votingRules';
import {
  Vote,
  ShieldAlert,
  AlertTriangle,
  UserX,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  X,
  Award,
  ChevronRight,
  Flame,
} from 'lucide-react';

interface VotingModalProps {
  isOpen: boolean;
  role: Role;
  session: GameSession;
  onClose: () => void;
  onUpdateSession: (nextSession: GameSession) => Promise<void>;
}

export function VotingModal({
  isOpen,
  role,
  session,
  onClose,
  onUpdateSession,
}: VotingModalProps) {
  const voting = session.voting;
  const [localVotes, setLocalVotes] = useState<Record<string, string>>({});
  const [selectedVoterId, setSelectedVoterId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (voting?.votes) {
      setLocalVotes({ ...voting.votes });
    }
  }, [voting?.votes]);

  if (!isOpen || !voting) return null;

  const activePlayers = session.players.filter((p) => !p.isEliminated);
  const totalEligibleVoters = activePlayers.filter(
    (p) => getPlayerVoteWeight(p).weight > 0
  ).length;
  const currentVotesCount = Object.keys(localVotes).length;

  const handleVoteSelect = (voterId: string, candidateId: string) => {
    setLocalVotes((prev) => {
      const next = { ...prev };
      if (candidateId === '') {
        delete next[voterId];
      } else {
        next[voterId] = candidateId;
      }
      return next;
    });
  };

  const handleSaveVotes = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/voting/bulk-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes: localVotes }),
      });
      const data = await res.json();
      if (data.session) {
        await onUpdateSession(data.session);
        setStatusMessage('Голоса сохранены');
        setTimeout(() => setStatusMessage(null), 2500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTally = async () => {
    setIsSubmitting(true);
    try {
      // First save all current local votes
      await fetch('/api/voting/bulk-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes: localVotes }),
      });

      // Then tally
      const res = await fetch('/api/voting/tally', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.session) {
        await onUpdateSession(data.session);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyElimination = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/voting/apply-elimination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.session) {
        await onUpdateSession(data.session);
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelVoting = async () => {
    if (!confirm('Отменить текущее голосование и сбросить поданные голоса?')) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/voting/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.session) {
        await onUpdateSession(data.session);
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 shrink-0">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Голосование на исключение из бункера
                </h3>
                <span className="px-2 py-0.5 rounded bg-rose-900/80 border border-rose-700 text-rose-200 text-xs font-mono font-bold">
                  Раунд #{voting.roundNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                С учётом иммунитетов, множителей голосов и спасательных перков
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Perk Impact Notice Banner */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Действующие эффекты перков в этом раунде:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {activePlayers.map((p) => {
                const { weight, breakdown } = getPlayerVoteWeight(p);
                const { isImmune, reason } = getPlayerImmunity(p);
                const hasParachute = hasGoldenParachute(p);

                if (weight === 1 && !isImmune && !hasParachute) return null;

                return (
                  <div
                    key={p.id}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2"
                  >
                    <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px] shrink-0 text-slate-300">
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-200 truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-400 space-y-0.5 mt-0.5">
                        {isImmune && (
                          <div className="text-emerald-400 font-medium flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 shrink-0" />
                            <span className="truncate">{reason}</span>
                          </div>
                        )}
                        {hasParachute && (
                          <div className="text-amber-400 font-medium">
                            🪂 Золотой парашют (спасёт при большинстве)
                          </div>
                        )}
                        {weight !== 1 && (
                          <div className={weight === 0 ? 'text-rose-400' : 'text-pink-300'}>
                            {breakdown.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Voting Results View (If Tallied) */}
          {voting.result && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-400" />
                  <h4 className="font-bold text-white text-base">Итоги голосования</h4>
                </div>
                {voting.result.eliminatedPlayerId ? (
                  <span className="px-2.5 py-1 rounded-full bg-rose-900 border border-rose-700 text-rose-200 text-xs font-bold uppercase">
                    Кандидат определён
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-amber-900 border border-amber-700 text-amber-200 text-xs font-bold uppercase">
                    Решение не принято
                  </span>
                )}
              </div>

              {/* Summary message */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-sm font-medium text-slate-200 leading-relaxed">
                {voting.result.summaryMessage}
              </div>

              {/* Vote tallies per candidate */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Распределение голосов:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(voting.result.candidateVotes)
                    .sort(([, a], [, b]) => b - a)
                    .map(([candId, count]) => {
                      const cand = session.players.find((p) => p.id === candId);
                      if (!cand) return null;
                      const isEliminated = voting.result?.eliminatedPlayerId === candId;
                      const isSaved = voting.result?.goldenParachuteSavedId === candId;

                      return (
                        <div
                          key={candId}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                            isEliminated
                              ? 'bg-rose-950/80 border-rose-700 text-white font-bold'
                              : isSaved
                              ? 'bg-amber-950/80 border-amber-700 text-amber-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate">{cand.name}</span>
                            {isEliminated && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-900 text-rose-200 text-[10px] uppercase font-bold">
                                Выбывает
                              </span>
                            )}
                            {isSaved && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-900 text-amber-200 text-[10px] uppercase font-bold">
                                Спасён
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-mono font-bold shrink-0">
                            {count} {count === 1 ? 'голос' : count < 5 ? 'голоса' : 'голосов'}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Host Final Actions */}
              {role === 'host' && (
                <div className="pt-3 border-t border-rose-900/60 flex flex-wrap items-center justify-between gap-2">
                  {voting.result.eliminatedPlayerId ? (
                    <button
                      onClick={handleApplyElimination}
                      disabled={isSubmitting}
                      className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                      <UserX className="w-4 h-4" />
                      <span>
                        Исключить игрока «{voting.result.eliminatedPlayerName}» и завершить
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={handleCancelVoting}
                      disabled={isSubmitting}
                      className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Объявить переголосование</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      // Allow re-editing votes
                      if (voting) {
                        const resetResultSession = {
                          ...session,
                          voting: { ...voting, result: null, isConcluded: false },
                        };
                        onUpdateSession(resetResultSession);
                      }
                    }}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Изменить голоса
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Voting Ballots Grid */}
          {(!voting.result || role === 'host') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Подача голосов ({currentVotesCount} из {totalEligibleVoters} проголосовали)
                </div>
                {role === 'host' && (
                  <button
                    onClick={handleSaveVotes}
                    disabled={isSubmitting}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    Сохранить промежуточные
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activePlayers.map((voter) => {
                  const { weight, breakdown } = getPlayerVoteWeight(voter);
                  const isDeprived = weight <= 0;
                  const chosenCandidateId = localVotes[voter.id] || '';

                  return (
                    <div
                      key={voter.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isDeprived
                          ? 'bg-slate-950/60 border-slate-900 opacity-60'
                          : chosenCandidateId
                          ? 'bg-slate-900/90 border-slate-700'
                          : 'bg-slate-900/50 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-slate-100 text-sm truncate">
                            {voter.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isDeprived
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : weight > 1
                                ? 'bg-pink-950 text-pink-300 border border-pink-700'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            Вес: {weight}
                          </span>
                        </div>

                        {chosenCandidateId && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </div>

                      {/* Candidate selector */}
                      {isDeprived ? (
                        <div className="text-xs text-rose-400/90 italic flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Лишён права голоса в этом раунде перком</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <select
                            value={chosenCandidateId}
                            onChange={(e) => handleVoteSelect(voter.id, e.target.value)}
                            disabled={role !== 'host'}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                          >
                            <option value="">-- Выберите кандидата на выбывание --</option>
                            {activePlayers.map((candidate) => {
                              const { isImmune, reason } = getPlayerImmunity(candidate);
                              const isSelf = candidate.id === voter.id;

                              return (
                                <option
                                  key={candidate.id}
                                  value={candidate.id}
                                  disabled={isImmune}
                                >
                                  {candidate.name} {isSelf ? '(Себя)' : ''}{' '}
                                  {isImmune ? `[${reason}]` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {statusMessage && (
              <span className="text-emerald-400 font-semibold">{statusMessage}</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {role === 'host' && (
              <>
                <button
                  onClick={handleCancelVoting}
                  disabled={isSubmitting}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Отменить голосование
                </button>

                <button
                  onClick={handleTally}
                  disabled={isSubmitting || currentVotesCount === 0}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Vote className="w-4 h-4" />
                  <span>Подвести итоги</span>
                </button>
              </>
            )}

            {role !== 'host' && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Закрыть
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
