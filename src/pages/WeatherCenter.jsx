import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Cloud, AlertTriangle, Thermometer, Droplets, Wind,
  Bell, CheckCircle, Search, RefreshCw, X, Send, MapPin, ChevronDown
} from 'lucide-react';
import { fetchRealTimeWeather, TN_DISTRICTS } from '../data/weatherService';
import { useLang } from '../context/LanguageContext';
import clsx from 'clsx';

const conditionIcon = {
  'Sunny': '☀️', 'Partly Cloudy': '⛅', 'Cloudy': '☁️',
  'Light Rain': '🌦', 'Heavy Rain': '🌧', 'Thunderstorm': '⛈', 'default': '🌤',
};

const alertConfig = {
  'Heavy Rain':      { cls: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200',     icon: '🌧' },
  'Heat Wave':       { cls: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200',           icon: '🌡️' },
  'Thunderstorm':    { cls: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-200', icon: '⛈' },
  'Drought':         { cls: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200', icon: '🏜' },
  'Cyclone Warning': { cls: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-200', icon: '🌀' },
  'Cold Wave':       { cls: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200', icon: '❄️' },
};

const ALERT_TYPES = ['Heavy Rain', 'Heat Wave', 'Thunderstorm', 'Drought', 'Cyclone Warning', 'Cold Wave', 'General Advisory'];

/** ─── Alert Dialog ───────────────────────────────────────────────── */
function AlertDialog({ weatherData, onClose }) {
  const districtNames = TN_DISTRICTS
    .filter((d, i, a) => a.findIndex(x => x.district === d.district) === i)
    .map(d => d.district)
    .sort();

  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [alertType, setAlertType]               = useState('General Advisory');
  const [message, setMessage]                   = useState('');
  const [sent, setSent]                         = useState(false);
  const [dropdownOpen, setDropdownOpen]         = useState(false);
  const [distSearch, setDistSearch]             = useState('');
  const dropRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const liveWeather = weatherData.find(w => w.district === selectedDistrict);

  const autoMessage = (district, type) => {
    const msgs = {
      'Heavy Rain':      `⚠️ Heavy rain alert for ${district}. Farmers please take precautions. Avoid field work and protect harvested produce.`,
      'Heat Wave':       `🌡️ Extreme heat advisory for ${district}. Temperature exceeding 42°C. Reduce outdoor activity between 12–4 PM.`,
      'Thunderstorm':    `⛈ Thunderstorm warning for ${district}. Stay indoors. Protect livestock and secure farm equipment immediately.`,
      'Drought':         `🏜 Drought advisory for ${district}. Water conservation measures are advised. Practice deficit irrigation.`,
      'Cyclone Warning': `🌀 Cyclone alert for ${district}. Move to safe location. Secure all farm structures and equipment.`,
      'Cold Wave':       `❄️ Cold wave alert for ${district}. Protect crops from frost. Cover nursery plants overnight.`,
      'General Advisory':`📢 Weather advisory for ${district}. Please monitor local weather conditions and take appropriate farming precautions.`,
    };
    return msgs[type] || msgs['General Advisory'];
  };

  const handleDistrictSelect = (d) => {
    setSelectedDistrict(d);
    setDropdownOpen(false);
    setDistSearch('');
    setMessage(autoMessage(d, alertType));
  };

  const handleTypeChange = (t) => {
    setAlertType(t);
    if (selectedDistrict) setMessage(autoMessage(selectedDistrict, t));
  };

  const handleSend = () => {
    if (!selectedDistrict || !message) return;
    setSent(true);
    setTimeout(() => { setSent(false); setSelectedDistrict(''); setMessage(''); }, 3000);
  };

  const filteredDistricts = districtNames.filter(d =>
    d.toLowerCase().includes(distSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-gray-900 dark:text-white">Send Weather Alert</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* District selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <MapPin className="inline w-3.5 h-3.5 mr-1 text-primary-500" />Select District
            </label>
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-dark-700 text-sm text-left hover:border-primary-400 transition-colors">
                <span className={selectedDistrict ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'}>
                  {selectedDistrict || 'Choose a district…'}
                </span>
                <ChevronDown className={clsx('w-4 h-4 text-gray-400 transition-transform', dropdownOpen && 'rotate-180')} />
              </button>

              {dropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden">
                  {/* Search inside dropdown */}
                  <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        autoFocus
                        value={distSearch}
                        onChange={e => setDistSearch(e.target.value)}
                        placeholder="Search district…"
                        className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-dark-700 text-gray-800 dark:text-gray-200 outline-none"
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {filteredDistricts.map(d => (
                      <button key={d} onClick={() => handleDistrictSelect(d)}
                        className={clsx('w-full text-left px-4 py-2 text-sm transition-colors',
                          d === selectedDistrict
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-semibold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50')}>
                        {d}
                      </button>
                    ))}
                    {filteredDistricts.length === 0 && (
                      <p className="px-4 py-3 text-sm text-gray-400 text-center">No districts found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live weather preview for selected district */}
          {liveWeather && (
            <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800">
              <span className="text-3xl">{conditionIcon[liveWeather.current?.condition] || '🌤'}</span>
              <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-orange-400" /><b className="text-gray-800 dark:text-white text-sm">{liveWeather.current?.temp}°C</b></span>
                <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-blue-400" />{liveWeather.current?.humidity}%</span>
                <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-teal-400" />{liveWeather.current?.wind} km/h</span>
              </div>
              {liveWeather.alert && (
                <span className={clsx('ml-auto text-xs px-2 py-1 rounded-lg font-semibold', alertConfig[liveWeather.alert]?.cls)}>
                  {alertConfig[liveWeather.alert]?.icon} {liveWeather.alert}
                </span>
              )}
            </div>
          )}

          {/* Alert type selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Alert Type</label>
            <div className="flex flex-wrap gap-2">
              {ALERT_TYPES.map(type => (
                <button key={type} onClick={() => handleTypeChange(type)}
                  className={clsx('px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                    alertType === type
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary-400 hover:text-primary-600')}>
                  {alertConfig[type]?.icon || '📢'} {type}
                </button>
              ))}
            </div>
          </div>

          {/* Alert message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Alert Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Select a district above to auto-fill message, or type your own…"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-dark-700 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary-400 transition-colors resize-none"
            />
          </div>

          {/* Send button */}
          {sent ? (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm font-semibold border border-green-200 dark:border-green-700">
              <CheckCircle className="w-4 h-4" /> Alert sent to {selectedDistrict} farmers!
            </div>
          ) : (
            <button
              onClick={handleSend}
              disabled={!selectedDistrict || !message}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 4px 16px rgba(217,119,6,0.3)' }}>
              <Send className="w-4 h-4" /> Send Alert to {selectedDistrict || 'District'} Farmers
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** ─── Main WeatherCenter ─────────────────────────────────────────── */
export default function WeatherCenter() {
  const { t, tData } = useLang();
  const [search, setSearch]           = useState('');
  const [filterAlert, setFilterAlert] = useState(false);
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError]             = useState('');
  const [showAlertDialog, setShowAlertDialog] = useState(false);

  const loadWeather = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await fetchRealTimeWeather();
      if (data.length === 0) throw new Error('No data');
      setWeatherData(data);
      setLastUpdated(new Date());
    } catch {
      setError('Could not load live weather. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWeather(); }, [loadWeather]);

  const filtered = weatherData.filter(w => {
    const matchSearch = !search || w.district.toLowerCase().includes(search.toLowerCase());
    const matchAlert  = !filterAlert || Boolean(w.alert);
    return matchSearch && matchAlert;
  });

  const alertDistricts = weatherData.filter(w => w.alert);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="page-header mb-0">
          <h1 className="page-title">{t('weather_title')}</h1>
          <p className="page-subtitle">
            {loading ? 'Loading all Tamil Nadu districts…' : `${weatherData.length} districts · Tamil Nadu live weather`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* ── Send Alert Button ── */}
          <button
            onClick={() => setShowAlertDialog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 2px 10px rgba(217,119,6,0.3)' }}>
            <Bell className="w-4 h-4" /> Send District Alert
          </button>
          {/* Refresh */}
          <button onClick={loadWeather} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-primary-200 dark:border-primary-700 transition-all disabled:opacity-50">
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
            {loading ? 'Updating…' : 'Refresh'}
          </button>
        </div>
        {lastUpdated && (
          <p className="w-full text-right text-[11px] text-gray-400 -mt-4">
            🟢 Live · Last updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && weatherData.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full" />
              </div>
              <div className="h-8 bg-gray-100 dark:bg-gray-700/50 rounded-lg mb-3" />
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[...Array(3)].map((_, j) => <div key={j} className="h-10 bg-gray-100 dark:bg-gray-700/30 rounded-lg" />)}
              </div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, j) => <div key={j} className="flex-1 h-12 bg-gray-100 dark:bg-gray-700/30 rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active alerts banner */}
      {!loading && alertDistricts.length > 0 && (
        <div className="card p-4 border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-sm text-amber-800 dark:text-amber-200">
              {alertDistricts.length} Active Weather Alerts
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertDistricts.map(w => (
              <span key={w.district}
                className={clsx('badge text-xs flex items-center gap-1', alertConfig[w.alert]?.cls || 'badge-yellow')}>
                {alertConfig[w.alert]?.icon} {w.district} · {w.alert}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {weatherData.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search district…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button
            onClick={() => setFilterAlert(f => !f)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
              filterAlert
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50')}>
            <AlertTriangle className="w-4 h-4" /> Alerts Only {filterAlert && `(${alertDistricts.length})`}
          </button>
          {loading && weatherData.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-primary-600">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Refreshing…
            </div>
          )}
        </div>
      )}

      {/* District weather grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(weather => {
            const cfg   = weather.alert ? alertConfig[weather.alert] : null;
            const today = weather.forecast[0];
            return (
              <div key={weather.district}
                className={clsx('card p-4 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
                  cfg ? `border-2 ${cfg.cls}` : 'border-gray-100 dark:border-gray-700/50')}>

                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">{tData(weather.district)}</h3>
                    <p className="text-[10px] text-gray-400">{weather.farmerCount} farmers</p>
                  </div>
                  <span className="text-2xl">{conditionIcon[today?.condition] || conditionIcon.default}</span>
                </div>

                {/* Alert badge */}
                {weather.alert && (
                  <div className={clsx('flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold mb-2', cfg?.cls)}>
                    {cfg?.icon} {weather.alert}
                  </div>
                )}

                {/* Current readings */}
                {weather.current && (
                  <div className="flex items-center gap-3 mb-2 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/30 text-xs">
                    <span className="flex items-center gap-0.5"><Thermometer className="w-3 h-3 text-orange-400" /><b className="text-gray-800 dark:text-white">{weather.current.temp}°C</b></span>
                    <span className="flex items-center gap-0.5 text-gray-500"><Droplets className="w-3 h-3 text-blue-400" />{weather.current.humidity}%</span>
                    <span className="flex items-center gap-0.5 text-gray-500"><Wind className="w-3 h-3 text-teal-400" />{weather.current.wind}km/h</span>
                  </div>
                )}

                {/* Max/Min/Rain */}
                <div className="grid grid-cols-3 gap-1 mb-2 text-center">
                  <div><span className="text-xs font-bold text-red-500">{today?.tempMax}°</span><p className="text-[9px] text-gray-400">Max</p></div>
                  <div><span className="text-xs font-bold text-blue-500">{today?.tempMin}°</span><p className="text-[9px] text-gray-400">Min</p></div>
                  <div><span className="text-xs font-bold text-blue-400">{today?.rainChance}%</span><p className="text-[9px] text-gray-400">Rain</p></div>
                </div>

                {/* 5-day forecast strip */}
                <div className="flex gap-1">
                  {weather.forecast.map((day, i) => (
                    <div key={i} className={clsx('flex-1 text-center p-1 rounded-lg', i === 0 ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-gray-50 dark:bg-gray-700/30')}>
                      <p className="text-[8px] text-gray-400 truncate">{day.date.split(',')[0]}</p>
                      <div className="text-sm">{conditionIcon[day.condition] || '🌤'}</div>
                      <p className="text-[9px] font-bold text-gray-700 dark:text-gray-300">{day.tempMax}°</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-gray-400">
              <Cloud className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No districts match your search</p>
            </div>
          )}
        </div>
      )}

      {/* Alert Dialog */}
      {showAlertDialog && (
        <AlertDialog weatherData={weatherData} onClose={() => setShowAlertDialog(false)} />
      )}
    </div>
  );
}
