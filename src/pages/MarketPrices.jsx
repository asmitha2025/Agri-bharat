import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart2, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchMarketPrices } from '../data/dataService';
import { useLang } from '../context/LanguageContext';
import clsx from 'clsx';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white dark:bg-dark-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 shadow-lg text-xs">
        <p className="text-gray-500 mb-1">{label}</p>
        <p className="font-bold text-primary-600">₹{payload[0].value.toFixed(0)}</p>
      </div>
    );
  }
  return null;
};

export default function MarketPrices() {
  const { t, tData } = useLang();
  const [prices, setPrices] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchMarketPrices().then(setPrices);
  }, []);

  const filtered = prices.filter(p =>
    !search || p.crop.toLowerCase().includes(search.toLowerCase())
  );

  const priceDiff = (a, b) => {
    const diff = ((a - b) / b * 100).toFixed(1);
    return { diff, up: diff > 0, same: diff == 0 };
  };

  const belowAvgCount = prices.filter(p => p.today < p.avg30).length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">{t('market_title')}</h1>
        <p className="page-subtitle">{t('market_subtitle')}</p>
      </div>

      {/* Alert banner */}
      {belowAvgCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
          <TrendingDown className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">{belowAvgCount} {t('market_alert')}</p>
            <p className="text-xs text-red-600 dark:text-red-400">{t('market_alert_sub')}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <input className="input pl-4" placeholder={t('market_search')} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Price table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {[t('market_crop'), t('market_today'), t('market_yesterday'), t('market_lastweek'), t('market_vs_avg'), t('market_trend'), ''].map(h => (
                  <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/30">
              {filtered.map(price => {
                const vsYest = priceDiff(price.today, price.yesterday);
                const vsAvg = priceDiff(price.today, price.avg30);
                const belowAvg = price.today < price.avg30;
                return (
                  <tr key={price.id} className={clsx('hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors', belowAvg && 'bg-red-50/30 dark:bg-red-900/10')}>
                    <td className="table-cell">
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{tData(price.crop)}</p>
                      <p className="text-[10px] text-gray-400">{price.unit}</p>
                    </td>
                    <td className="table-cell">
                      <span className={clsx('text-base font-bold', belowAvg ? 'text-red-600' : 'text-primary-600')}>₹{price.today}</span>
                    </td>
                    <td className="table-cell text-gray-600 dark:text-gray-400">₹{price.yesterday}</td>
                    <td className="table-cell text-gray-600 dark:text-gray-400">₹{price.lastWeek}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        {vsAvg.same ? (
                          <span className="flex items-center gap-1 text-xs text-gray-500"><Minus className="w-3 h-3" /> 0%</span>
                        ) : vsAvg.up ? (
                          <span className="flex items-center gap-1 text-xs text-primary-600 font-semibold"><TrendingUp className="w-3 h-3" />+{vsAvg.diff}%</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-semibold"><TrendingDown className="w-3 h-3" />{vsAvg.diff}%</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      {vsYest.up ? (
                        <TrendingUp className="w-4 h-4 text-primary-500" />
                      ) : vsYest.same ? (
                        <Minus className="w-4 h-4 text-gray-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => setSelectedCrop(price)}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <BarChart2 className="w-3.5 h-3.5" /> {t('market_chart')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price chart modal */}
      {selectedCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedCrop(null)} />
          <div className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{tData(selectedCrop.crop)}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('market_30day')} · {selectedCrop.unit}</p>
              </div>
              <button onClick={() => setSelectedCrop(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: t('market_today'), value: `₹${selectedCrop.today}`, color: 'text-primary-600' },
                { label: '30-day Avg', value: `₹${selectedCrop.avg30}`, color: 'text-amber-500' },
                { label: selectedCrop.today >= selectedCrop.avg30 ? t('market_above_avg') : t('market_below_avg'), value: `${Math.abs(((selectedCrop.today - selectedCrop.avg30) / selectedCrop.avg30) * 100).toFixed(1)}%`, color: selectedCrop.today >= selectedCrop.avg30 ? 'text-primary-600' : 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className={clsx('text-xl font-bold', color)}>{value}</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={selectedCrop.history.slice(-14)} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3, fill: '#16a34a' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
