import { useState, useEffect } from 'react';
import { Search, BookOpen, Phone, ExternalLink, CheckCircle, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchSchemes } from '../data/dataService';
import { useLang } from '../context/LanguageContext';
import clsx from 'clsx';

const categories = ['All', 'Income Support', 'Insurance', 'Infrastructure', 'Credit', 'Relief', 'Cultivation', 'Agriculture', 'Market Access'];

export default function Schemes() {
  const { t } = useLang();
  const [schemes, setSchemes] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [expanded, setExpanded] = useState(null);
  const [sentSchemes, setSentSchemes] = useState({});

  useEffect(() => { fetchSchemes().then(setSchemes); }, []);

  const filtered = schemes.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.nameTamil.includes(q) || s.benefit.toLowerCase().includes(q);
    const matchCat = category === 'All' || s.category === category;
    return matchSearch && matchCat;
  });

  const markSent = (id) => {
    setSentSchemes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const categoryColors = {
    'Income Support': 'badge-green', 'Insurance': 'badge-blue', 'Infrastructure': 'badge-yellow',
    'Credit': 'badge-blue', 'Relief': 'badge-red', 'Cultivation': 'badge-green',
    'Agriculture': 'badge-green', 'Market Access': 'badge-blue',
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">{t('schemes_title')}</h1>
        <p className="page-subtitle">{schemes.length} {t('schemes_subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder={t('schemes_search')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {(search || category !== 'All') && (
            <button className="btn-secondary" onClick={() => { setSearch(''); setCategory('All'); }}>
              <Filter className="w-4 h-4" /> {t('schemes_clear')}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={clsx('px-3 py-1 rounded-full text-xs font-medium border transition-all', category === c ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary-400')}
            >
              {c === 'All' ? t('schemes_all') : c}
            </button>
          ))}
        </div>
      </div>

      {/* Schemes list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No schemes found</p>
          </div>
        ) : filtered.map(scheme => (
          <div key={scheme.id} className={clsx('card border overflow-hidden transition-all duration-200', sentSchemes[scheme.id] ? 'border-primary-200 dark:border-primary-700' : 'border-gray-100 dark:border-gray-700/50')}>
            {/* Header */}
            <div
              className="flex items-start gap-4 p-5 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors"
              onClick={() => setExpanded(expanded === scheme.id ? null : scheme.id)}
            >
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">{scheme.name}</h3>
                    <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">{scheme.nameTamil}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={clsx('badge text-[10px]', categoryColors[scheme.category] || 'badge-green')}>{scheme.category}</span>
                    <span className="text-gray-400">{expanded === scheme.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full">{scheme.benefit}</span>
                  </div>
                  {sentSchemes[scheme.id] && (
                    <span className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> {t('schemes_sent_badge')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded content */}
            {expanded === scheme.id && (
              <div className="border-t border-gray-100 dark:border-gray-700/50 p-5 pt-4 bg-gray-50/50 dark:bg-gray-700/10 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="label">{t('schemes_eligibility')}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{scheme.eligibility}</p>
                  </div>
                  <div>
                    <p className="label">{t('schemes_district')}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{scheme.district}</p>
                  </div>
                  <div>
                    <p className="label">{t('schemes_land')}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{scheme.landSize}</p>
                  </div>
                  <div>
                    <p className="label">{t('schemes_helpline')}</p>
                    <p className="text-sm font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />{scheme.helpline}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="label">{t('schemes_how')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{scheme.howToApply}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => markSent(scheme.id)}
                    className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', sentSchemes[scheme.id] ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'bg-primary-600 text-white hover:bg-primary-700')}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {sentSchemes[scheme.id] ? t('schemes_marked') : t('schemes_mark_sent')}
                  </button>
                  <button className="btn-secondary">
                    <ExternalLink className="w-3.5 h-3.5" /> {t('schemes_apply')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
