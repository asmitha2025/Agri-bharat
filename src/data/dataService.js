/**
 * Firestore Data Service
 * Reads from Firebase Firestore with automatic mock data fallback.
 * Handles BOTH schemas:
 *   - Seeded data: doc ID = F001..F050, English field values
 *   - Real voice bot data: doc ID = phone number, Tamil field values
 */
import { db, isFirebaseConfigured, collection, getDocs, addDoc, setDoc, doc, query, limit } from '../firebase';
import {
  FARMERS as MOCK_FARMERS,
  CALLS as MOCK_CALLS,
  PEST_HISTORY as MOCK_PEST_HISTORY,
  MARKET_PRICES as MOCK_MARKET_PRICES,
  WEATHER_DATA as MOCK_WEATHER,
  SCHEMES as MOCK_SCHEMES,
} from './mockData';

/** Normalize a farmer document from Firestore (handles both schemas) */
function normalizeFarmer(id, data) {
  const lastCallDate = data.last_call || data.lastCall || null;
  const lastCallParsed = lastCallDate ? new Date(lastCallDate) : null;
  return {
    id,
    name: data.name || `Farmer ${id}`,
    phone: data.phone || id,
    village: data.village || data.Village || '',
    district: data.district || data.District || '',
    crops: Array.isArray(data.crops) ? data.crops : (data.crops ? [data.crops] : []),
    landSize: data.land_size || data.landSize || '2 acres',
    totalCalls: Number(data.total_calls || data.totalCalls || 0),
    lastCall: lastCallParsed ? lastCallParsed.toISOString().split('T')[0] : '',
    lastCallTime: lastCallParsed ? lastCallParsed.toTimeString().slice(0, 5) : '',
    language: data.language || 'Tamil',
    joinDate: data.first_call ? new Date(data.first_call).toISOString().split('T')[0] : (data.joinDate || ''),
    soilType: data.soilType || data.soil_type || '',
    irrigationType: data.irrigationType || data.irrigation_type || '',
    alerts: Array.isArray(data.weather_alerts_sent) ? data.weather_alerts_sent.length : (data.alerts || 0),
    rawData: data,
  };
}

/** Normalize a call document from Firestore */
function normalizeCall(id, data) {
  const callDate = data.date || data.timestamp || '';
  const parsedDate = callDate ? new Date(callDate) : null;
  return {
    id,
    farmerId: data.farmerId || data.farmer_id || '',
    farmerName: data.farmerName || data.farmer_name || data.name || '',
    farmerPhone: data.farmerPhone || data.farmer_phone || data.phone || '',
    district: data.district || '',
    duration: data.duration || '0:00',
    date: parsedDate ? parsedDate.toISOString().split('T')[0] : (data.date || ''),
    time: parsedDate ? parsedDate.toTimeString().slice(0, 5) : (data.time || ''),
    summary: data.summary || data.transcript_summary || '',
    crops: Array.isArray(data.crops) ? data.crops : [],
    language: data.language || 'Tamil',
    status: data.status || (data.call_status === 'completed' ? 'completed' : 'completed'),
  };
}

// ─── Farmers ───────────────────────────────────────────────
export async function fetchFarmers() {
  if (!isFirebaseConfigured || !db) return MOCK_FARMERS;
  try {
    const snap = await getDocs(collection(db, 'farmers'));
    if (snap.empty) return MOCK_FARMERS;
    return snap.docs.map(d => normalizeFarmer(d.id, d.data()));
  } catch (e) {
    console.warn('fetchFarmers fallback:', e.message);
    return MOCK_FARMERS;
  }
}

export async function fetchFarmerById(id) {
  const farmers = await fetchFarmers();
  return farmers.find(f => f.id === id || f.phone === id) || null;
}

// ─── Calls ─────────────────────────────────────────────────
export async function fetchCalls(limitN = 200) {
  if (!isFirebaseConfigured || !db) return MOCK_CALLS;
  try {
    const snap = await getDocs(query(collection(db, 'calls'), limit(limitN)));
    if (snap.empty) return MOCK_CALLS;
    return snap.docs.map(d => normalizeCall(d.id, d.data()));
  } catch (e) {
    console.warn('fetchCalls fallback:', e.message);
    return MOCK_CALLS;
  }
}

export async function fetchCallsByFarmer(farmerId) {
  const calls = await fetchCalls();
  return calls.filter(c => c.farmerId === farmerId || c.farmerPhone === farmerId);
}

// ─── Pest Diagnoses ─────────────────────────────────────────
export async function fetchPestHistory() {
  if (!isFirebaseConfigured || !db) return MOCK_PEST_HISTORY;
  try {
    const snap = await getDocs(collection(db, 'pestDiagnoses'));
    if (snap.empty) return MOCK_PEST_HISTORY;
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('fetchPestHistory fallback:', e.message);
    return MOCK_PEST_HISTORY;
  }
}

export async function savePestDiagnosis(diagnosis) {
  if (!isFirebaseConfigured || !db) return;
  try {
    await addDoc(collection(db, 'pestDiagnoses'), {
      ...diagnosis,
      createdAt: new Date().toISOString(),
    });
    console.log('✅ Pest diagnosis saved to Firestore');
  } catch (e) {
    console.warn('savePestDiagnosis error:', e.message);
  }
}

// ─── Market Prices ──────────────────────────────────────────
export async function fetchMarketPrices() {
  if (!isFirebaseConfigured || !db) return MOCK_MARKET_PRICES;
  try {
    const snap = await getDocs(collection(db, 'marketPrices'));
    if (snap.empty) return MOCK_MARKET_PRICES;
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('fetchMarketPrices fallback:', e.message);
    return MOCK_MARKET_PRICES;
  }
}

// ─── Weather ────────────────────────────────────────────────
export async function fetchWeatherData() {
  if (!isFirebaseConfigured || !db) return MOCK_WEATHER;
  try {
    const snap = await getDocs(collection(db, 'weatherData'));
    if (snap.empty) return MOCK_WEATHER;
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('fetchWeatherData fallback:', e.message);
    return MOCK_WEATHER;
  }
}

// ─── Schemes ────────────────────────────────────────────────
export async function fetchSchemes() {
  if (!isFirebaseConfigured || !db) return MOCK_SCHEMES;
  try {
    const snap = await getDocs(collection(db, 'schemes'));
    if (snap.empty) return MOCK_SCHEMES;
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('fetchSchemes fallback:', e.message);
    return MOCK_SCHEMES;
  }
}

// ─── Update Farmer ──────────────────────────────────────────
export async function updateFarmer(farmerId, data) {
  if (!isFirebaseConfigured || !db) return;
  try {
    await setDoc(doc(db, 'farmers', farmerId), data, { merge: true });
    console.log('✅ Farmer updated in Firestore:', farmerId);
  } catch (e) {
    console.warn('updateFarmer error:', e.message);
  }
}
