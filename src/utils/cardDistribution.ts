import { Player, Card, GameSession } from '../types';

/**
 * Copies text to the clipboard with robust fallbacks for iframes and older browsers.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard failed, attempting fallback execCommand', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('All clipboard methods failed', err);
    return false;
  }
}

const CATEGORY_EMOJI: Record<string, string> = {
  'Профессия': '💼',
  'Биология': '🧬',
  'Здоровье': '🩺',
  'Хобби': '🎯',
  'Багаж': '🎒',
  'Факт': '💡',
};

/**
 * Formats a single card into a clean text snippet.
 */
export function formatSingleCard(card: Card): string {
  const isPerk = card.label.startsWith('Перк');
  const emoji = isPerk ? '⚡' : CATEGORY_EMOJI[card.label] || '🪪';
  return `${emoji} ${card.label}: ${card.title}\n${card.description}`;
}

/**
 * Formats a single player's entire dossier for sending via Telegram/Discord/WhatsApp.
 */
export function formatPlayerDossier(player: Player, session?: GameSession | null): string {
  const lines: string[] = [];

  lines.push(`🪪 БУНКЕР IT — ДОСЬЕ ИГРОКА: ${player.name}`);
  if (session?.generation_id) {
    lines.push(`Партия #${session.generation_id}`);
  }
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Basic characteristics
  const standardCards = player.cards.filter((c) => !c.label.startsWith('Перк'));
  const perkCards = player.cards.filter((c) => c.label.startsWith('Перк'));

  standardCards.forEach((card) => {
    const emoji = CATEGORY_EMOJI[card.label] || '🔹';
    lines.push(`${emoji} ${card.label.toUpperCase()}: ${card.title}`);
    if (card.description) {
      lines.push(`   ${card.description}`);
    }
  });

  if (perkCards.length > 0) {
    lines.push('────────────────────────────');
    perkCards.forEach((perk, idx) => {
      lines.push(`⚡ ПЕРК ${idx + 1}: ${perk.title}`);
      if (perk.description) {
        lines.push(`   ${perk.description}`);
      }
    });
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('⚠️ Храните свои карты в тайне до момента оглашения по команде ведущего!');

  return lines.join('\n');
}

/**
 * Formats all players' cards into a single master text for bulk distribution or GM notes.
 */
export function formatAllPlayersDossier(players: Player[], session?: GameSession | null): string {
  const header = [
    '====================================================',
    `🤖 БУНКЕР IT — ПОЛНАЯ РАЗДАЧА КАРТ НА ВСЕХ ИГРОКОВ (${players.length} чел.)`,
    session?.generation_id ? `Партия #${session.generation_id}` : '',
    '====================================================',
    '',
  ].filter(Boolean).join('\n');

  const playerTexts = players.map((player) => formatPlayerDossier(player, session));

  return header + '\n\n' + playerTexts.join('\n\n\n');
}
