import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, Clock, MapPin, Phone, Filter, ChevronDown, ChevronUp, Leaf } from 'lucide-react';
import { DISTRICTS } from '../data/mockData';
import { fetchCalls } from '../data/dataService';
import { TableSkeleton, EmptyState } from '../components/ui';
import { useLang } from '../context/LanguageContext';
import clsx from 'clsx';

export default function CallHistory() {
  const { t, tData } = useLang();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const [allCalls, setAllCalls] = useState([]);

  useEffect(() => {
    fetchCalls(200).then(data => {
      setAllCalls(data);
      setLoading(false);
    });
  }, []);


  const filtered = useMemo(() => {
    return allCalls.filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q || (c.farmerName || '').toLowerCase().includes(q) || (c.farmerPhone || '').includes(q);
      const matchDistrict = !district || c.district === district;
      const matchFrom = !dateFrom || c.date >= dateFrom;
      const matchTo = !dateTo || c.date <= dateTo;
      return matchSearch && matchDistrict && matchFrom && matchTo;
    });
  }, [allCalls, search, district, dateFrom, dateTo]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const exportCSV = () => {
    const headers = ['ID', 'Farmer Name', 'Phone', 'District', 'Date', 'Time', 'Duration', 'Status', 'Summary'];
    const rows = filtered.map(c => [c.id, c.farmerName, c.farmerPhone, c.district, c.date, c.time, c.duration, c.status, `"${c.summary}"`]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'agribot_call_history.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const completedCount = allCalls.filter(c => c.status === 'completed').length;
  const avgDuration = '4:32';

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">{t('calls_title')}</h1>
          <p className="page-subtitle">{allCalls.length} {t('calls_subtitle')} · {completedCount} {t('calls_completed')} · {t('calls_avg')} {avgDuration}</p>
        </div>
        <button onClick={exportCSV} className="btn-primary flex-shrink-0">
          <Download className="w-4 h-4" /> {t('calls_export')}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder={t('calls_search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="input w-auto min-w-40" value={district} onChange={e => { setDistrict(e.target.value); setPage(1); }}>
            <option value="">{t('calls_all_districts')}</option>
            {DISTRICTS.sort().map(d => <option key={d} value={d}>{tData(d)}</option>)}
          </select>
          <input type="date" className="input w-auto" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} title="From date" />
          <input type="date" className="input w-auto" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} title="To date" />
          {(search || district || dateFrom || dateTo) && (
            <button className="btn-secondary" onClick={() => { setSearch(''); setDistrict(''); setDateFrom(''); setDateTo(''); setPage(1); }}>
              <Filter className="w-4 h-4" /> {t('calls_clear')}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4"><TableSkeleton rows={8} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title={t('calls_no_found')} subtitle={t('calls_adjust')} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    {[t('calls_col_farmer'), t('calls_col_district'), t('calls_col_datetime'), t('calls_col_duration'), t('calls_col_status'), t('calls_col_crops'), ''].map(h => (
                      <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/30">
                  {paginated.map(call => (
                    <React.Fragment key={call.id}>
                      <tr
                        className="hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors cursor-pointer"
                        onClick={() => setExpanded(expanded === call.id ? null : call.id)}
                      >
                        <td className="table-cell">
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{tData(call.farmerName)}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{call.farmerPhone}</p>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300 text-sm">
                            <MapPin className="w-3 h-3 text-gray-400" />{tData(call.district)}
                          </span>
                        </td>
                        <td className="table-cell">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{call.date}</p>
                          <p className="text-xs text-gray-400">{call.time}</p>
                        </td>
                        <td className="table-cell">
                          <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                            <Clock className="w-3 h-3 text-gray-400" />{call.duration}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={clsx('badge', call.status === 'completed' ? 'badge-green' : 'badge-red')}>
                            {call.status === 'completed' ? t('gen_completed') : t('gen_missed')}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-wrap gap-1">
                            {call.crops.slice(0, 1).map(c => (
                              <span key={c} className="text-[10px] bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Leaf className="w-2.5 h-2.5" />{tData(c)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="table-cell">
                          {expanded === call.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </td>
                      </tr>
                      {expanded === call.id && (
                        <tr className="bg-primary-50/30 dark:bg-primary-900/10">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="flex items-start gap-3">
                              <div className="w-1 flex-shrink-0 self-stretch bg-primary-500 rounded-full" />
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('calls_transcript')}</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{call.summary}</p>
                                <div className="flex gap-2 mt-2">
                                  {call.crops.map(c => (
                                    <span key={c} className="text-[10px] bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-full">{c}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700/50">
                <p className="text-xs text-gray-500">{t('farmers_showing')} {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} {t('farmers_of')} {filtered.length}</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">{t('farmers_prev')}</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">{t('farmers_next')}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
