import React, { useState } from 'react';
import { User, LogIn, Key, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { AuthUser } from '../types';
import { api } from '../services/api';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  currentUser: AuthUser | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
}) => {
  const [username, setUsername] = useState('hamid');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuickSelect = (userKey: 'hamid' | 'fati') => {
    if (userKey === 'hamid') {
      setUsername('hamid');
    } else {
      setUsername('fati');
    }
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('لطفا نام کاربری و رمز عبور را وارد کنید');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.login(username, password);
      if (res.success && res.user) {
        localStorage.setItem('duospend_auth_user', JSON.stringify(res.user));
        onLoginSuccess(res.user);
        onClose();
      } else {
        setErrorMsg('ورود ناموفق بود. اطلاعات ورود را بررسی کنید.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'نام کاربری یا رمز عبور اشتباه است.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="ورود به حساب کاربری">
      <div className="space-y-6">
        <div className="flex items-center space-x-3 text-zinc-400 text-sm">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p>لطفا نام کاربری خود را برای دسترسی انتخاب کنید.</p>
        </div>

        {/* Quick User Selection */}
        <div>
          <label className="text-sm font-medium text-zinc-300 block mb-2">انتخاب سریع:</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleQuickSelect('hamid')}
              className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                username === 'hamid'
                  ? 'border-indigo-500/50 bg-indigo-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">👨‍💼</span>
                <div>
                  <div className="text-xs font-bold text-zinc-200">کاربر اول</div>
                  <div className="text-[10px] text-zinc-500">کاربر فعال</div>
                </div>
              </div>
              {username === 'hamid' && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleQuickSelect('fati')}
              className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                username === 'fati'
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">👩‍⚕️</span>
                <div>
                  <div className="text-xs font-bold text-zinc-200">کاربر دوم</div>
                  <div className="text-[10px] text-zinc-500">کاربر فعال</div>
                </div>
              </div>
              {username === 'fati' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="نام کاربری"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
          />
          <Input
            label="رمز عبور"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Key className="w-4 h-4" />}
            required
            className="font-mono tracking-widest"
          />

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400 font-medium">
              {errorMsg}
            </div>
          )}

          <Button type="submit" isLoading={isLoading} leftIcon={<LogIn className="w-4 h-4" />} className="w-full bg-indigo-600">
            ورود به سیستم
          </Button>
        </form>

        {currentUser && (
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-sm text-zinc-400">
            <span>وارد شده به عنوان: <strong className="text-zinc-200">{currentUser.name}</strong></span>
            <button
              onClick={() => {
                localStorage.removeItem('duospend_auth_user');
                window.location.reload();
              }}
              className="text-rose-400 font-bold hover:text-rose-300 transition-colors"
            >
              خروج از حساب
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
