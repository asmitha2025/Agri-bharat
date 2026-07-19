import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, Leaf, Calendar, Edit3, Clock, MessageSquare, AlertTriangle, Droplets, CheckCircle } from 'lucide-react';

import { fetchFarmerById, fetchCallsByFarmer, fetchPestHistory } from '../data/dataService';
import { Badge, Modal } from '../components/ui';
import { useLang } from '../context/LanguageContext';
import clsx from 'clsx';

export default function FarmerDetail() {
  const { t, tData } = useLang();
  const { id } = useParams();
  const navigate = useNavigate();
  const [farmer, setFarmer] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [saved, setSaved] = useState(false);

  const [farmerCalls, setFarmerCalls] = useState([]);
  const [farmerDiagnoses, setFarmerDiagnoses] = useState([]);

  useEffect(() => {
    if (!id) return;
    fetchFarmerById(id).then(f => {
      if (f) { setFarmer({ ...f }); setEditData({ ...f }); }
    });
    fetchCallsByFarmer(id).then(c => setFarmerCalls(c.slice(0, 10)));
    fetchPestHistory().then(hist => setFarmerDiagnoses(hist.filter(p => p.farmerId === id)));
  }, [id]);

  const handleSave = () => {
    setFarmer({ ...editData });
    setSaved(true);
    setEditOpen(false);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!farmer) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading farmer profile...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => navigate('/farmers')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('detail_back')}
      </button>

      {saved && (
        <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-lg px-4 py-2.5 text-sm text-primary-700 dark:text-primary-300">
          <CheckCircle className="w-4 h-4" /> {t('detail_updated')}
        </div>
      )}

      {/* Hero */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {farmer.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{tData(farmer.name)}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" />{farmer.phone}
                </p>
              </div>
              <button onClick={() => setEditOpen(true)} className="btn-secondary flex-shrink-0">
                <Edit3 className="w-3.5 h-3.5" /> {t('detail_edit')}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="text-center p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                <p className="text-lg font-bold text-primary-600">{farmer.totalCalls}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('detail_total_calls')}</p>
              </div>
              <div className="text-center p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                <p className="text-lg font-bold text-amber-500">{farmer.alerts}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('detail_alerts_sent')}</p>
              </div>
              <div className="text-center p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                <p className="text-lg font-bold text-gray-700 dark:text-gray-200">{farmer.landSize}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('detail_land_size')}</p>
              </div>
              <div className="text-center p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{farmer.language}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('detail_language')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700/50">
          {[
            { icon: MapPin, label: t('detail_village'), value: tData(farmer.village) },
            { icon: MapPin, label: t('detail_district'), value: tData(farmer.district) },
            { icon: Calendar, label: t('detail_joined'), value: farmer.joinDate },
            { icon: Droplets, label: t('detail_irrigation'), value: tData(farmer.irrigationType) },
            { icon: Leaf, label: t('detail_soil'), value: tData(farmer.soilType) },
            { icon: Clock, label: t('detail_last_call'), value: `${farmer.lastCall} ${farmer.lastCallTime}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <p className="label">{label}</p>
              <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                <Icon className="w-3.5 h-3.5 text-primary-500" />{value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Crops */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
          <Leaf className="w-4 h-4 text-primary-600" /> {t('detail_crops')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {farmer.crops.map(c => (
            <span key={c} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium border border-primary-100 dark:border-primary-800">
              <Leaf className="w-3.5 h-3.5" />{tData(c)}
            </span>
          ))}
        </div>
      </div>

      {/* Call timeline */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary-600" /> {t('detail_call_history')}
        </h3>
        {farmerCalls.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">{t('detail_no_calls')}</p>
        ) : (
          <div className="relative pl-6 space-y-0">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
            {farmerCalls.map((call, i) => (
              <div key={call.id} className={clsx('relative pb-5', i === farmerCalls.length - 1 && 'pb-0')}>
                <div className="absolute -left-4 w-3 h-3 rounded-full border-2 border-primary-600 bg-white dark:bg-dark-800" />
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={clsx('badge text-[10px]', call.status === 'completed' ? 'badge-green' : 'badge-red')}>
                      {call.status === 'completed' ? t('gen_completed') : t('gen_missed')}
                    </span>
                    <span className="text-xs text-gray-500">{call.date} {call.time}</span>
                    <span className="text-xs text-gray-400 ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />{call.duration}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{call.summary}</p>
                  {call.crops.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {call.crops.map(c => (
                        <span key={c} className="text-[10px] bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-full">{tData(c)}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pest alerts */}
      {farmerDiagnoses.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> {t('detail_pest_diagnoses')}
          </h3>
          <div className="space-y-3">
            {farmerDiagnoses.map(d => (
              <div key={d.id} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{d.diseaseEn}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">{d.diseaseTa}</p>
                  </div>
                  <div className="text-right">
                    <span className={clsx('badge', d.severity === 'High' ? 'badge-red' : d.severity === 'Medium' ? 'badge-yellow' : 'badge-green')}>{d.severity}</span>
                    <p className="text-[10px] text-gray-400 mt-1">{d.confidence}% confidence</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" />{d.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('detail_edit_title')}>
        <div className="space-y-4">
          {[
            { key: 'name', label: 'Full Name', type: 'text' },
            { key: 'phone', label: 'Phone Number', type: 'text' },
            { key: 'village', label: 'Village', type: 'text' },
            { key: 'landSize', label: 'Land Size', type: 'text' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input type={type} className="input" value={editData[key] || ''} onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="label">Irrigation Type</label>
            <select className="input" value={editData.irrigationType || ''} onChange={e => setEditData(prev => ({ ...prev, irrigationType: e.target.value }))}>
              {['Canal', 'Borewell', 'Rainwater', 'Drip', 'Sprinkler'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-primary flex-1" onClick={handleSave}>{t('detail_save')}</button>
            <button className="btn-secondary flex-1" onClick={() => setEditOpen(false)}>{t('detail_cancel')}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
