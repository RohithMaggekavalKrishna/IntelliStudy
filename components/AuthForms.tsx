import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { Brain, ArrowRight, Lock, Mail, User as UserIcon } from 'lucide-react';

interface AuthFormsProps {
  onLogin: (user: User) => void;
}

export const AuthForms: React.FC<AuthFormsProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const user = await db.login(formData.email, formData.password);
        onLogin(user);
      } else {
        if (!formData.name) throw new Error("Name is required");
        const user = await db.register(formData.name, formData.email, formData.password);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 p-8 text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-sm mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">IntelliStudy</h1>
          <p className="text-indigo-200 mt-2 text-sm">Track your habits. Master your mind.</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <div className="flex gap-4 mb-6 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition ${isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition ${!isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="password"
                placeholder="Password"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};