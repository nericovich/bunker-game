import React from 'react';
import { GameSession, Role } from '../types';
import { Vote, AlertCircle, Sparkles, ChevronRight } from 'lucide-react';

interface VotingBannerProps {
  session: GameSession;
  role: Role;
  onOpenVoting: () => void;
}

export function VotingBanner({ session, role, onOpenVoting }: VotingBannerProps) {
  const voting = session.voting;
  if (!voting || !voting.isActive) return null;

  const activePlayers = session.players.filter((p) => !p.isEliminated);
  const totalVotes = Object.keys(voting.votes || {}).length;

  return (
    <div className="bg-gradient-to-r from-rose-950/90 via-slate-900/95 to-rose-950/90 border-y sm:border border-rose-600/60 sm:rounded-2xl p-3.5 sm:p-4 shadow-xl backdrop-blur-md animate-pulse-subtle">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Vote className="w-5 h-5 animate-bounce-subtle" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-rose-400">
                ИДЁТ ГОЛОСОВАНИЕ НА ИСКЛЮЧЕНИЕ
              </span>
              <span className="px-2 py-0.2 rounded bg-rose-900 border border-rose-700 text-rose-200 text-[11px] font-bold">
                Раунд #{voting.roundNumber}
              </span>
            </div>

            <div className="text-xs text-slate-300 font-medium">
              {voting.result ? (
                <span className="text-amber-300">
                  ⚡ Итоги подведены: {voting.result.summaryMessage}
                </span>
              ) : (
                <span>
                  Подано голосов: <b className="text-white">{totalVotes}</b> из {activePlayers.length}.
                  Учитываются перки иммунитета и множители!
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onOpenVoting}
          className="self-start sm:self-auto py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-rose-900/40 transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <span>{voting.result ? 'Посмотреть итоги' : 'Открыть голосование'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
