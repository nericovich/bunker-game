import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, ArrowLeft } from 'lucide-react';

interface HostLoginProps {
  onLogin: (password: string) => Promise<boolean>;
  onCancel: () => void;
}

export function HostLogin({ onLogin, onCancel }: HostLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    const success = await onLogin(password);
    setLoading(false);

    if (!success) {
      setError('Неверный пароль ведущего. Попробуйте еще раз.');
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-400 mx-auto mb-4">
        <Lock className="w-6 h-6" />
      </div>

      <h1 className="text-xl font-bold text-center text-white mb-2">
        Вход ведущего
      </h1>
      <p className="text-xs text-center text-slate-400 mb-6 leading-relaxed">
        Режим ведущего защищён паролем. Игрокам доступно только общее табло.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 flex items-center gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Пароль ведущего
          </label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль..."
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
            <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          </div>
          <p className="text-[11px] text-amber-400/90 mt-1.5 font-medium">
            ай ай ай, зачем тебе сюда?
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Проверка...' : 'Войти в панель ведущего'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Вернуться к табло игроков</span>
          </button>
        </div>
      </form>
    </div>
  );
}
