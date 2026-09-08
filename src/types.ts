export interface Card {
  id: string;
  label: string;
  title: string;
  description: string;
  revealed: boolean;
  perk_used?: boolean;
}

export interface WorldCard {
  id: string;
  label: string;
  title: string;
  description: string;
  revealed: boolean;
  accent_color: string;
  label_color: string;
}

export interface Player {
  id: string;
  name: string;
  cards: Card[];
  isEliminated?: boolean;
  inBunker?: boolean;
  statuses?: string[];
}

export interface PerkActionPayload {
  perkId: string;
  sourcePlayerId?: string;
  action: string;
  targetPlayerId?: string;
  secondPlayerId?: string;
  category?: string;
  statusText?: string;
  minutesToAdd?: number;
}

export interface GameSession {
  generation_id: number;
  createdAt: string;
  playerCount: number;
  perksPerPlayer: number;
  world: WorldCard[];
  players: Player[];
}

export interface DeckCard {
  category: string;
  title: string;
  description: string;
}

export type Role = 'player' | 'host';

export const CARD_COLORS: Record<string, string> = {
  'Профессия': '#2563eb', // Blue
  'Биология': '#059669',  // Emerald
  'Здоровье': '#d97706',  // Amber
  'Хобби': '#7c3aed',     // Purple
  'Багаж': '#475569',     // Slate
  'Факт': '#0891b2',      // Cyan
  'Перк': '#db2777',      // Pink
  'Апокалипсис': '#e11d48', // Rose
  'Бункер': '#3b82f6',    // Sky
  'Угроза': '#f59e0b',    // Orange
};

export const FORBIDDEN_PERK_ACTIONS = [
  'перераздач',
  'переразд',
  'роли',
  'роль',
  'раздать роли',
  'перераспредел',
  'redistrib',
  'role',
];

export function isPerkApplicable(card: Card): boolean {
  if (!card.label.startsWith('Перк')) return false;
  const text = `${card.title} ${card.description}`.toLowerCase();
  return !FORBIDDEN_PERK_ACTIONS.some(k => text.includes(k));
}
