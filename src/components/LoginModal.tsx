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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          <p>لطفا نام کاربری و رمز عبور خود را برای دسترسی وارد کنید.</p>
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
