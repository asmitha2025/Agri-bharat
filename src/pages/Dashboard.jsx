import { useState, useEffect } from 'react';
import { Users, Phone, AlertTriangle, Leaf, TrendingUp, Activity, MapPin, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { StatCard, CardSkeleton } from '../components/ui';
import { STATS, DISTRICTS } from '../data/mockData';
import { fetchCalls, fetchWeatherData } from '../data/dataService';
import { useLang } from '../context/LanguageContext';
import clsx from 'clsx';

const alertColor = { 'Heavy Rain': 'badge-blue', 'Heat Wave': 'badge-red', 'Drought': 'badge-yellow', 'Cyclone Warning': 'badge-red', 'Cold Wave': 'badge-blue' };

export default function Dashboard() {
  const { t, tData } = useLang();
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState([]);
  const [weather, setWeather] = useState([]);

  useEffect(() => {
    Promise.all([fetchCalls(10), fetchWeatherData()]).then(([callData, weatherData]) => {
      setCalls(callData.slice(0, 10));
      setWeather(weatherData);
      setLoading(false);
    });
  }, []);

  const activeAlerts = weather.filter(w => w.alert);
  const localizedTopCrops = STATS.topCrops.map(c => ({ ...c, name: tData(c.name) }));
  const localizedDistrictCounts = STATS.districtCounts.map(d => ({ ...d, district: tData(d.district) }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{t('dash_title')}</h1>
        <p className="page-subtitle">{t('dash_subtitle')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={Users} label={t('dash_total_farmers')} labelTa="" value={STATS.totalFarmers} sub={t('dash_registered')} color="primary" />
            <StatCard icon={Phone} label={t('dash_calls_today')} labelTa="" value={STATS.callsToday} sub={t('dash_ai_calls')} color="blue" trend={12} />
            <StatCard icon={AlertTriangle} label={t('dash_active_alerts')} labelTa="" value={STATS.activeAlerts} sub={t('dash_district_alerts')} color="amber" />
            <StatCard icon={Leaf} label={t('dash_avg_land')} labelTa="" value={STATS.avgLandSize} sub={t('dash_per_farmer')} color="primary" />
          </>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent calls */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t('dash_live_calls')}</h3>
            <span className="ml-auto flex items-center gap-1 text-xs text-primary-600 font-medium">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse" />{t('gen_live')}
            </span>
          </div>
          <div className="space-y-2">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" />
                    </div>
                  </div>
                ))
              : calls.map(call => (
                  <div key={call.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold flex-shrink-0">
                      {call.farmerName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{tData(call.farmerName)}</p>
                        <span className={clsx('badge text-[10px]', call.status === 'completed' ? 'badge-green' : 'badge-red')}>
                          {call.status === 'completed' ? t('gen_completed') : t('gen_missed')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{call.summary}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <MapPin className="w-3 h-3" />{tData(call.district)}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Clock className="w-3 h-3" />{call.duration}
                        </span>
                        <span className="text-[10px] text-gray-400">{call.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* Weather alerts */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t('dash_weather_alerts')}</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {activeAlerts.slice(0, 10).map((w, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <span className="text-lg">
                  {w.alert === 'Heavy Rain' ? '🌧' : w.alert === 'Heat Wave' ? '🌡' : w.alert === 'Drought' ? '🏜' : w.alert === 'Cyclone Warning' ? '🌀' : '❄'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{tData(w.district)}</p>
                  <p className={clsx('badge mt-0.5', alertColor[w.alert] || 'badge-yellow')}>{w.alert}</p>
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{w.farmerCount} {t('gen_farmers_count')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top crops chart */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t('dash_top_crops')}</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={localizedTopCrops} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={130} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {localizedTopCrops.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#16a34a' : i === 1 ? '#22c55e' : i === 2 ? '#4ade80' : i === 3 ? '#f59e0b' : '#86efac'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* District distribution */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-primary-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t('dash_district_dist')}</h3>
          </div>
          <div className="space-y-2">
            {localizedDistrictCounts.map((d, i) => {
              const pct = Math.round((d.count / 120) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-24 truncate">{d.district}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right">{d.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
