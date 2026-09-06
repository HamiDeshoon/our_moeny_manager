import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Key, LogIn, ShieldAlert } from 'lucide-react';
import { AuthUser } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface AuthGateProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('لطفاً نام کاربری و رمز عبور را وارد کنید');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.login(username, password);
      if (res.success && res.user) {
        localStorage.setItem('duospend_auth_user', JSON.stringify(res.user));
        onLoginSuccess(res.user);
      } else {
        setErrorMsg('ورود ناموفق بود. مشخصات وارد شده معتبر نیست.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'نام کاربری یا رمز عبور اشتباه است.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 px-4 overflow-hidden" dir="rtl">
      {/* Subtle radial background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.15)_0,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm rounded-3xl bg-zinc-900/90 border border-white/10 p-7 shadow-2xl backdrop-blur-xl"
      >
        {/* App Logo & Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shadow-inner shadow-indigo-500/20">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">DuoSpend</h1>
          <p className="mt-1 text-xs text-zinc-400 font-medium">مدیریت مالی هوشمند زوج‌ها</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="نام کاربری"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="نام کاربری خود را وارد کنید"
            leftIcon={<User className="w-4 h-4" />}
            autoFocus
            required
          />

          <Input
            label="رمز عبور"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Key className="w-4 h-4" />}
            className="font-mono tracking-widest text-left"
            dir="ltr"
            required
          />

          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400 font-medium flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<LogIn className="w-4 h-4" />}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 mt-2 shadow-lg shadow-indigo-500/25 rounded-xl"
          >
            ورود به سیستم
          </Button>
        </form>

        <div className="mt-6 text-center text-[11px] text-zinc-500">
          دسترسی امن فقط برای اعضای خانواده DuoSpend
        </div>
      </motion.div>
    </div>
  );
};
