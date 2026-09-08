import React, { useState, useEffect } from 'react';
import { X, Search, Layers, BookOpen } from 'lucide-react';
import { CARD_COLORS } from '../types';

interface DeckViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeckViewerModal({ isOpen, onClose }: DeckViewerModalProps) {
  const [deck, setDeck] = useState<Record<string, Array<{ category: string; title: string; description: string }>>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/deck/all')
      .then((res) => res.json())
      .then((data) => {
        if (data.deck) setDeck(data.deck);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load deck', err);
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['Все', ...Object.keys(deck)];

  const allCards: Array<{ category: string; title: string; description: string }> = [];
  (Object.entries(deck) as [string, Array<{ category: string; title: string; description: string }>][]).forEach(([cat, list]) => {
    if (selectedCategory === 'Все' || selectedCategory === cat) {
      list.forEach((c) => allCards.push(c));
    }
  });

  const filteredCards = allCards.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-rose-400" />
            <div>
              <h2 className="text-base sm:text-lg font-bold">Колода карт «Бункер IT»</h2>
              <p className="text-xs text-slate-400">Всего 300 карт по 10 категориям</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или описанию карты..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {cat} {cat !== 'Все' && deck[cat] ? `(${deck[cat].length})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Загрузка карт...
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Карты не найдены по запросу «{searchQuery}»
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCards.map((c, i) => {
                const color = CARD_COLORS[c.category] || '#475569';
                return (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white inline-block mb-1.5"
                        style={{ backgroundColor: color }}
                      >
                        {c.category}
                      </span>
                      <h4 className="text-sm font-bold text-white mb-1">{c.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{c.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400 flex items-center justify-between">
          <span>Найдено карт: {filteredCards.length}</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
