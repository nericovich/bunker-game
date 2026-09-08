import { Player, GameSession, VoteResult } from '../types';

/**
 * Calculates voting weight of a player based on their perks and statuses.
 */
export function getPlayerVoteWeight(player: Player): {
  weight: number;
  breakdown: string[];
} {
  if (player.isEliminated) {
    return { weight: 0, breakdown: ['Исключён из игры'] };
  }

  let weight = 1;
  const breakdown: string[] = ['Базовый голос: 1'];

  const statuses = (player.statuses || []).map((s) => s.toLowerCase());

  // Check if deprived of voting rights (e.g. perk "Найти баг у конкурента" or "Овертайм")
  if (
    statuses.some(
      (s) =>
        s.includes('лишён права голоса') ||
        s.includes('лишен права голоса') ||
        s.includes('лишён голоса')
    )
  ) {
    return {
      weight: 0,
      breakdown: ['🤐 Лишён права голоса перком соперника (0 голосов)'],
    };
  }

  // Check if has extra votes (+2 from perk "Купить лидов")
  if (statuses.some((s) => s.includes('+2 голос') || s.includes('+2 дополнительн'))) {
    weight += 2;
    breakdown.push('📢 Перк «Купить лидов»: +2 голоса');
  }

  // Check if Pair Programming is active (x2 multiplier)
  if (statuses.some((s) => s.includes('парное программирование') || s.includes('x2 голос'))) {
    weight *= 2;
    breakdown.push('🤝 Перк «Парное программирование»: x2 множитель');
  }

  return { weight, breakdown };
}

/**
 * Checks whether a candidate is immune from being voted out.
 */
export function getPlayerImmunity(player: Player): {
  isImmune: boolean;
  reason?: string;
} {
  if (player.isEliminated) {
    return { isImmune: true, reason: 'Уже исключён' };
  }

  const statuses = (player.statuses || []).map((s) => s.toLowerCase());

  if (statuses.some((s) => s.includes('тайный оффер') || s.includes('иммунитет от увольнения'))) {
    return {
      isImmune: true,
      reason: '🛡️ Иммунитет от увольнения (Перк «Тайный оффер»)',
    };
  }

  if (statuses.some((s) => s.includes('забастовка') || s.includes('защита от голосования'))) {
    return {
      isImmune: true,
      reason: '⛔ Заблокирован для голосования (Перк «Забастовка разработчиков»)',
    };
  }

  if (statuses.some((s) => s.includes('овертайм') || s.includes('защищён овертаймом'))) {
    return {
      isImmune: true,
      reason: '🛡️ Защищён от выбывания (Перк «Овертайм»)',
    };
  }

  return { isImmune: false };
}

/**
 * Checks if player has Golden Parachute active.
 */
export function hasGoldenParachute(player: Player): boolean {
  const statuses = (player.statuses || []).map((s) => s.toLowerCase());
  return statuses.some((s) => s.includes('золотой парашют'));
}

/**
 * Computes the final results of the voting round taking into account all perks.
 */
export function calculateVotingResults(
  session: GameSession,
  votes: Record<string, string>
): VoteResult {
  const candidateVotes: Record<string, number> = {};

  // Initialize candidates (active non-eliminated players)
  session.players.forEach((p) => {
    if (!p.isEliminated) {
      candidateVotes[p.id] = 0;
    }
  });

  // Tally weighted votes
  Object.entries(votes).forEach(([voterId, candidateId]) => {
    const voter = session.players.find((p) => p.id === voterId);
    if (!voter || voter.isEliminated) return;

    const { weight } = getPlayerVoteWeight(voter);
    if (weight <= 0) return;

    // Check candidate immunity
    const candidate = session.players.find((p) => p.id === candidateId);
    if (!candidate || candidate.isEliminated) return;

    const immunity = getPlayerImmunity(candidate);
    if (immunity.isImmune) {
      // Vote against immune player is voided
      return;
    }

    candidateVotes[candidateId] = (candidateVotes[candidateId] || 0) + weight;
  });

  // Sort candidates by votes received descending
  const sortedCandidates = Object.entries(candidateVotes)
    .map(([id, count]) => ({
      id,
      player: session.players.find((p) => p.id === id)!,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  if (sortedCandidates.length === 0 || sortedCandidates[0].count === 0) {
    return {
      candidateVotes,
      eliminatedPlayerId: null,
      summaryMessage: 'Голосов пока не подано или все голоса были отданы за игроков с иммунитетом.',
    };
  }

  const topCandidate = sortedCandidates[0];
  const maxVotes = topCandidate.count;

  // Check for tie
  const tied = sortedCandidates.filter((c) => c.count === maxVotes);
  if (tied.length > 1) {
    const tiedNames = tied.map((c) => c.player.name).join(' и ');
    return {
      candidateVotes,
      eliminatedPlayerId: null,
      tiedPlayerIds: tied.map((c) => c.id),
      summaryMessage: `Ничья! Игроки ${tiedNames} набрали по ${maxVotes} голосов. Требуется повторное голосование между ними или решение ведущего.`,
    };
  }

  // Check for Golden Parachute
  if (hasGoldenParachute(topCandidate.player)) {
    // Parachute saves top candidate!
    // The next candidate with the highest votes gets eliminated
    const nextCandidates = sortedCandidates.slice(1).filter((c) => c.count > 0);

    if (nextCandidates.length === 0) {
      return {
        candidateVotes,
        eliminatedPlayerId: null,
        goldenParachuteSavedId: topCandidate.id,
        summaryMessage: `Игрок ${topCandidate.player.name} набрал большинство голосов (${topCandidate.count}), но спасён перком «Золотой парашют»! Больше ни за кого не голосовали.`,
      };
    }

    const nextTop = nextCandidates[0];
    const nextTied = nextCandidates.filter((c) => c.count === nextTop.count);

    if (nextTied.length > 1) {
      const nextTiedNames = nextTied.map((c) => c.player.name).join(' и ');
      return {
        candidateVotes,
        eliminatedPlayerId: null,
        goldenParachuteSavedId: topCandidate.id,
        tiedPlayerIds: nextTied.map((c) => c.id),
        summaryMessage: `Перк «Золотой парашют» спас игрока ${topCandidate.player.name}! Следующие по голосам кандидаты (${nextTiedNames}) имеют ничью по ${nextTop.count} голосов.`,
      };
    }

    return {
      candidateVotes,
      eliminatedPlayerId: nextTop.id,
      eliminatedPlayerName: nextTop.player.name,
      goldenParachuteSavedId: topCandidate.id,
      summaryMessage: `Перк «Золотой парашют» спас игрока ${topCandidate.player.name}! По правилу парашюта бункер покидает следующий по голосам: ${nextTop.player.name} (${nextTop.count} голосов).`,
    };
  }

  // Normal elimination
  return {
    candidateVotes,
    eliminatedPlayerId: topCandidate.id,
    eliminatedPlayerName: topCandidate.player.name,
    summaryMessage: `Большинством голосов (${topCandidate.count}) бункер покидает: ${topCandidate.player.name}.`,
  };
}
