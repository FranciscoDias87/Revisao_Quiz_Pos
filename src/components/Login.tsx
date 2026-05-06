import React, { useState } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Chrome, GraduationCap, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 text-center bg-indigo-600 text-white">
            <div className="inline-flex p-3 bg-white/20 rounded-2xl mb-4 backdrop-blur-sm">
              <GraduationCap size={40} />
            </div>
            <h1 className="text-2xl font-bold">EduReview</h1>
            <p className="text-indigo-100 mt-1">Sua jornada de conhecimento começa aqui</p>
          </div>

          <div className="p-8">
            <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
              <button 
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
              >
                Entrar
              </button>
              <button 
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
              >
                Cadastrar
              </button>
            </div>

            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all mb-6 group"
            >
              {loading ? <Loader2 className="animate-spin text-slate-400" /> : <Chrome className="text-rose-500 group-hover:scale-110 transition-transform" />}
              Continuar com Google
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-bold">ou use seu email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="relative">
                      <input 
                        required
                        type="text" 
                        placeholder="Nome Completo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-all"
                      />
                      <GraduationCap className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <input 
                  required
                  type="email" 
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-all"
                />
                <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
              </div>

              <div className="relative">
                <input 
                  required
                  type="password" 
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-all"
                />
                <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 p-3 rounded-lg border border-rose-100">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    {isLogin ? 'Entrar' : 'Criar Conta'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
