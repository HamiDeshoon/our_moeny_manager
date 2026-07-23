import React, { useState } from 'react';
import { X, Lock, User, LogIn, Key, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { AuthUser } from '../types';
import { api } from '../services/api';

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

  if (!isOpen) return null;

  const handleQuickSelect = (userKey: 'hamid' | 'fati') => {
    if (userKey === 'hamid') {
      setUsername('hamid');
      setPassword('19981998');
    } else {
      setUsername('fati');
      setPassword('13771377');
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">ورود اعضای خانواده</h2>
              <p className="text-xs text-slate-500 font-medium">Household Member Portal</p>
            </div>
          </div>
          {currentUser && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick User Selection Buttons */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">انتخاب سریع کاربر (Quick Select):</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleQuickSelect('hamid')}
              className={`p-3.5 rounded-2xl border text-right transition flex items-center justify-between cursor-pointer ${
                username === 'hamid'
                  ? 'border-sky-500 bg-sky-50/70 shadow-sm'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span className="text-2xl">👨‍💼</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">سیدحمید عقل مندصرمی</div>
                  <div className="text-[10px] text-slate-500 font-mono">کاربر فعال</div>
                </div>
              </div>
              {username === 'hamid' && <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleQuickSelect('fati')}
              className={`p-3.5 rounded-2xl border text-right transition flex items-center justify-between cursor-pointer ${
                username === 'fati'
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-sm'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span className="text-2xl">👩‍⚕️</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">فاطمه نیک سرشت</div>
                  <div className="text-[10px] text-slate-500 font-mono">کاربر فعال</div>
                </div>
              </div>
              {username === 'fati' && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
            </button>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              <span>نام کاربری (Username)</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="نام کاربری..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              <span>رمز عبور (Password)</span>
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="• • • • • • • •"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition font-mono"
                required
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
              {errorMsg}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'در حال ورود...' : 'ورود به سیستم (Login)'}</span>
            </button>
          </div>
        </form>

        {currentUser && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Currently logged in as: <strong className="text-slate-800">{currentUser.name}</strong></span>
            <button
              onClick={() => {
                localStorage.removeItem('duospend_auth_user');
                window.location.reload();
              }}
              className="text-rose-600 font-bold hover:underline"
            >
              خروج (Logout)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
