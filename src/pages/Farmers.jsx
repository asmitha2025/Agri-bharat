import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight, Phone, MapPin, Leaf } from 'lucide-react';
import { DISTRICTS } from '../data/mockData';
import { fetchFarmers } from '../data/dataService';
import { TableSkeleton, EmptyState } from '../components/ui';
import { useLang } from '../context/LanguageContext';
import clsx from 'clsx';

export default function Farmers() {
  const { t, tData } = useLang();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [cropFilter, setCropFilter] = useState('');
  const [page, setPage] = useState(1);
  const [farmers, setFarmers] = useState([]);
  const navigate = useNavigate();
  const PER_PAGE = 15;

  useEffect(() => {
    fetchFarmers().then(data => {
      setFarmers(data);
      setLoading(false);
    });
  }, []);

  const filtered = farmers.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q || f.name.toLowerCase().includes(q) || f.phone.includes(q) || f.village.toLowerCase().includes(q);
    const matchDistrict = !districtFilter || f.district === districtFilter;
    const matchCrop = !cropFilter || f.crops.some(c => c.includes(cropFilter));
    return matchSearch && matchDistrict && matchCrop;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const uniqueCrops = [...new Set(farmers.flatMap(f => f.crops))].sort();

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">{t('farmers_title')}</h1>
        <p className="page-subtitle">{farmers.length} {t('farmers_subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder={t('farmers_search')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input w-auto min-w-40"
            value={districtFilter}
            onChange={e => { setDistrictFilter(e.target.value); setPage(1); }}
          >
            <option value="">{t('farmers_all_districts')}</option>
            {DISTRICTS.sort().map(d => <option key={d} value={d}>{tData(d)}</option>)}
          </select>
          <select
            className="input w-auto min-w-36"
            value={cropFilter}
            onChange={e => { setCropFilter(e.target.value); setPage(1); }}
          >
            <option value="">{t('farmers_all_crops')}</option>
            {uniqueCrops.map(c => <option key={c} value={c}>{tData(c)}</option>)}
          </select>
          {(search || districtFilter || cropFilter) && (
            <button className="btn-secondary" onClick={() => { setSearch(''); setDistrictFilter(''); setCropFilter(''); setPage(1); }}>
              <Filter className="w-4 h-4" /> {t('farmers_clear')}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4"><TableSkeleton rows={8} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title={t('farmers_no_found')} subtitle={t('farmers_no_found_sub')} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    {[t('farmers_col_farmer'), t('farmers_col_village'), t('farmers_col_district'), t('farmers_col_crops'), t('farmers_col_lastcall'), t('farmers_col_totalcalls'), ''].map(h => (
                      <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/30">
                  {paginated.map(farmer => (
                    <tr
                      key={farmer.id}
                      className="hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-colors cursor-pointer"
                      onClick={() => navigate(`/farmers/${farmer.id}`)}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold flex-shrink-0">
                            {farmer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{tData(farmer.name)}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{farmer.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                          <MapPin className="w-3 h-3 text-gray-400" />{tData(farmer.village)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-green">{tData(farmer.district)}</span>
                      </td>
                      <td className="table-cell max-w-40">
                        <div className="flex flex-wrap gap-1">
                          {farmer.crops.slice(0, 2).map(c => (
                            <span key={c} className="flex items-center gap-0.5 text-[10px] bg-earth-100 dark:bg-earth-600/20 text-earth-600 dark:text-earth-300 px-1.5 py-0.5 rounded-full">
                              <Leaf className="w-2.5 h-2.5" />{tData(c)}
                            </span>
                          ))}
                          {farmer.crops.length > 2 && <span className="text-[10px] text-gray-400">+{farmer.crops.length - 2}</span>}
                        </div>
                      </td>
                      <td className="table-cell text-gray-500">{farmer.lastCall}</td>
                      <td className="table-cell">
                        <span className="font-semibold text-primary-600">{farmer.totalCalls}</span>
                      </td>
                      <td className="table-cell">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700/50">
                <p className="text-xs text-gray-500">{t('farmers_showing')} {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} {t('farmers_of')} {filtered.length}</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">{t('farmers_prev')}</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)} className={clsx('px-3 py-1.5 text-xs rounded-lg border', p === page ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700')}>
                      {p}
                    </button>
                  ))}
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
