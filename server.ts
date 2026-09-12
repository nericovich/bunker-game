import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { cardsDeck as embeddedCardsDeck } from './src/data/cardsData.ts';

const appDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
const PORT = Number(process.env.PORT) || 3000;
const dataDir = process.env.DATA_DIR || process.cwd();
const STATE_FILE = path.join(dataDir, '.bunker_session.json');
const GM_PASSWORD = process.env.BUNKER_GM_PASSWORD || 'YA2077';

// Load cards deck with embedded fallback so Docker/VPS/Cloud Run never fail
let cardsDeck: Record<string, Array<{ category: string; title: string; description: string }>> = {
  ...embeddedCardsDeck,
};

// Also check potential file paths for cards.json if present on disk
const candidatePaths = [
  path.join(process.cwd(), 'src', 'data', 'cards.json'),
  path.join(appDir, 'src', 'data', 'cards.json'),
  path.join(appDir, '..', 'src', 'data', 'cards.json'),
];

for (const p of candidatePaths) {
  try {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Object.keys(parsed).length > 0) {
        cardsDeck = parsed;
        console.log('[Bunker IT] Loaded cards database from disk at:', p);
        break;
      }
    }
  } catch (e) {
    // Continue
  }
}

console.log('[Bunker IT] Active cards deck categories:', Object.keys(cardsDeck).length);

// Helper to load session
function loadSession() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed?.cleared) return null;
      if (parsed && !parsed.cleared && !parsed.timer) {
        parsed.timer = {
          initialSeconds: 60,
          remainingSeconds: 60,
          endsAt: null,
          isRunning: false,
        };
      }
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

// Fisher-Yates unbiased shuffle
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRandomCard(category: string) {
  const pool = cardsDeck[category] || [];
  if (!pool.length) {
    return { category, title: `${category} (Базовый)`, description: 'Информация засекречена' };
  }
  return pool[Math.floor(Math.random() * pool.length)] || { category, title: `${category} (Базовый)`, description: 'Информация засекречена' };
}

// Get all card titles currently held by all players across all categories
function getUsedCardTitles(session: any): Record<string, Set<string>> {
  const used: Record<string, Set<string>> = {
    'Профессия': new Set(),
    'Биология': new Set(),
    'Здоровье': new Set(),
    'Хобби': new Set(),
    'Багаж': new Set(),
    'Факт': new Set(),
    'Перк': new Set(),
  };

  if (!session || !session.players) return used;

  for (const player of session.players) {
    for (const card of player.cards || []) {
      if (card.label?.startsWith('Перк')) {
        used['Перк'].add(card.title);
      } else if (used[card.label]) {
        used[card.label].add(card.title);
      }
    }
  }

  return used;
}

// Draw a strictly unique card for a given category, ensuring no duplicates across players
function drawUniqueCard(category: string, usedSet?: Set<string>): { category: string; title: string; description: string } {
  const pool = cardsDeck[category] || [];
  if (!pool.length) {
    return { category, title: `${category} (Базовый)`, description: 'Информация засекречена' };
  }

  // Filter pool by unused titles to guarantee zero overlap among players
  const available = usedSet ? pool.filter((c: any) => !usedSet.has(c.title)) : pool;

  if (available.length > 0) {
    const shuffledAvailable = shuffleArray(available);
    const chosen = shuffledAvailable[0];
    if (usedSet) {
      usedSet.add(chosen.title);
    }
    return chosen;
  }

  // If pool runs out (e.g. game exceeds pool size), fall back to safe random
  const fallback = pool[Math.floor(Math.random() * pool.length)];
  return fallback;
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
    timer: {
      initialSeconds: 60,
      remainingSeconds: 60,
      endsAt: null,
      isRunning: false,
    },
  };

  // Track used card titles across all players so characteristics NEVER overlap
  const usedTitles: Record<string, Set<string>> = {
    'Профессия': new Set(),
    'Биология': new Set(),
    'Здоровье': new Set(),
    'Хобби': new Set(),
    'Багаж': new Set(),
    'Факт': new Set(),
    'Перк': new Set(),
  };

  for (let pIdx = 0; pIdx < playerCount; pIdx++) {
    const cards: any[] = [];
    for (let cIdx = 0; cIdx < playerCategories.length; cIdx++) {
      const cat = playerCategories[cIdx];
      const drawn = drawUniqueCard(cat, usedTitles[cat]);
      cards.push({
        id: `p${pIdx + 1}_card${cIdx + 1}`,
        label: cat,
        title: drawn.title,
        description: drawn.description,
        revealed: false,
      });
    }

    for (let perkNum = 0; perkNum < perksPerPlayer; perkNum++) {
      const drawnPerk = drawUniqueCard('Перк', usedTitles['Перк']);
      cards.push({
        id: `p${pIdx + 1}_perk${perkNum + 1}`,
        label: `Перк ${perkNum + 1}`,
        title: drawnPerk.title,
        description: drawnPerk.description,
        perk_used: false,
        revealed: false,
      });
    }

    session.players.push({
      id: `player_${pIdx + 1}`,
      name: `Игрок ${pIdx + 1}`,
      cards,
      isEliminated: false,
      inBunker: false,
      statuses: [],
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
    try {
      const playerCount = Math.max(2, Math.min(30, Number(req.body?.playerCount) || 6));
      const perksPerPlayer = Math.max(0, Math.min(5, Number(req.body?.perksPerPlayer) ?? 2));

      const newSession = generateGameSession(playerCount, perksPerPlayer);
      saveSession(newSession);
      res.json({ session: newSession });
    } catch (err: any) {
      console.error('[Bunker IT] Session generation error:', err);
      res.status(500).json({ error: err?.message || 'Ошибка генерации партии' });
    }
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

  // Timer sync control endpoint (host-controlled)
  app.post('/api/session/timer', (req, res) => {
    const { action, initialSeconds, remainingSeconds } = req.body;
    const session = loadSession();
    if (!session) return res.status(404).json({ error: 'No active session' });

    if (!session.timer) {
      session.timer = {
        initialSeconds: 60,
        remainingSeconds: 60,
        endsAt: null,
        isRunning: false,
      };
    }

    const now = Date.now();

    if (action === 'start') {
      const currentRemaining = typeof remainingSeconds === 'number'
        ? remainingSeconds
        : (session.timer.remainingSeconds ?? session.timer.initialSeconds ?? 60);
      const secs = currentRemaining > 0 ? currentRemaining : (session.timer.initialSeconds || 60);
      session.timer.isRunning = true;
      session.timer.endsAt = now + secs * 1000;
      session.timer.remainingSeconds = secs;
    } else if (action === 'pause') {
      if (session.timer.isRunning && session.timer.endsAt) {
        const left = Math.max(0, Math.ceil((session.timer.endsAt - now) / 1000));
        session.timer.remainingSeconds = left;
      } else if (typeof remainingSeconds === 'number') {
        session.timer.remainingSeconds = remainingSeconds;
      }
      session.timer.isRunning = false;
      session.timer.endsAt = null;
    } else if (action === 'reset') {
      const initSec = initialSeconds || session.timer.initialSeconds || 60;
      session.timer.isRunning = false;
      session.timer.endsAt = null;
      session.timer.remainingSeconds = initSec;
      session.timer.initialSeconds = initSec;
    } else if (action === 'set_time') {
      const newSec = Math.max(5, Math.min(600, Number(initialSeconds) || 60));
      session.timer.initialSeconds = newSec;
      session.timer.remainingSeconds = newSec;
      session.timer.isRunning = false;
      session.timer.endsAt = null;
    }

    session.timer.updatedAt = now;
    saveSession(session);
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
          const usedTitles = getUsedCardTitles(session);
          const newCard = drawUniqueCard(category, usedTitles[category]);
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
          const usedSet = new Set<string>();
          session.players.forEach((p: any) => {
            const card = p.cards.find((c: any) => c.label === category);
            if (card) {
              const freshCard = drawUniqueCard(category, usedSet);
              card.title = freshCard.title;
              card.description = freshCard.description;
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

  // --- Dynamic Players Management (Add & Remove mid-game) ---

  // Add a player during an active game with strictly non-overlapping cards
  app.post('/api/players/add', (req, res) => {
    try {
      const session = loadSession();
      if (!session) {
        return res.status(404).json({ error: 'Партия ещё не создана' });
      }

      const playerCategories = ['Профессия', 'Биология', 'Здоровье', 'Хобби', 'Багаж', 'Факт'];
      const perksCount = session.perksPerPlayer ?? 2;

      // Find all currently held card titles to prevent any overlap
      const usedTitles = getUsedCardTitles(session);

      const nextPlayerNumber = session.players.length + 1;
      const customName = req.body?.name?.trim();
      const playerName = customName || `Игрок ${nextPlayerNumber}`;
      const newPlayerId = `player_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const cards: any[] = [];
      for (let cIdx = 0; cIdx < playerCategories.length; cIdx++) {
        const cat = playerCategories[cIdx];
        const drawn = drawUniqueCard(cat, usedTitles[cat]);
        cards.push({
          id: `${newPlayerId}_card${cIdx + 1}`,
          label: cat,
          title: drawn.title,
          description: drawn.description,
          revealed: false,
        });
      }

      for (let perkNum = 0; perkNum < perksCount; perkNum++) {
        const drawnPerk = drawUniqueCard('Перк', usedTitles['Перк']);
        cards.push({
          id: `${newPlayerId}_perk${perkNum + 1}`,
          label: `Перк ${perkNum + 1}`,
          title: drawnPerk.title,
          description: drawnPerk.description,
          perk_used: false,
          revealed: false,
        });
      }

      const newPlayer = {
        id: newPlayerId,
        name: playerName,
        cards,
        isEliminated: false,
        inBunker: false,
        statuses: [],
      };

      session.players.push(newPlayer);
      session.playerCount = session.players.length;

      saveSession(session);
      res.json({ session, newPlayer });
    } catch (err: any) {
      console.error('[Bunker IT] Error adding player:', err);
      res.status(500).json({ error: err?.message || 'Не удалось добавить игрока' });
    }
  });

  // Remove a player from the game
  app.post('/api/players/remove', (req, res) => {
    try {
      const { playerId } = req.body;
      const session = loadSession();
      if (!session) {
        return res.status(404).json({ error: 'Партия ещё не создана' });
      }

      session.players = session.players.filter((p: any) => p.id !== playerId);
      session.playerCount = session.players.length;

      saveSession(session);
      res.json({ session });
    } catch (err: any) {
      console.error('[Bunker IT] Error removing player:', err);
      res.status(500).json({ error: err?.message || 'Не удалось удалить игрока' });
    }
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
