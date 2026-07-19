import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Phone, Bug, Cloud, BookOpen,
  TrendingUp, Menu, X, Bell, Sun, Moon, Leaf, ChevronRight, Languages, Check, LogOut
} from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { useLang, LANGUAGES } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { dark, setDark } = useDarkMode();
  const { lang, setLang, t } = useLang();
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const langRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Close lang dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navItems = [
    { to: '/dashboard',    icon: LayoutDashboard, key: 'nav_dashboard' },
    { to: '/farmers',      icon: Users,            key: 'nav_farmers',  adminOnly: true },
    { to: '/calls',        icon: Phone,            key: 'nav_calls',    adminOnly: true },
    { to: '/pest-control', icon: Bug,              key: 'nav_pest' },
    { to: '/weather',      icon: Cloud,            key: 'nav_weather' },
    { to: '/schemes',      icon: BookOpen,         key: 'nav_schemes' },
    { to: '/market',       icon: TrendingUp,       key: 'nav_market' },
  ].filter(item => !item.adminOnly || isAdmin);

  const currentLang = LANGUAGES.find(l => l.code === lang);
  const currentPage = navItems.find(n => location.pathname.startsWith(n.to));

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col',
          'bg-white dark:bg-dark-800 border-r border-gray-100 dark:border-gray-700/50',
          'transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-700/50">
          <img src="/logo.png" alt="AgriBot Logo" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">AgriBot</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">Dashboard v1.0</p>
          </div>
          <button className="ml-auto lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Navigation</p>
          {navItems.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx('nav-link group', isActive ? 'nav-link-active' : 'nav-link-inactive')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary-600')} />
                  <div className="flex-1 min-w-0">
                    <div className={clsx('text-sm font-medium leading-tight truncate', isActive ? 'text-white' : '')}>{t(key)}</div>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer user + Logout */}
        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary-50 dark:bg-primary-900/20">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">AD</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{user?.email || 'Admin User'}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">TN Agriculture Dept.</p>
            </div>
            <button onClick={handleLogout} title="Logout"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 h-14 bg-white dark:bg-dark-800 border-b border-gray-100 dark:border-gray-700/50 flex items-center px-4 gap-3">
          <button className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
              {currentPage ? t(currentPage.key) : 'AgriBot'}
            </h2>
            <p className="text-xs text-gray-400 hidden sm:block">Tamil Nadu Agricultural Intelligence Platform</p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Live badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-xs font-medium text-primary-700 dark:text-primary-300">{t('gen_live')}</span>
            </div>

            {/* Language switcher */}
            <div className="relative" ref={langRef}>
              <button
                id="lang-switcher-btn"
                onClick={() => setLangOpen(o => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                title="Change language"
              >
                <Languages className="w-4 h-4" />
                <span className="text-xs font-semibold hidden sm:inline">{currentLang?.flag} {currentLang?.nativeLabel}</span>
              </button>

              {langOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-dark-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                  <div className="px-3 pt-2.5 pb-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Select Language</p>
                  </div>
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                        lang === l.code
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                    >
                      <span className="text-base">{l.flag}</span>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium leading-tight">{l.nativeLabel}</div>
                        <div className="text-[10px] text-gray-400">{l.label}</div>
                      </div>
                      {lang === l.code && <Check className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification */}
            <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Dark mode */}
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="h-full p-4 sm:p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
