'use client';

import { useState } from 'react';
import { Mail, Lock, User, Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthScreenProps {
  onSkip?: () => void;
}

export default function AuthScreen({ onSkip }: AuthScreenProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!username.trim()) {
          setError('Brukernavn er påkrevd');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, username);
        if (error) {
          setError(error.message || 'Kunne ikke opprette konto');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message || 'Feil e-post eller passord');
        }
      }
    } catch (err) {
      setError('Noe gikk galt. Prøv igjen.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-electric/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-neon-green/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="max-w-md mx-auto w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="text-electric" size={32} />
              <h1 className="text-3xl font-display font-bold">
                <span className="bg-gradient-to-r from-electric to-neon-green bg-clip-text text-transparent">
                  FitTrack
                </span>
              </h1>
            </div>
            <p className="text-soft-white/60">
              {mode === 'login' ? 'Logg inn for å fortsette' : 'Opprett en konto'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="relative">
                <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-soft-white/40" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Brukernavn"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-electric outline-none text-lg"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-soft-white/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-post"
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-electric outline-none text-lg"
                required
              />
            </div>

            <div className="relative">
              <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-soft-white/40" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passord"
                className="w-full pl-12 pr-12 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-electric outline-none text-lg"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-soft-white/40"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-coral/20 border border-coral/30 text-coral text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-electric to-neon-green text-midnight font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : mode === 'login' ? (
                'Logg inn'
              ) : (
                'Opprett konto'
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="text-electric"
            >
              {mode === 'login' ? 'Har du ikke konto? Registrer deg' : 'Har du allerede konto? Logg inn'}
            </button>
          </div>

          {/* Skip button */}
          {onSkip && (
            <div className="text-center mt-8">
              <button
                onClick={onSkip}
                className="text-soft-white/50 text-sm"
              >
                Fortsett uten innlogging →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
