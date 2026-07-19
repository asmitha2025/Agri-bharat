import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Leaf, Shield, Lock, Mail, User, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register, loginWithGoogle, error, setError } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // Login state
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Register state
  const [rName, setRName]           = useState('');
  const [rEmail, setREmail]         = useState('');
  const [rPassword, setRPassword]   = useState('');
  const [rConfirm, setRConfirm]     = useState('');
  const [rShowPass, setRShowPass]   = useState(false);
  const [rShowConf, setRShowConf]   = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const switchTab = (t) => { setTab(t); setError(''); setSuccess(''); };

  /* ── Login Submit ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) navigate('/dashboard', { replace: true });
  };

  /* ── Register Submit ── */
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!rName || !rEmail || !rPassword || !rConfirm) { setError('Please fill in all fields.'); return; }
    if (rPassword !== rConfirm) { setError('Passwords do not match.'); return; }
    if (rPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const ok = await register(rName, rEmail, rPassword);
    setLoading(false);
    if (ok) {
      setSuccess('Account created! Redirecting…');
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
    }
  };

  /* ── Google Sign-In ── */
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const ok = await loginWithGoogle();
    setLoading(false);
    if (ok) navigate('/dashboard', { replace: true });
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(124,58,237,0.3)',
  };
  const inputFocus = (e) => (e.target.style.borderColor = 'rgba(124,58,237,0.8)');
  const inputBlur  = (e) => (e.target.style.borderColor = 'rgba(124,58,237,0.3)');

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a4e 40%, #24243e 70%, #0f2027 100%)' }}>

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #059669, transparent)' }} />
        {Array.from({length: 80}).map((_, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full opacity-20"
            style={{ background: '#7c3aed', left: `${(i%10)*11}%`, top: `${Math.floor(i/10)*13}%` }} />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-5xl mx-4 min-h-[580px] rounded-3xl overflow-hidden shadow-2xl"
        style={{ boxShadow: '0 25px 80px rgba(124,58,237,0.3)' }}>

        {/* ── Left Panel ── */}
        <div className="hidden md:flex flex-col items-center justify-center w-1/2 p-10 relative"
          style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)' }}>
          <div className="absolute top-8 left-8 w-3 h-3 rounded-full bg-purple-400 opacity-60 animate-ping" />
          <div className="absolute top-24 right-12 w-2 h-2 rounded-full bg-green-400 opacity-60 animate-pulse" />
          <div className="absolute bottom-24 left-12 w-2 h-2 rounded-full bg-blue-400 opacity-60 animate-ping" style={{animationDelay:'0.5s'}} />
          <div className="absolute bottom-8 right-8 w-3 h-3 rounded-full bg-purple-300 opacity-60 animate-pulse" style={{animationDelay:'1s'}} />

          <div className="relative flex flex-col items-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 w-24 h-24 rounded-full opacity-40 blur-xl"
              style={{ background: 'radial-gradient(circle, #7c3aed, #059669)' }} />
            <div className="relative w-48 h-72 rounded-3xl border-2 border-purple-500/40 flex flex-col overflow-hidden"
              style={{ background: 'linear-gradient(180deg, #1e1b4b, #0f172a)', boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}>
              <div className="h-6 flex items-center px-4 gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              </div>
              <div className="flex-1 p-3 space-y-2">
                <div className="h-2 bg-purple-500/40 rounded w-3/4" />
                <div className="h-2 bg-green-500/40 rounded w-1/2" />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[...Array(4)].map((_,i) => (
                    <div key={i} className="h-12 rounded-lg opacity-60" style={{
                      background: i%2===0 ? 'rgba(124,58,237,0.3)' : 'rgba(5,150,105,0.3)'
                    }} />
                  ))}
                </div>
                <div className="h-16 bg-blue-500/20 rounded-lg mt-2" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(15,12,41,0.8) 100%)' }}>
                <div className="p-4 rounded-full border-2 border-purple-400/60"
                  style={{ background: 'rgba(124,58,237,0.2)', backdropFilter: 'blur(8px)' }}>
                  <Shield className="w-10 h-10 text-purple-300" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">AgriBot Portal</h2>
            <p className="text-purple-300/80 text-sm leading-relaxed max-w-xs">
              Manage farmers, monitor crops, track market prices and AI pest control across Tamil Nadu.
            </p>
          </div>

          {/* Role info */}
          <div className="mt-6 w-full max-w-xs space-y-2">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-purple-500/20"
              style={{ background: 'rgba(124,58,237,0.1)' }}>
              <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-purple-300">Admin</p>
                <p className="text-[10px] text-purple-400/70">Full access to all pages</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-green-500/20"
              style={{ background: 'rgba(5,150,105,0.1)' }}>
              <User className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-300">User</p>
                <p className="text-[10px] text-green-400/70">Dashboard, Weather, Market & Schemes</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Form ── */}
        <div className="flex flex-col justify-center w-full md:w-1/2 p-8 md:p-12"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>

          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo.png" alt="AgriBot" className="w-12 h-12 rounded-2xl object-cover shadow-lg" />
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">AgriBot</h1>
              <p className="text-purple-300 text-xs">Dashboard Portal</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {[['login','Login'],['register','Register']].map(([key, label]) => (
              <button key={key} onClick={() => switchTab(key)}
                className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all"
                style={tab === key
                  ? { background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', boxShadow: '0 2px 12px rgba(124,58,237,0.4)' }
                  : { color: 'rgba(255,255,255,0.5)' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-300 border border-red-500/30 flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)' }}>
              <Shield className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-green-300 border border-green-500/30"
              style={{ background: 'rgba(5,150,105,0.1)' }}>
              ✅ {success}
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="mb-1">
                <h2 className="text-xl font-bold text-white">Welcome back</h2>
                <p className="text-gray-400 text-xs mt-0.5">Sign in to your account</p>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="your@email.com" autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                    style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="••••••••" autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none"
                    style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                  <button type="button" onClick={() => setShowPass(p=>!p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
                {loading ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Signing in…</> : 'LOGIN'}
              </button>

              {/* Google divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <span className="text-xs text-gray-500">OR</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              </div>

              {/* Google Sign-In button */}
              <button type="button" onClick={handleGoogleSignIn} disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 transition-all disabled:opacity-60 hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.95)', color: '#1f2937' }}>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <p className="text-center text-xs text-gray-500">
                No account?{' '}
                <button type="button" onClick={() => switchTab('register')} className="text-purple-400 hover:text-purple-300 font-medium">Register here</button>
              </p>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="mb-1">
                <h2 className="text-xl font-bold text-white">Create Account</h2>
                <p className="text-gray-400 text-xs mt-0.5">Register to access the dashboard</p>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={rName} onChange={e => { setRName(e.target.value); setError(''); }}
                    placeholder="Your full name" autoComplete="name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none"
                    style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" value={rEmail} onChange={e => { setREmail(e.target.value); setError(''); }}
                    placeholder="your@email.com" autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none"
                    style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={rShowPass ? 'text':'password'} value={rPassword}
                    onChange={e => { setRPassword(e.target.value); setError(''); }}
                    placeholder="Min. 6 characters" autoComplete="new-password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none"
                    style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                  <button type="button" onClick={() => setRShowPass(p=>!p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                    {rShowPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={rShowConf ? 'text':'password'} value={rConfirm}
                    onChange={e => { setRConfirm(e.target.value); setError(''); }}
                    placeholder="Repeat password" autoComplete="new-password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none"
                    style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                  <button type="button" onClick={() => setRShowConf(p=>!p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                    {rShowConf ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg, #059669, #065f46)', boxShadow: '0 4px 20px rgba(5,150,105,0.4)' }}>
                {loading
                  ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Creating account…</>
                  : <><UserPlus className="w-4 h-4"/>CREATE ACCOUNT</>}
              </button>

              {/* Google divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <span className="text-xs text-gray-500">OR</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              </div>

              {/* Google Sign-In button */}
              <button type="button" onClick={handleGoogleSignIn} disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 transition-all disabled:opacity-60 hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.95)', color: '#1f2937' }}>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>

              <p className="text-center text-xs text-gray-500">
                Already have an account?{' '}
                <button type="button" onClick={() => switchTab('login')} className="text-purple-400 hover:text-purple-300 font-medium">Login</button>
              </p>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-xs text-gray-600 text-center">🔒 AgriBot Tamil Nadu · Secure Portal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
