import React from 'react';
import { X, ShieldAlert, Users, Award, BookCheck } from 'lucide-react';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameRulesModal({ isOpen, onClose }: GameRulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-white">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookCheck className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-bold">Правила игры «Бункер IT»</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Цель игры
            </h3>
            <p>
              Наступил техногенный IT-апокалипсис. На спасительном сервере / в бункере строго ограничено число мест (обычно половина игроков). Ваша цель — доказать команде, что ваши навыки, стек, опыт и перки жизненно необходимы для восстановления IT-инфраструктуры цивилизации.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-400" />
              Ход партии и раунды
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300">
              <li>
                <strong className="text-white">Раунд 1:</strong> Игроки по очереди открывают <em>Профессию</em> и делают короткую самопрезентацию (30–60 секунд).
              </li>
              <li>
                <strong className="text-white">Раунд 2–5:</strong> Ведущий объявляет категорию раунда (Биология, Здоровье, Хобби, Багаж или Факт). Каждый игрок вскрывает соответствующую карту и аргументирует свою пользу.
              </li>
              <li>
                <strong className="text-white">Перки:</strong> Могут быть разыграны в любой момент или по условию карты (например, отмена голосования, переброс карты, иммунитет).
              </li>
              <li>
                <strong className="text-white">Голосование:</strong> В конце каждого раунда игроки голосуют за того, кто наименее полезен и покидает бункер.
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              Финал
            </h3>
            <p>
              Когда число оставшихся выживших сравнивается с числом спасательных мест в Бункере, оставшиеся специалисты оценивают свою готовность противостоять Угрозе бункера и возродить мир!
            </p>
          </div>
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
