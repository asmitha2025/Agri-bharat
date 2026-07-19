/**
 * Real-time weather service using Open-Meteo API
 * Free, no API key required. https://open-meteo.com/
 * Covers all 38 Tamil Nadu districts.
 */

// All 38 Tamil Nadu districts with GPS coordinates and farmer counts
export const TN_DISTRICTS = [
  { district: 'Ariyalur',         lat: 11.14, lon: 79.08, farmers: 21 },
  { district: 'Chengalpattu',     lat: 12.69, lon: 79.98, farmers: 17 },
  { district: 'Chennai',          lat: 13.08, lon: 80.27, farmers: 12 },
  { district: 'Coimbatore',       lat: 11.02, lon: 76.96, farmers: 48 },
  { district: 'Cuddalore',        lat: 11.75, lon: 79.77, farmers: 33 },
  { district: 'Dharmapuri',       lat: 12.12, lon: 78.16, farmers: 27 },
  { district: 'Dindigul',         lat: 10.36, lon: 77.97, farmers: 20 },
  { district: 'Erode',            lat: 11.34, lon: 77.72, farmers: 31 },
  { district: 'Kallakurichi',     lat: 11.74, lon: 78.96, farmers: 15 },
  { district: 'Kancheepuram',     lat: 12.83, lon: 79.70, farmers: 16 },
  { district: 'Karur',            lat: 10.96, lon: 78.08, farmers: 23 },
  { district: 'Krishnagiri',      lat: 12.53, lon: 78.21, farmers: 19 },
  { district: 'Madurai',          lat:  9.93, lon: 78.12, farmers: 41 },
  { district: 'Mayiladuthurai',   lat: 11.10, lon: 79.65, farmers: 28 },
  { district: 'Nagapattinam',     lat: 10.77, lon: 79.84, farmers: 24 },
  { district: 'Namakkal',         lat: 11.22, lon: 78.17, farmers: 26 },
  { district: 'Nilgiris',         lat: 11.41, lon: 76.69, farmers: 14 },
  { district: 'Perambalur',       lat: 11.23, lon: 78.88, farmers: 18 },
  { district: 'Pudukkottai',      lat: 10.38, lon: 78.82, farmers: 22 },
  { district: 'Ramanathapuram',   lat:  9.37, lon: 78.83, farmers: 25 },
  { district: 'Ranipet',          lat: 12.94, lon: 79.33, farmers: 15 },
  { district: 'Salem',            lat: 11.67, lon: 78.15, farmers: 29 },
  { district: 'Sivaganga',        lat:  9.85, lon: 78.48, farmers: 19 },
  { district: 'Tenkasi',          lat:  8.96, lon: 77.31, farmers: 16 },
  { district: 'Thanjavur',        lat: 10.79, lon: 79.13, farmers: 44 },
  { district: 'Theni',            lat: 10.01, lon: 77.48, farmers: 20 },
  { district: 'Thiruvallur',      lat: 13.13, lon: 79.91, farmers: 13 },
  { district: 'Thiruvarur',       lat: 10.77, lon: 79.64, farmers: 30 },
  { district: 'Thoothukudi',      lat:  8.81, lon: 78.15, farmers: 26 },
  { district: 'Tiruchirappalli',  lat: 10.80, lon: 78.69, farmers: 37 },
  { district: 'Tirunelveli',      lat:  8.73, lon: 77.70, farmers: 34 },
  { district: 'Tirupathur',       lat: 12.49, lon: 78.57, farmers: 11 },
  { district: 'Tiruppur',         lat: 11.11, lon: 77.34, farmers: 22 },
  { district: 'Tiruvannamalai',   lat: 12.23, lon: 79.07, farmers: 32 },
  { district: 'Vellore',          lat: 12.92, lon: 79.13, farmers: 18 },
  { district: 'Villupuram',       lat: 11.94, lon: 79.49, farmers: 23 },
  { district: 'Virudhunagar',     lat:  9.58, lon: 77.96, farmers: 21 },
  { district: 'Kallakurichi',     lat: 11.74, lon: 78.96, farmers: 15 },
];

/** Map WMO weather code → human-readable condition */
export function wmoToCondition(code) {
  if (code === 0)               return 'Sunny';
  if (code <= 2)                return 'Partly Cloudy';
  if (code === 3)               return 'Cloudy';
  if (code >= 45 && code <= 48) return 'Cloudy';
  if (code >= 51 && code <= 57) return 'Light Rain';
  if (code >= 61 && code <= 64) return 'Light Rain';
  if (code >= 65 && code <= 67) return 'Heavy Rain';
  if (code >= 71 && code <= 77) return 'Cloudy';
  if (code >= 80 && code <= 81) return 'Light Rain';
  if (code === 82)              return 'Heavy Rain';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Partly Cloudy';
}

/** Auto-detect alert from today's forecast */
function detectAlert(tempMax, precipSum, wmoCode) {
  if (wmoCode >= 95)   return 'Thunderstorm';
  if (precipSum >= 25) return 'Heavy Rain';
  if (tempMax >= 42)   return 'Heat Wave';
  return null;
}

/** Format YYYY-MM-DD to readable short label */
function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Fetch weather for ONE district */
async function fetchDistrict({ district, lat, lon, farmers }) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code` +
    `&timezone=Asia%2FKolkata&forecast_days=5`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error for ${district}`);
  const data = await res.json();

  const daily = data.daily;
  const forecast = daily.time.map((date, i) => ({
    date:       fmtDate(date),
    condition:  wmoToCondition(daily.weather_code[i]),
    tempMax:    Math.round(daily.temperature_2m_max[i]),
    tempMin:    Math.round(daily.temperature_2m_min[i]),
    rainChance: Math.min(Math.round((daily.precipitation_sum[i] / 50) * 100), 100),
  }));

  const todayAlert = detectAlert(
    daily.temperature_2m_max[0],
    daily.precipitation_sum[0],
    daily.weather_code[0],
  );

  return {
    district,
    farmerCount: farmers,
    alert: todayAlert,
    forecast,
    current: {
      temp:     Math.round(data.current.temperature_2m),
      humidity: data.current.relative_humidity_2m,
      wind:     Math.round(data.current.wind_speed_10m),
      condition: wmoToCondition(data.current.weather_code),
    },
  };
}

/**
 * Fetch real-time weather for ALL Tamil Nadu districts in parallel batches.
 * Uses Promise.allSettled so one failure doesn't break the rest.
 */
export async function fetchRealTimeWeather() {
  // Deduplicate by district name
  const unique = TN_DISTRICTS.filter(
    (d, i, arr) => arr.findIndex(x => x.district === d.district) === i
  );

  // Batch in groups of 10 to avoid overloading the API
  const BATCH = 10;
  const results = [];
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const settled = await Promise.allSettled(batch.map(fetchDistrict));
    settled.forEach(r => { if (r.status === 'fulfilled') results.push(r.value); });
  }
  return results.sort((a, b) => a.district.localeCompare(b.district));
}
