import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const appDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
const PORT = Number(process.env.PORT) || 3000;
const dataDir = process.env.DATA_DIR || appDir;
const STATE_FILE = path.join(dataDir, '.bunker_session.json');
const CARDS_FILE = path.join(appDir, 'src', 'data', 'cards.json');
const GM_PASSWORD = process.env.BUNKER_GM_PASSWORD || 'YA2077';

// Load cards deck
let cardsDeck: Record<string, Array<{ category: string; title: string; description: string }>> = {};
try {
  if (fs.existsSync(CARDS_FILE)) {
    const raw = fs.readFileSync(CARDS_FILE, 'utf-8');
    cardsDeck = JSON.parse(raw);
    console.log('[Bunker IT] Loaded cards database with', Object.keys(cardsDeck).length, 'categories');
  } else {
    console.warn('[Bunker IT] cards.json not found at', CARDS_FILE);
  }
} catch (e) {
  console.error('[Bunker IT] Failed to load cards database:', e);
}

// Helper to load session
function loadSession() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed?.cleared) return null;
      return parsed;
    } else {
      // Auto-initialize an initial game session so preview works immediately
      const initial = generateGameSession(6, 2);
      if (initial.players[0]?.cards[0]) initial.players[0].cards[0].revealed = true;
      if (initial.players[1]?.cards[0]) initial.players[1].cards[0].revealed = true;
      saveSession(initial);
      return initial;
    }
  } catch (e) {
    console.error('[Bunker IT] Failed to read saved session:', e);
  }
  return null;
}

// Helper to save session
function saveSession(session: any) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(session, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Bunker IT] Failed to write session to disk:', e);
  }
}

// Helper to shuffle & draw
function drawRandomSample<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  if (count <= shuffled.length) {
    return shuffled.slice(0, count);
  }
  // If pool smaller than count, fill with random picks
  const result: T[] = [...shuffled];
  while (result.length < count) {
    result.push(shuffled[Math.floor(Math.random() * shuffled.length)]);
  }
  return result;
}

function getRandomCard(category: string) {
  const pool = cardsDeck[category] || [];
  if (!pool.length) {
    return { title: 'Неизвестно', description: '' };
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateGameSession(playerCount: number, perksPerPlayer: number) {
  const playerCategories = ['Профессия', 'Биология', 'Здоровье', 'Хобби', 'Багаж', 'Факт'];
  const genId = Math.floor(100000 + Math.random() * 900000);

  const apocalypseCard = getRandomCard('Апокалипсис');
  const bunkerCard = getRandomCard('Бункер');
  const threatCard = getRandomCard('Угроза');

  const session = {
    generation_id: genId,
    createdAt: new Date().toISOString(),
    playerCount,
    perksPerPlayer,
    world: [
      {
        id: 'world_apocalypse',
        label: '🚨 Апокалипсис',
        title: apocalypseCard.title,
        description: apocalypseCard.description,
        revealed: true,
        accent_color: '#e11d48',
        label_color: '#fda4af',
      },
      {
        id: 'world_bunker',
        label: '🏢 Бункер',
        title: bunkerCard.title,
        description: bunkerCard.description,
        revealed: true,
        accent_color: '#3b82f6',
        label_color: '#93c5fd',
      },
      {
        id: 'world_threat',
        label: '⚠️ Угроза',
        title: threatCard.title,
        description: threatCard.description,
        revealed: true,
        accent_color: '#f59e0b',
        label_color: '#fde047',
      },
    ],
    players: [] as any[],
  };

  // Draw category cards for all players
  const drawnByCategory: Record<string, any[]> = {};
  for (const cat of playerCategories) {
    drawnByCategory[cat] = drawRandomSample(cardsDeck[cat] || [], playerCount);
  }

  const drawnPerks = drawRandomSample(cardsDeck['Перк'] || [], playerCount * perksPerPlayer);

  for (let pIdx = 0; pIdx < playerCount; pIdx++) {
    const cards: any[] = [];
    for (let cIdx = 0; cIdx < playerCategories.length; cIdx++) {
      const cat = playerCategories[cIdx];
      const drawn = drawnByCategory[cat][pIdx] || { title: 'Неизвестно', description: '' };
      cards.push({
        id: `p${pIdx + 1}_card${cIdx + 1}`,
        label: cat,
        title: drawn.title,
        description: drawn.description,
        revealed: false,
      });
    }

    const perksStart = pIdx * perksPerPlayer;
    const perksEnd = perksStart + perksPerPlayer;
    const playerPerks = drawnPerks.slice(perksStart, perksEnd);

    playerPerks.forEach((perk, perkNum) => {
      cards.push({
        id: `p${pIdx + 1}_perk${perkNum + 1}`,
        label: `Перк ${perkNum + 1}`,
        title: perk.title,
        description: perk.description,
        perk_used: false,
        revealed: false,
      });
    });

    session.players.push({
      id: `player_${pIdx + 1}`,
      name: `Игрок ${pIdx + 1}`,
      cards,
      isEliminated: false,
      inBunker: false,
    });
  }

  return session;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // GM Auth check
  app.post('/api/auth/gm', (req, res) => {
    const { password } = req.body;
    if (password === GM_PASSWORD) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: 'Неверный пароль ведущего' });
    }
  });

  // Get current game session
  app.get('/api/session', (req, res) => {
    const session = loadSession();
    res.json({ session });
  });

  // Generate new game session
  app.post('/api/session/generate', (req, res) => {
    const playerCount = Math.max(2, Math.min(30, Number(req.body.playerCount) || 6));
    const perksPerPlayer = Math.max(0, Math.min(5, Number(req.body.perksPerPlayer) ?? 2));

    const newSession = generateGameSession(playerCount, perksPerPlayer);
    saveSession(newSession);
    res.json({ session: newSession });
  });

  // Clear current game session
  app.post('/api/session/clear', (req, res) => {
    saveSession({ cleared: true });
    res.json({ session: null });
  });

  // Update session
  app.post('/api/session/update', (req, res) => {
    const session = req.body.session;
    if (!session) {
      return res.status(400).json({ error: 'Missing session data' });
    }
    saveSession(session);
    res.json({ session });
  });

  // Quick card reveal toggle
  app.post('/api/session/toggle-card', (req, res) => {
    const { cardId, revealed, perkUsed } = req.body;
    const session = loadSession();
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }

    // Check world cards
    for (const w of session.world) {
      if (w.id === cardId) {
        if (typeof revealed === 'boolean') w.revealed = revealed;
        break;
      }
    }

    // Check players
    for (const p of session.players) {
      for (const c of p.cards) {
        if (c.id === cardId) {
          if (typeof revealed === 'boolean') c.revealed = revealed;
          if (typeof perkUsed === 'boolean') c.perk_used = perkUsed;
          break;
        }
      }
    }

    saveSession(session);
    res.json({ session });
  });

  // Open/close all cards for player
  app.post('/api/session/player-cards-all', (req, res) => {
    const { playerId, revealed } = req.body;
    const session = loadSession();
    if (!session) return res.status(404).json({ error: 'No active session' });

    const player = session.players.find((p: any) => p.id === playerId || p.name === playerId);
    if (player) {
      player.cards.forEach((c: any) => {
        c.revealed = !!revealed;
      });
      saveSession(session);
    }
    res.json({ session });
  });

  // Deck statistics
  app.get('/api/deck', (req, res) => {
    const categories = Object.keys(cardsDeck).map(cat => ({
      name: cat,
      count: cardsDeck[cat].length,
    }));
    res.json({ categories, totalCards: categories.reduce((sum, c) => sum + c.count, 0) });
  });

  // Full deck list for host viewer
  app.get('/api/deck/all', (req, res) => {
    res.json({ deck: cardsDeck });
  });

  // Apply perk effect directly to the game session
  app.post('/api/perks/apply', (req, res) => {
    const {
      perkId,
      action,
      targetPlayerId,
      secondPlayerId,
      category,
      statusText,
      cardId,
    } = req.body;

    const session = loadSession();
    if (!session) return res.status(404).json({ error: 'No active session' });

    // Find and mark the perk as used
    let foundPerk: any = null;
    let perkOwner: any = null;
    for (const p of session.players) {
      for (const c of p.cards) {
        if (c.id === perkId) {
          c.perk_used = true;
          foundPerk = c;
          perkOwner = p;
          break;
        }
      }
    }

    let actionLog = '';

    switch (action) {
      case 'reroll_threat': {
        const newThreat = getRandomCard('Угроза');
        const threatCard = session.world.find((w: any) => w.id === 'world_threat');
        if (threatCard) {
          threatCard.title = newThreat.title;
          threatCard.description = newThreat.description;
          threatCard.revealed = true;
        }
        actionLog = `Карта угрозы заменена на «${newThreat.title}»`;
        break;
      }

      case 'reroll_card':
      case 'reroll_target_card':
      case 'reroll_own_card': {
        const target = session.players.find((p: any) => p.id === targetPlayerId);
        if (target && category) {
          const newCard = getRandomCard(category);
          const cardToReplace = target.cards.find((c: any) => c.label === category);
          if (cardToReplace) {
            cardToReplace.title = newCard.title;
            cardToReplace.description = newCard.description;
            cardToReplace.revealed = true;
            actionLog = `Игрок ${target.name}: карта «${category}» заменена на «${newCard.title}»`;
          }
        }
        break;
      }

      case 'swap_cards': {
        const p1 = session.players.find((p: any) => p.id === targetPlayerId);
        const p2 = session.players.find((p: any) => p.id === secondPlayerId);
        if (p1 && p2 && category) {
          const c1 = p1.cards.find((c: any) => c.label === category);
          const c2 = p2.cards.find((c: any) => c.label === category);
          if (c1 && c2) {
            const tempTitle = c1.title;
            const tempDesc = c1.description;
            c1.title = c2.title;
            c1.description = c2.description;
            c1.revealed = true;

            c2.title = tempTitle;
            c2.description = tempDesc;
            c2.revealed = true;

            actionLog = `Карты «${category}» успешно обменены между ${p1.name} и ${p2.name}`;
          }
        }
        break;
      }

      case 'reroll_all_category': {
        if (category) {
          const freshCards = drawRandomSample(cardsDeck[category] || [], session.players.length);
          session.players.forEach((p: any, idx: number) => {
            const card = p.cards.find((c: any) => c.label === category);
            if (card && freshCards[idx]) {
              card.title = freshCards[idx].title;
              card.description = freshCards[idx].description;
              card.revealed = true;
            }
          });
          actionLog = `Категория «${category}» полностью перераздана для всех игроков!`;
        }
        break;
      }

      case 'revive_player': {
        const target = session.players.find((p: any) => p.id === targetPlayerId);
        if (target) {
          target.isEliminated = false;
          if (!target.statuses) target.statuses = [];
          target.statuses.push('🛡️ Спасён перком от увольнения');
          actionLog = `Игрок ${target.name} возвращён в игру!`;
        }
        break;
      }

      case 'add_status': {
        const target = session.players.find((p: any) => p.id === targetPlayerId);
        if (target && statusText) {
          if (!target.statuses) target.statuses = [];
          if (!target.statuses.includes(statusText)) {
            target.statuses.push(statusText);
          }
          actionLog = `Игроку ${target.name} добавлен статус: ${statusText}`;
        }
        break;
      }

      case 'reveal_card': {
        const target = session.players.find((p: any) => p.id === targetPlayerId);
        if (target) {
          const card = target.cards.find((c: any) => c.id === cardId || c.label === category);
          if (card) {
            card.revealed = true;
            actionLog = `Вскрыта карта «${card.label}: ${card.title}» у игрока ${target.name}`;
          }
        }
        break;
      }

      case 'reset_voting': {
        session.players.forEach((p: any) => {
          p.isEliminated = false;
        });
        if (session.voting) {
          session.voting.isActive = true;
          session.voting.isConcluded = false;
          session.voting.votes = {};
          session.voting.result = null;
        }
        actionLog = 'Результаты голосования отменены перком «Code Review»! Все переголосовывают.';
        break;
      }

      case 'start_voting': {
        const roundNumber = (session.voting?.roundNumber || 0) + 1;
        session.voting = {
          isActive: true,
          roundNumber,
          votes: {},
          isConcluded: false,
          result: null,
        };
        actionLog = 'Перк «Деплой в прод без тестов»: Немедленный переход к голосованию!';
        break;
      }

      default:
        actionLog = `Перк «${foundPerk?.title || perkId}» применён`;
    }

    saveSession(session);
    res.json({ session, actionLog });
  });

  // Undo / revoke perk
  app.post('/api/perks/undo', (req, res) => {
    const { perkId } = req.body;
    const session = loadSession();
    if (!session) return res.status(404).json({ error: 'No active session' });

    for (const p of session.players) {
      for (const c of p.cards) {
        if (c.id === perkId) {
          c.perk_used = false;
          break;
        }
      }
    }

    saveSession(session);
    res.json({ session });
  });

  // --- Voting Endpoints ---

  function getVoterWeight(player: any): number {
    if (player.isEliminated) return 0;
    const statuses = (player.statuses || []).map((s: string) => s.toLowerCase());
    if (statuses.some((s: string) => s.includes('лишён права голоса') || s.includes('лишен права голоса') || s.includes('лишён голоса'))) {
      return 0;
    }
    let weight = 1;
    if (statuses.some((s: string) => s.includes('+2 голос') || s.includes('+2 дополнительн'))) {
      weight += 2;
    }
    if (statuses.some((s: string) => s.includes('парное программирование') || s.includes('x2 голос'))) {
      weight *= 2;
    }
    return weight;
  }

  function isCandidateImmune(player: any): boolean {
    if (player.isEliminated) return true;
    const statuses = (player.statuses || []).map((s: string) => s.toLowerCase());
    return statuses.some((s: string) =>
      s.includes('тайный оффер') ||
      s.includes('иммунитет от увольнения') ||
      s.includes('забастовка') ||
      s.includes('защита от голосования') ||
      s.includes('овертайм') ||
      s.includes('защищён овертаймом')
    );
  }

  // Start voting round
  app.post('/api/voting/start', (req, res) => {
    const session = loadSession();
    if (!session) return res.status(404).json({ error: 'No active session' });

    const roundNumber = (session.voting?.roundNumber || 0) + 1;
    session.voting = {
      isActive: true,
      roundNumber,
      votes: {},
      isConcluded: false,
      result: null,
    };

    saveSession(session);
    res.json({ session });
  });

  // Submit or update a vote
  app.post('/api/voting/vote', (req, res) => {
    const { voterId, candidateId } = req.body;
    const session = loadSession();
    if (!session || !session.voting || !session.voting.isActive) {
      return res.status(400).json({ error: 'Voting is not active' });
    }

    const voter = session.players.find((p: any) => p.id === voterId);
    if (!voter || voter.isEliminated) {
      return res.status(400).json({ error: 'Invalid voter' });
    }

    if (getVoterWeight(voter) <= 0) {
      return res.status(400).json({ error: 'Player has no voting rights in this round' });
    }

    const candidate = session.players.find((p: any) => p.id === candidateId);
    if (!candidate || candidate.isEliminated) {
      return res.status(400).json({ error: 'Invalid candidate' });
    }

    if (isCandidateImmune(candidate)) {
      return res.status(400).json({ error: 'Candidate has immunity from perk' });
    }

    session.voting.votes[voterId] = candidateId;
    saveSession(session);
    res.json({ session });
  });

  // Batch submit votes (from Host panel)
  app.post('/api/voting/bulk-votes', (req, res) => {
    const { votes } = req.body;
    const session = loadSession();
    if (!session || !session.voting || !session.voting.isActive) {
      return res.status(400).json({ error: 'Voting is not active' });
    }

    session.voting.votes = { ...session.voting.votes, ...votes };
    saveSession(session);
    res.json({ session });
  });

  // Tally votes taking perks into account
  app.post('/api/voting/tally', (req, res) => {
    const session = loadSession();
    if (!session || !session.voting) {
      return res.status(400).json({ error: 'No voting in progress' });
    }

    const candidateVotes: Record<string, number> = {};
    session.players.forEach((p: any) => {
      if (!p.isEliminated) candidateVotes[p.id] = 0;
    });

    Object.entries(session.voting.votes || {}).forEach(([voterId, candidateId]: [string, any]) => {
      const voter = session.players.find((p: any) => p.id === voterId);
      if (!voter || voter.isEliminated) return;
      const weight = getVoterWeight(voter);
      if (weight <= 0) return;

      const candidate = session.players.find((p: any) => p.id === candidateId);
      if (!candidate || candidate.isEliminated || isCandidateImmune(candidate)) return;

      candidateVotes[candidateId] = (candidateVotes[candidateId] || 0) + weight;
    });

    const sorted = Object.entries(candidateVotes)
      .map(([id, count]) => ({
        id,
        player: session.players.find((p: any) => p.id === id),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    if (sorted.length === 0 || sorted[0].count === 0) {
      session.voting.result = {
        candidateVotes,
        eliminatedPlayerId: null,
        summaryMessage: 'Голосов пока не подано или все голоса отданы за защищённых игроков.',
      };
      session.voting.isConcluded = true;
      saveSession(session);
      return res.json({ session });
    }

    const top = sorted[0];
    const tied = sorted.filter((c) => c.count === top.count);

    if (tied.length > 1) {
      const tiedNames = tied.map((c) => c.player?.name).join(' и ');
      session.voting.result = {
        candidateVotes,
        eliminatedPlayerId: null,
        tiedPlayerIds: tied.map((c) => c.id),
        summaryMessage: `Ничья! Игроки ${tiedNames} набрали по ${top.count} голосов. Требуется переголосование или решающее слово ведущего.`,
      };
      session.voting.isConcluded = true;
      saveSession(session);
      return res.json({ session });
    }

    // Check Golden Parachute on top candidate
    const topStatuses = (top.player?.statuses || []).map((s: string) => s.toLowerCase());
    const hasParachute = topStatuses.some((s: string) => s.includes('золотой парашют'));

    if (hasParachute) {
      const nextCandidates = sorted.slice(1).filter((c) => c.count > 0);
      if (nextCandidates.length === 0) {
        session.voting.result = {
          candidateVotes,
          eliminatedPlayerId: null,
          goldenParachuteSavedId: top.id,
          summaryMessage: `Игрок ${top.player?.name} набрал большинство (${top.count}), но спасён перком «Золотой парашют»! Больше ни за кого голосов нет.`,
        };
      } else {
        const nextTop = nextCandidates[0];
        const nextTied = nextCandidates.filter((c) => c.count === nextTop.count);
        if (nextTied.length > 1) {
          const nextTiedNames = nextTied.map((c) => c.player?.name).join(' и ');
          session.voting.result = {
            candidateVotes,
            eliminatedPlayerId: null,
            goldenParachuteSavedId: top.id,
            tiedPlayerIds: nextTied.map((c) => c.id),
            summaryMessage: `Перк «Золотой парашют» спас игрока ${top.player?.name}! Следующие по голосам (${nextTiedNames}) имеют ничью по ${nextTop.count} голосов.`,
          };
        } else {
          session.voting.result = {
            candidateVotes,
            eliminatedPlayerId: nextTop.id,
            eliminatedPlayerName: nextTop.player?.name,
            goldenParachuteSavedId: top.id,
            summaryMessage: `Перк «Золотой парашют» спас игрока ${top.player?.name}! Бункер покидает следующий кандидат: ${nextTop.player?.name} (${nextTop.count} голосов).`,
          };
        }
      }
      session.voting.isConcluded = true;
      saveSession(session);
      return res.json({ session });
    }

    session.voting.result = {
      candidateVotes,
      eliminatedPlayerId: top.id,
      eliminatedPlayerName: top.player?.name,
      summaryMessage: `Большинством голосов (${top.count}) бункер покидает: ${top.player?.name}.`,
    };
    session.voting.isConcluded = true;
    saveSession(session);
    res.json({ session });
  });

  // Apply elimination from voting
  app.post('/api/voting/apply-elimination', (req, res) => {
    const session = loadSession();
    if (!session || !session.voting || !session.voting.result) {
      return res.status(400).json({ error: 'No voting result to apply' });
    }

    const { eliminatedPlayerId, goldenParachuteSavedId } = session.voting.result;

    // Consume Golden Parachute from saved player
    if (goldenParachuteSavedId) {
      const savedPlayer = session.players.find((p: any) => p.id === goldenParachuteSavedId);
      if (savedPlayer && savedPlayer.statuses) {
        savedPlayer.statuses = savedPlayer.statuses.filter((s: string) => !s.toLowerCase().includes('золотой парашют'));
      }
    }

    // Eliminate target player
    if (eliminatedPlayerId) {
      const target = session.players.find((p: any) => p.id === eliminatedPlayerId);
      if (target) {
        target.isEliminated = true;
        target.inBunker = false;
      }
    }

    // Remove single-round voting restriction statuses
    session.players.forEach((p: any) => {
      if (p.statuses) {
        p.statuses = p.statuses.filter((s: string) => {
          const lower = s.toLowerCase();
          return !lower.includes('лишён права голоса') && !lower.includes('заглушен в чате');
        });
      }
    });

    session.voting.isActive = false;
    saveSession(session);
    res.json({ session });
  });

  // Reset or cancel voting
  app.post('/api/voting/cancel', (req, res) => {
    const session = loadSession();
    if (!session) return res.status(404).json({ error: 'No active session' });

    if (session.voting) {
      session.voting.isActive = false;
      session.voting.isConcluded = false;
      session.voting.votes = {};
      session.voting.result = null;
    }

    saveSession(session);
    res.json({ session });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Bunker IT] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
