import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameSession, Role } from './types';
import { Header } from './components/Header';
import { PlayerBoard } from './components/PlayerBoard';
import { HostPanel } from './components/HostPanel';
import { HostLogin } from './components/HostLogin';
import { DeckViewerModal } from './components/DeckViewerModal';
import { GameRulesModal } from './components/GameRulesModal';
import { RoundTimer } from './components/RoundTimer';
import { VotingBanner } from './components/VotingBanner';
import { VotingModal } from './components/VotingModal';
import { BookCheck, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [role, setRole] = useState<Role>('player');
  const [isHostAuthenticated, setIsHostAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('bunker_gm_auth') === 'true';
  });

  const [session, setSession] = useState<GameSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [showDeckModal, setShowDeckModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showTimer, setShowTimer] = useState<boolean>(false);
  const [isVotingModalOpen, setIsVotingModalOpen] = useState<boolean>(false);

  const lastGenIdRef = useRef<number | null>(null);

  // Fetch session
  const fetchSession = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch('/api/session');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSession(data.session);
      lastGenIdRef.current = data.session?.generation_id || null;
      setError(null);
    } catch (err: any) {
      console.warn('Failed to fetch session', err);
      if (isManual) setError('Не удалось связаться с сервером партии');
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Periodic polling for player & host sync
  useEffect(() => {
    const interval = setInterval(() => {
      // Background poll
      fetch('/api/session')
        .then((res) => res.json())
        .then((data) => {
          setSession((prev) => {
            // Only update if changed
            if (JSON.stringify(prev) !== JSON.stringify(data.session)) {
              return data.session;
            }
            return prev;
          });
        })
        .catch(() => {});
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Host Login
  const handleHostLogin = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/gm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsHostAuthenticated(true);
        sessionStorage.setItem('bunker_gm_auth', 'true');
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleHostLogout = () => {
    setIsHostAuthenticated(false);
    sessionStorage.removeItem('bunker_gm_auth');
    setRole('player');
  };

  // Generate session
  const handleGenerateSession = async (playerCount: number, perksPerPlayer: number) => {
    try {
      setIsRefreshing(true);
      setError(null);
      const res = await fetch('/api/session/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerCount, perksPerPlayer }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
        setError(null);
      } else {
        throw new Error('Сервер не вернул данные партии');
      }
    } catch (e: any) {
      console.error(e);
      setError(`Ошибка при генерации партии: ${e?.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Clear session
  const handleClearSession = async () => {
    try {
      setIsRefreshing(true);
      await fetch('/api/session/clear', { method: 'POST' });
      setSession(null);
    } catch (e) {
      console.error(e);
      setError('Ошибка при очистке стола');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle card reveal or perk
  const handleToggleCard = async (cardId: string, revealed?: boolean, perkUsed?: boolean) => {
    // Optimistic local update
    setSession((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      // Check world
      updated.world = updated.world.map((w) =>
        w.id === cardId ? { ...w, revealed: revealed ?? w.revealed } : w
      );
      // Check players
      updated.players = updated.players.map((p) => ({
        ...p,
        cards: p.cards.map((c) => {
          if (c.id === cardId) {
            return {
              ...c,
              revealed: revealed !== undefined ? revealed : c.revealed,
              perk_used: perkUsed !== undefined ? perkUsed : c.perk_used,
            };
          }
          return c;
        }),
      }));
      return updated;
    });

    try {
      const res = await fetch('/api/session/toggle-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, revealed, perkUsed }),
      });
      const data = await res.json();
      if (data.session) setSession(data.session);
    } catch (e) {
      console.error('Failed to toggle card', e);
      fetchSession();
    }
  };

  // Player cards all reveal/hide
  const handlePlayerCardsAll = async (playerId: string, revealed: boolean) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                cards: p.cards.map((c) => ({ ...c, revealed })),
              }
            : p
        ),
      };
    });

    try {
      const res = await fetch('/api/session/player-cards-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, revealed }),
      });
      const data = await res.json();
      if (data.session) setSession(data.session);
    } catch (e) {
      console.error(e);
      fetchSession();
    }
  };

  // Update whole session (e.g. rename player, eliminate player)
  const handleUpdateSession = async (updatedSession: GameSession) => {
    setSession(updatedSession);
    try {
      const res = await fetch('/api/session/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: updatedSession }),
      });
      const data = await res.json();
      if (data.session) setSession(data.session);
    } catch (e) {
      console.error('Failed to update session', e);
      fetchSession();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white">
      {/* Top Navbar */}
      <Header
        role={role}
        onSelectRole={(r) => setRole(r)}
        onOpenDeck={() => setShowDeckModal(true)}
        onToggleTimer={() => setShowTimer(!showTimer)}
        showTimer={showTimer}
        onRefresh={() => fetchSession(true)}
        isRefreshing={isRefreshing}
        generationId={session?.generation_id}
      />

      {/* Floating / Docked Timer Widget */}
      {showTimer && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-3">
          <div className="max-w-md ml-auto">
            <RoundTimer />
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Active Voting Banner */}
        {session && session.voting?.isActive && (
          <div className="mb-6">
            <VotingBanner
              session={session}
              role={role}
              onOpenVoting={() => setIsVotingModalOpen(true)}
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Подключение к бункеру...</p>
          </div>
        ) : role === 'host' ? (
          !isHostAuthenticated ? (
            <HostLogin
              onLogin={handleHostLogin}
              onCancel={() => setRole('player')}
            />
          ) : (
            <HostPanel
              session={session}
              onGenerate={handleGenerateSession}
              onClear={handleClearSession}
              onLogout={handleHostLogout}
              onToggleCard={handleToggleCard}
              onPlayerCardsAll={handlePlayerCardsAll}
              onUpdateSession={handleUpdateSession}
            />
          )
        ) : (
          /* Player View */
          !session ? (
            <div className="max-w-lg mx-auto my-12 p-8 bg-slate-900/80 border border-slate-800 rounded-2xl text-center shadow-xl backdrop-blur-md">
              <div className="w-12 h-12 rounded-xl bg-slate-800 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Партия ещё не создана</h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
                Подождите, пока ведущий сгенерирует стол с колодой IT-карт. Если вы ведущий, перейдите в режим ведущего для запуска игры.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  onClick={() => setRole('host')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                >
                  🔐 Войти как ведущий
                </button>
                <button
                  onClick={() => setShowRulesModal(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BookCheck className="w-4 h-4" />
                  <span>Правила игры</span>
                </button>
              </div>
            </div>
          ) : (
            <PlayerBoard
              world={session.world}
              players={session.players}
              onRefresh={() => fetchSession(true)}
              isRefreshing={isRefreshing}
            />
          )
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 py-4 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Настольная игра «Бункер IT» · Версия на 300 карт</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRulesModal(true)}
              className="text-slate-500 hover:text-slate-400 underline transition-colors"
            >
              Правила
            </button>
            <button
              onClick={() => setShowDeckModal(true)}
              className="text-slate-500 hover:text-slate-400 underline transition-colors"
            >
              Карты
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {session && (
        <VotingModal
          isOpen={isVotingModalOpen}
          role={role}
          session={session}
          onClose={() => setIsVotingModalOpen(false)}
          onUpdateSession={handleUpdateSession}
        />
      )}

      <DeckViewerModal
        isOpen={showDeckModal}
        onClose={() => setShowDeckModal(false)}
      />

      <GameRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
}
