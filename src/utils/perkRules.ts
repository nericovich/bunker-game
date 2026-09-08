import { Card, GameSession, Player } from '../types';

export interface PerkConfig {
  actionType:
    | 'reroll_threat'
    | 'swap_cards'
    | 'reroll_own_card'
    | 'reroll_target_card'
    | 'reroll_all_category'
    | 'revive_player'
    | 'add_status'
    | 'reveal_card'
    | 'undo_perk'
    | 'add_timer';
  category?: string;
  defaultStatus?: string;
  requiresTarget?: boolean;
  requiresSecondTarget?: boolean;
  requiresCategory?: boolean;
  requiresEliminatedTarget?: boolean;
  requiresUsedPerk?: boolean;
  actionButtonText: string;
  actionExplanation: string;
}

// Complete mapping of all 30 Bunker IT perks to actionable mechanics
export function getPerkConfig(card: Card): PerkConfig {
  const t = `${card.title} ${card.description}`.toLowerCase();

  // 1. Code Review (План Б)
  if (t.includes('code review') || t.includes('переголосовывают') || t.includes('план б')) {
    return {
      actionType: 'add_status',
      defaultStatus: '🔄 План Б (Code Review): Пересмотр решения раунда',
      requiresTarget: true,
      actionButtonText: 'Применить Code Review',
      actionExplanation: 'Даёт возможность оспорить или пересмотреть решение текущего раунда.',
    };
  }

  // 2. Аутсорсинг риска / 23. Экстренное внедрение фичи
  if (t.includes('аутсорсинг риска') || t.includes('экстренное внедрение') || (t.includes('угрозы') && t.includes('новую'))) {
    return {
      actionType: 'reroll_threat',
      actionButtonText: 'Сбросить и перетянуть карту Угрозы',
      actionExplanation: 'Немедленно заменит текущую карту Угрозы бункера на новую случайную карту из колоды.',
    };
  }

  // 3. Хедхантинг (Обмен ролями / профессиями)
  if (t.includes('хедхантинг') || (t.includes('професси') && t.includes('местами'))) {
    return {
      actionType: 'swap_cards',
      category: 'Профессия',
      requiresTarget: true,
      requiresSecondTarget: true,
      actionButtonText: 'Обменять профессии игроков',
      actionExplanation: 'Поменяет местами открытые карты Профессии между двумя выбранными игроками.',
    };
  }

  // 4. Глубокий рефакторинг (Здоровье)
  if (t.includes('рефакторинг') || (t.includes('здоровья') && t.includes('вытянуть новую'))) {
    return {
      actionType: 'reroll_own_card',
      category: 'Здоровье',
      requiresTarget: true,
      actionButtonText: 'Сбросить и перетянуть Здоровье',
      actionExplanation: 'Заменит текущую карту Здоровья игрока на новую случайную карту из колоды.',
    };
  }

  // 10. Переезд на удаленку (Биология)
  if (t.includes('удаленку') || (t.includes('биологии') && t.includes('новую'))) {
    return {
      actionType: 'reroll_own_card',
      category: 'Биология',
      requiresTarget: true,
      actionButtonText: 'Сбросить и перетянуть Биологию',
      actionExplanation: 'Заменит текущую карту Биологии игрока на новую карту из колоды.',
    };
  }

  // 7. Удалить коммит (Следы)
  if (t.includes('удалить коммит') || t.includes('следы')) {
    return {
      actionType: 'reroll_target_card',
      requiresTarget: true,
      requiresCategory: true,
      actionButtonText: 'Сбросить карту цели и вытянуть новую',
      actionExplanation: 'Заставит выбранного игрока сбросить карту (Багаж или Факт) и получить новую.',
    };
  }

  // 17. Душный синьор (Все Хобби)
  if (t.includes('душный синьор') || (t.includes('хобби') && t.includes('всех игроков'))) {
    return {
      actionType: 'reroll_all_category',
      category: 'Хобби',
      actionButtonText: 'Перераздать Хобби ВСЕМ игрокам',
      actionExplanation: 'Заменит карты Хобби у всех игроков за столом на новые случайные из колоды.',
    };
  }

  // 27. Внезапная смена ТЗ
  if (t.includes('смена тз')) {
    return {
      actionType: 'reroll_all_category',
      requiresCategory: true,
      category: 'Факт',
      actionButtonText: 'Перераздать категорию ВСЕМ игрокам',
      actionExplanation: 'Перераздаст выбранную категорию (например, Багаж или Факт) сразу для всех участников партии.',
    };
  }

  // 29. Архитектурный комитет (Ротация Багажа)
  if (t.includes('архитектурный комитет') || (t.includes('багажа') && t.includes('обменяться'))) {
    return {
      actionType: 'swap_cards',
      category: 'Багаж',
      requiresTarget: true,
      requiresSecondTarget: true,
      actionButtonText: 'Обменять карты Багажа',
      actionExplanation: 'Принудительно поменяет местами карты Багажа между двумя игроками.',
    };
  }

  // 14. Свалить всё на джуна
  if (t.includes('свалить всё на джуна') || t.includes('джуна')) {
    return {
      actionType: 'swap_cards',
      category: 'Здоровье',
      requiresTarget: true,
      requiresSecondTarget: true,
      requiresCategory: true,
      actionButtonText: 'Перевесить карту на другого игрока',
      actionExplanation: 'Обменяет выбранную негативную карту (Здоровье или Факт) с другим игроком.',
    };
  }

  // 25. Передача опционов (Взятка)
  if (t.includes('передача опционов') || t.includes('взятка')) {
    return {
      actionType: 'swap_cards',
      category: 'Багаж',
      requiresTarget: true,
      requiresSecondTarget: true,
      requiresCategory: true,
      actionButtonText: 'Передать карту игроку',
      actionExplanation: 'Передаёт карту Багажа или Факта союзнику.',
    };
  }

  // 12. Кумовство / 15. Доп. раунд инвестиций
  if (t.includes('кумовство') || t.includes('инвестиций') || t.includes('ранее уволенного') || t.includes('спасти игрока')) {
    return {
      actionType: 'revive_player',
      requiresEliminatedTarget: true,
      actionButtonText: 'Вернуть исключённого игрока в игру',
      actionExplanation: 'Восстановит статус выбывшего игрока обратно в активную игру.',
    };
  }

  // 9. Мерж без апрува / 13. Включить дебаг-логи / 21. Инспекция кода
  if (t.includes('мерж без апрува') || t.includes('дебаг-логи') || t.includes('инспекция кода') || t.includes('зачита')) {
    return {
      actionType: 'reveal_card',
      requiresTarget: true,
      requiresCategory: true,
      actionButtonText: 'Вскрыть закрытую карту',
      actionExplanation: 'Вскрывает скрытую характеристику игрока на всеобщее обозрение.',
    };
  }

  // 20. Ctrl + Z (Отмена) / 26. Защитный багтрекер
  if (t.includes('ctrl + z') || t.includes('отмена') || t.includes('багтрекер')) {
    return {
      actionType: 'undo_perk',
      requiresUsedPerk: true,
      actionButtonText: 'Отменить применённый перк',
      actionExplanation: 'Сбросит действие ранее сыгранного перка другого игрока.',
    };
  }

  // 22. Прод продлен (Финальное слово)
  if (t.includes('прод продлен') || t.includes('+2 минуты') || t.includes('финальное слово')) {
    return {
      actionType: 'add_timer',
      defaultStatus: '⏱️ Финальное слово (+2 минуты)',
      requiresTarget: true,
      actionButtonText: 'Добавить 2 минуты к обсуждению',
      actionExplanation: 'Даёт игроку право на финальную речь и продлевает таймер.',
    };
  }

  // 30. Деплой в прод без тестов
  if (t.includes('деплой в прод') || t.includes('без тестов')) {
    return {
      actionType: 'add_status',
      defaultStatus: '🚀 Экстренный деплой: Немедленный переход к голосованию!',
      requiresTarget: true,
      actionButtonText: 'Завершить обсуждение и перейти к голосованию',
      actionExplanation: 'Принудительно переводит текущий раунд сразу к фазе голосования.',
    };
  }

  // 5. Парное программирование
  if (t.includes('парное программирование')) {
    return {
      actionType: 'add_status',
      defaultStatus: '🤝 Парное программирование (x2 голоса)',
      requiresTarget: true,
      actionButtonText: 'Установить статус Парного программирования',
      actionExplanation: 'Голоса игрока и выбранного союзника суммируются на текущем голосовании.',
    };
  }

  // 6. Тайный оффер
  if (t.includes('тайный оффер') || (t.includes('иммунитет') && t.includes('нельзя уволить'))) {
    return {
      actionType: 'add_status',
      defaultStatus: '🛡️ Иммунитет от увольнения (Тайный оффер)',
      requiresTarget: true,
      actionButtonText: 'Выдать иммунитет от увольнения',
      actionExplanation: 'Игрока нельзя выгнать на текущем голосовании.',
    };
  }

  // 8. Забастовка разработчиков
  if (t.includes('забастовка')) {
    return {
      actionType: 'add_status',
      defaultStatus: '⛔ Защита от голосования (Забастовка)',
      requiresTarget: true,
      actionButtonText: 'Заблокировать голосование против игрока',
      actionExplanation: 'Против выбранного специалиста запрещено голосовать в этом раунде.',
    };
  }

  // 11. Золотой парашют
  if (t.includes('золотой парашют')) {
    return {
      actionType: 'add_status',
      defaultStatus: '🪂 Золотой парашют (Защита от первого выбывания)',
      requiresTarget: true,
      actionButtonText: 'Активировать Золотой парашют',
      actionExplanation: 'Если игрока выберут большинством голосов, он остаётся, а уходит следующий.',
    };
  }

  // 16. Найти баг у конкурента
  if (t.includes('найти баг у конкурента')) {
    return {
      actionType: 'add_status',
      defaultStatus: '🤐 Лишён права голоса в этом раунде',
      requiresTarget: true,
      actionButtonText: 'Лишить права голоса на раунд',
      actionExplanation: 'Выбранный игрок не имеет права голосовать в текущем раунде.',
    };
  }

  // 18. Agile-планирование
  if (t.includes('agile')) {
    return {
      actionType: 'add_status',
      defaultStatus: '⚡ Определяет порядок обсуждения (Agile)',
      requiresTarget: true,
      actionButtonText: 'Назначить ведущего очерёдности',
      actionExplanation: 'Позволяет игроку установить порядок выступлений в раунде.',
    };
  }

  // 19. Купить лидов (Трафик)
  if (t.includes('купить лидов') || t.includes('+2 голос')) {
    return {
      actionType: 'add_status',
      defaultStatus: '📢 +2 дополнительных голоса на голосовании',
      requiresTarget: true,
      actionButtonText: 'Начислить +2 голоса',
      actionExplanation: 'Дает игроку дополнительные голоса при голосовании за исключение.',
    };
  }

  // 24. Овертайм (Самопожертвование)
  if (t.includes('овертайм') || t.includes('самопожертвование')) {
    return {
      actionType: 'add_status',
      defaultStatus: '🛡️ Защищён овертаймом от выбывания',
      requiresTarget: true,
      actionButtonText: 'Защитить игрока овертаймом',
      actionExplanation: 'Защищает выбранного союзника от увольнения ценой голоса в след. раунде.',
    };
  }

  // 28. Удалить из рабочего чата
  if (t.includes('рабочего чата') || t.includes('высказываться')) {
    return {
      actionType: 'add_status',
      defaultStatus: '🔇 Заглушен в чате (не высказывается в раунде)',
      requiresTarget: true,
      actionButtonText: 'Заглушить игрока на раунд',
      actionExplanation: 'Лишает игрока права голоса и слова во время дискуссии.',
    };
  }

  // 29. Деплой в прод без тестов
  if (t.includes('без тестов') || t.includes('немедленный переход') || t.includes('деплой в прод')) {
    return {
      actionType: 'add_status',
      defaultStatus: '⚡ Деплой в прод без тестов: Экстренное завершение раунда обсуждения',
      actionButtonText: 'Активировать деплой в прод',
      actionExplanation: 'Объявляет экстренное завершение текущего раунда обсуждения и переход к следующей фазе игры!',
    };
  }

  // Default fallback for any custom perk
  return {
    actionType: 'add_status',
    defaultStatus: `✨ Применён перк: ${card.title}`,
    requiresTarget: true,
    actionButtonText: 'Применить перк',
    actionExplanation: card.description,
  };
}
