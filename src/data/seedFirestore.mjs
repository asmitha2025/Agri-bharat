/**
 * Firestore Seed Script
 * Run once to populate Firestore with initial data.
 * Usage: node src/data/seedFirestore.mjs
 *
 * Requires: npm install firebase (already installed)
 * Set your config below before running.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, setDoc, doc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDyp_UOsiymL-eGclqlcGAPyJAeB1KhSdo',
  authDomain: 'kisanbot-5dcc0.firebaseapp.com',
  projectId: 'kisanbot-5dcc0',
  storageBucket: 'kisanbot-5dcc0.firebasestorage.app',
  messagingSenderId: '384881804129',
  appId: '1:384881804129:web:8f1af17e5123f09e04bb20',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Helpers ──────────────────────────────────────────────────
const DISTRICTS = [
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
  'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thoothukkudi',
  'Dindigul', 'Thanjavur', 'Ranipet', 'Sivaganga', 'Virudhunagar',
];

const CROPS = ['Rice', 'Banana', 'Sugarcane', 'Cotton', 'Tomato', 'Onion', 'Brinjal', 'Chilli', 'Turmeric', 'Groundnut'];
const firstNames = ['Murugan', 'Selvam', 'Ganesan', 'Raman', 'Kumar', 'Velan', 'Suresh', 'Arun', 'Palani', 'Karthik', 'Santhosh', 'Vijay', 'Mariappan', 'Elangovan'];
const lastNames = ['Pillai', 'Nair', 'Muthusamy', 'Raj', 'Samy', 'Vel', 'Annamalai', 'Chettiar'];
const villages = ['Kovilur', 'Velappadi', 'Natham', 'Sholavandan', 'Cumbum', 'Usilampatti', 'Arani', 'Tindivanam', 'Vaniyambadi'];
const callSummaries = [
  'Farmer asked about rice blast disease treatment. Advised copper fungicide spray.',
  'Discussed drought conditions and water management techniques for paddy.',
  'Inquired about PM-KISAN scheme eligibility and application process.',
  'Reported tomato leaf curl virus symptoms. Suggested white fly control measures.',
  'Asked about current market prices for onion in APMC.',
  'Concerned about heavy rain damage to banana crop.',
];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randDate(daysAgo = 30) {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, daysAgo));
  d.setHours(rand(6, 20), rand(0, 59), 0);
  return d;
}
function fmt(d) { return d.toISOString().split('T')[0]; }
function fmtT(d) { return d.toTimeString().slice(0, 5); }

// ── Generate data ────────────────────────────────────────────
const farmers = Array.from({ length: 50 }, (_, i) => {
  const id = `F${String(i + 1).padStart(3, '0')}`;
  const lc = randDate(15);
  return {
    id,
    name: `${pick(firstNames)} ${pick(lastNames)}`,
    phone: `9${rand(1,9)}${String(rand(10000000, 99999999))}`,
    village: pick(villages),
    district: pick(DISTRICTS),
    crops: [...new Set(Array.from({ length: rand(1, 3) }, () => pick(CROPS)))],
    landSize: `${rand(1, 12)}.${rand(0, 9)} acres`,
    totalCalls: rand(1, 45),
    lastCall: fmt(lc),
    lastCallTime: fmtT(lc),
    language: Math.random() > 0.3 ? 'Tamil' : 'Telugu',
    joinDate: fmt(new Date(2024, rand(0, 11), rand(1, 28))),
    soilType: pick(['Red Loam', 'Black Cotton', 'Sandy Loam', 'Alluvial', 'Clay']),
    irrigationType: pick(['Canal', 'Borewell', 'Rainwater', 'Drip', 'Sprinkler']),
    alerts: rand(0, 5),
  };
});

const calls = Array.from({ length: 120 }, (_, i) => {
  const farmer = pick(farmers);
  const cd = randDate(30);
  return {
    id: `C${String(i + 1).padStart(4, '0')}`,
    farmerId: farmer.id,
    farmerName: farmer.name,
    farmerPhone: farmer.phone,
    district: farmer.district,
    duration: `${rand(1,12)}:${String(rand(0,59)).padStart(2,'0')}`,
    date: fmt(cd),
    time: fmtT(cd),
    summary: pick(callSummaries),
    crops: farmer.crops.slice(0, rand(1, 2)),
    language: farmer.language,
    status: Math.random() > 0.1 ? 'completed' : 'missed',
  };
});

const marketPrices = [
  { id: 'mp1', crop: 'Tomato', unit: 'per kg', today: 45, yesterday: 42, lastWeek: 38, avg30: 41, history: Array.from({length:30},(_,i)=>({date:`2026-03-${String(i+1).padStart(2,'0')}`,price:rand(32,58)})) },
  { id: 'mp2', crop: 'Onion', unit: 'per kg', today: 28, yesterday: 30, lastWeek: 35, avg30: 32, history: Array.from({length:30},(_,i)=>({date:`2026-03-${String(i+1).padStart(2,'0')}`,price:rand(20,40)})) },
  { id: 'mp3', crop: 'Rice', unit: 'per kg', today: 38, yesterday: 38, lastWeek: 36, avg30: 37, history: Array.from({length:30},(_,i)=>({date:`2026-03-${String(i+1).padStart(2,'0')}`,price:rand(33,44)})) },
  { id: 'mp4', crop: 'Banana', unit: 'per dozen', today: 55, yesterday: 52, lastWeek: 60, avg30: 57, history: Array.from({length:30},(_,i)=>({date:`2026-03-${String(i+1).padStart(2,'0')}`,price:rand(45,70)})) },
  { id: 'mp5', crop: 'Chilli', unit: 'per kg', today: 120, yesterday: 115, lastWeek: 130, avg30: 118, history: Array.from({length:30},(_,i)=>({date:`2026-03-${String(i+1).padStart(2,'0')}`,price:rand(90,145)})) },
  { id: 'mp6', crop: 'Coconut', unit: 'per piece', today: 22, yesterday: 20, lastWeek: 18, avg30: 20, history: Array.from({length:30},(_,i)=>({date:`2026-03-${String(i+1).padStart(2,'0')}`,price:rand(15,28)})) },
  { id: 'mp7', crop: 'Turmeric', unit: 'per kg', today: 145, yesterday: 148, lastWeek: 155, avg30: 150, history: Array.from({length:30},(_,i)=>({date:`2026-03-${String(i+1).padStart(2,'0')}`,price:rand(120,180)})) },
  { id: 'mp8', crop: 'Groundnut', unit: 'per kg', today: 68, yesterday: 65, lastWeek: 62, avg30: 64, history: Array.from({length:30},(_,i)=>({date:`2026-03-${String(i+1).padStart(2,'0')}`,price:rand(55,80)})) },
  { id: 'mp9', crop: 'Cotton', unit: 'per kg', today: 72, yesterday: 75, lastWeek: 70, avg30: 73, history: Array.from({length:30},(_,i)=>({date:`2026-03-${String(i+1).padStart(2,'0')}`,price:rand(60,90)})) },
  { id: 'mp10', crop: 'Sugarcane', unit: 'per tonne', today: 3200, yesterday: 3200, lastWeek: 3150, avg30: 3180, history: Array.from({length:30},(_,i)=>({date:`2026-03-${String(i+1).padStart(2,'0')}`,price:rand(3000,3400)})) },
];

// ── Seed to Firestore ────────────────────────────────────────
async function seed() {
  console.log('🌱 Seeding Firestore...');

  // Farmers (batch write)
  let batch = writeBatch(db);
  farmers.forEach(f => {
    batch.set(doc(db, 'farmers', f.id), f);
  });
  await batch.commit();
  console.log(`✅ Seeded ${farmers.length} farmers`);

  // Calls (batch in groups of 500)
  for (let i = 0; i < calls.length; i += 400) {
    const chunk = calls.slice(i, i + 400);
    const b = writeBatch(db);
    chunk.forEach(c => b.set(doc(db, 'calls', c.id), c));
    await b.commit();
  }
  console.log(`✅ Seeded ${calls.length} calls`);

  // Market prices
  const mpBatch = writeBatch(db);
  marketPrices.forEach(m => mpBatch.set(doc(db, 'marketPrices', m.id), m));
  await mpBatch.commit();
  console.log(`✅ Seeded ${marketPrices.length} market prices`);

  console.log('🎉 Done! Firestore database is ready.');
  process.exit(0);
}

seed().catch(e => { console.error('❌ Seed failed:', e); process.exit(1); });
