// Rich mock data for Tamil Nadu AgriBot Dashboard
export const DISTRICTS = [
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
  'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thoothukkudi',
  'Dindigul', 'Thanjavur', 'Ranipet', 'Sivaganga', 'Virudhunagar',
  'Namakkal', 'Nagapattinam', 'Villupuram', 'Kancheepuram', 'Cuddalore',
  'Dharmapuri', 'Krishnagiri', 'Perambalur', 'Ariyalur', 'Karur',
  'Tiruvarur', 'Ramanathapuram', 'Pudukkottai', 'Nilgiris', 'Kallakurichi',
  'Chengalpattu', 'Mayiladuthurai', 'Tenkasi', 'Thoothukudi', 'Tirupattur',
  'Tiruvannamalai', 'Vellore', 'Puducherry'
];

const CROPS = [
  'Rice', 'Banana', 'Sugarcane', 'Cotton', 'Tomato',
  'Onion', 'Brinjal', 'Chilli', 'Turmeric', 'Cluster Beans',
  'Wheat', 'Maize', 'Coconut', 'Mango', 'Drumstick',
  'Paddy', 'Groundnut', 'Chickpea'
];

const firstNames = ['Murugan', 'Selvam', 'Ganesan', 'Raman', 'Kumar', 'Velan', 'Suresh', 'Arun', 'Palani', 'Karthik', 'Santhosh', 'Vijay', 'Tamil', 'Mariappan', 'Elangovan'];
const lastNames = ['Pillai', 'Nair', 'Muthusamy', 'Raj', 'Kumar', 'Samy', 'Vel', 'Annamalai', 'Arcot', 'Chettiar'];
const villages = ['Kovilur', 'Velappadi', 'Natham', 'Karurnagar', 'Thenkal', 'Sholavandan', 'Cumbum', 'Usilampatti', 'Ponnamaravathi', 'Aravakurichi', 'Arani', 'Tindivanam', 'Vaniyambadi', 'Chinnasalem', 'Uthangarai'];
const callSummaries = [
  'Farmer asked about rice blast disease treatment. Advised copper fungicide spray.',
  'Discussed drought conditions and water management techniques for paddy.',
  'Inquired about PM-KISAN scheme eligibility and application process.',
  'Reported tomato leaf curl virus symptoms. Suggested white fly control measures.',
  'Asked about current market prices for onion in Madurai APMC.',
  'Concerned about heavy rain damage to banana crop. Discussed insurance claim process.',
  'Inquired about subsidized drip irrigation installation scheme.',
  'Banana weevil infestation reported. Guided on biopesticide application.',
  'Discussed sugarcane variety selection for late sowing season.',
  'Asked about soil testing centers and nutrient management for cotton crop.',
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randDate(daysAgo = 30) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, daysAgo));
  d.setHours(randInt(6, 20), randInt(0, 59), 0);
  return d;
}
function formatDate(d) {
  return d.toISOString().split('T')[0];
}
function formatTime(d) {
  return d.toTimeString().slice(0, 5);
}

// Generate 50 farmers
export const FARMERS = Array.from({ length: 50 }, (_, i) => {
  const id = `F${String(i + 1).padStart(3, '0')}`;
  const district = randItem(DISTRICTS);
  const cropCount = randInt(1, 4);
  const crops = [...new Set(Array.from({ length: cropCount }, () => randItem(CROPS)))];
  const lastCallDate = randDate(15);
  return {
    id,
    name: `${randItem(firstNames)} ${randItem(lastNames)}`,
    phone: `9${randInt(1, 9)}${String(randInt(10000000, 99999999))}`,
    village: randItem(villages),
    district,
    crops,
    landSize: `${randInt(1, 12)}.${randInt(0, 9)} acres`,
    totalCalls: randInt(1, 45),
    lastCall: formatDate(lastCallDate),
    lastCallTime: formatTime(lastCallDate),
    language: Math.random() > 0.3 ? 'Tamil' : 'Telugu',
    joinDate: formatDate(new Date(2024, randInt(0, 11), randInt(1, 28))),
    soilType: randItem(['Red Loam', 'Black Cotton', 'Sandy Loam', 'Alluvial', 'Clay']),
    irrigationType: randItem(['Canal', 'Borewell', 'Rainwater', 'Drip', 'Sprinkler']),
    alerts: randInt(0, 5),
  };
});

// Generate 120 call records
export const CALLS = Array.from({ length: 120 }, (_, i) => {
  const farmer = randItem(FARMERS);
  const callDate = randDate(30);
  return {
    id: `C${String(i + 1).padStart(4, '0')}`,
    farmerId: farmer.id,
    farmerName: farmer.name,
    farmerPhone: farmer.phone,
    district: farmer.district,
    duration: `${randInt(1, 12)}:${String(randInt(0, 59)).padStart(2, '0')}`,
    date: formatDate(callDate),
    time: formatTime(callDate),
    summary: randItem(callSummaries),
    crops: farmer.crops.slice(0, randInt(1, 2)),
    language: farmer.language,
    status: Math.random() > 0.1 ? 'completed' : 'missed',
  };
});

// Sort calls by date descending
CALLS.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));

export const RECENT_CALLS = CALLS.slice(0, 8);

// Market price data
const buildPriceHistory = (base) => {
  const history = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    history.push({
      date: formatDate(d),
      price: Math.max(base * 0.6, base + randInt(-base * 0.3, base * 0.3)),
    });
  }
  return history;
};

export const MARKET_PRICES = [
  { id: 'mp1', crop: 'Tomato', unit: 'per kg', today: 24, yesterday: 28, lastWeek: 32, avg30: 29, history: buildPriceHistory(28) },
  { id: 'mp2', crop: 'Onion', unit: 'per kg', today: 18, yesterday: 16, lastWeek: 22, avg30: 19, history: buildPriceHistory(19) },
  { id: 'mp3', crop: 'Banana', unit: 'per dozen', today: 45, yesterday: 42, lastWeek: 40, avg30: 41, history: buildPriceHistory(42) },
  { id: 'mp4', crop: 'Rice', unit: 'per kg', today: 22, yesterday: 22, lastWeek: 21, avg30: 21.5, history: buildPriceHistory(22) },
  { id: 'mp5', crop: 'Chilli', unit: 'per kg', today: 85, yesterday: 92, lastWeek: 78, avg30: 84, history: buildPriceHistory(84) },
  { id: 'mp6', crop: 'Turmeric', unit: 'per kg', today: 120, yesterday: 115, lastWeek: 130, avg30: 124, history: buildPriceHistory(124) },
  { id: 'mp7', crop: 'Coconut', unit: 'per piece', today: 22, yesterday: 21, lastWeek: 20, avg30: 20, history: buildPriceHistory(20) },
  { id: 'mp8', crop: 'Drumstick', unit: 'per kg', today: 60, yesterday: 65, lastWeek: 55, avg30: 62, history: buildPriceHistory(62) },
  { id: 'mp9', crop: 'Brinjal', unit: 'per kg', today: 15, yesterday: 18, lastWeek: 20, avg30: 18, history: buildPriceHistory(18) },
  { id: 'mp10', crop: 'Groundnut', unit: 'per kg', today: 65, yesterday: 63, lastWeek: 68, avg30: 66, history: buildPriceHistory(66) },
];

// Weather data
const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Heavy Rain', 'Thunderstorm', 'Clear'];
const alertTypes = ['Heavy Rain', 'Heat Wave', 'Drought', 'Cyclone Warning', 'Cold Wave', null, null, null];

export const WEATHER_DATA = DISTRICTS.slice(0, 32).map((district, i) => {
  const alert = alertTypes[i % alertTypes.length];
  return {
    district,
    alert,
    farmerCount: randInt(120, 980),
    forecast: [0, 1, 2].map((dayOffset) => {
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      return {
        date: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        condition: alert === 'Heavy Rain' ? 'Heavy Rain' : alert === 'Heat Wave' ? 'Sunny' : randItem(conditions),
        tempMax: randInt(28, 40),
        tempMin: randInt(18, 28),
        rainChance: alert === 'Heavy Rain' ? randInt(75, 95) : randInt(5, 60),
        humidity: randInt(40, 90),
      };
    }),
  };
});

// Schemes data
export const SCHEMES = [
  {
    id: 'sc1',
    name: 'PM-KISAN',
    nameTamil: 'பி.எம்-கிசான்',
    benefit: '₹6,000 per year',
    eligibility: 'All small & marginal farmers with cultivable land',
    crops: ['All'],
    landSize: 'Below 2 hectares',
    district: 'All Districts',
    howToApply: 'Visit nearest CSC center or apply online at pmkisan.gov.in with Aadhaar + bank details',
    helpline: '155261',
    category: 'Income Support',
  },
  {
    id: 'sc2',
    name: 'PMFBY - Crop Insurance',
    nameTamil: 'பயிர் காப்பீடு திட்டம்',
    benefit: 'Up to full crop value coverage',
    eligibility: 'All farmers growing notified crops in notified areas',
    crops: ['Rice', 'Sugarcane', 'Cotton', 'Banana'],
    landSize: 'All sizes',
    district: 'All Districts',
    howToApply: 'Apply through bank, insurance company, or CSC center before cut-off date',
    helpline: '1800-200-7710',
    category: 'Insurance',
  },
  {
    id: 'sc3',
    name: 'Drip Irrigation Subsidy',
    nameTamil: 'சொட்டு நீர் பாசன மானியம்',
    benefit: '50-90% subsidy on installation cost',
    eligibility: 'SC/ST & small farmers get 90%, others 50%',
    crops: ['All'],
    landSize: 'Below 5 acres',
    district: 'All Districts',
    howToApply: 'Apply through Agriculture Department office with land documents',
    helpline: '044-2522-5351',
    category: 'Infrastructure',
  },
  {
    id: 'sc4',
    name: 'Kisan Credit Card',
    nameTamil: 'கிசான் கிரெடிட் கார்டு',
    benefit: 'Credit up to ₹3 lakh at 7% interest',
    eligibility: 'All farmers, tenant farmers, oral lessees',
    crops: ['All'],
    landSize: 'All sizes',
    district: 'All Districts',
    howToApply: 'Apply at any nationalized bank with land records and ID proof',
    helpline: '1800-180-1551',
    category: 'Credit',
  },
  {
    id: 'sc5',
    name: 'TN Chief Minister Farmers Welfare Scheme',
    nameTamil: 'முதலமைச்சர் விவசாயிகள் நல திட்டம்',
    benefit: '₹2,000 one-time relief + seed & fertilizer support',
    eligibility: 'Farmers who lost crops due to natural calamities in Tamil Nadu',
    crops: ['All'],
    landSize: 'All sizes',
    district: 'All Districts',
    howToApply: 'Apply through Village Administrative Officer (VAO) within 30 days of calamity',
    helpline: '1100',
    category: 'Relief',
  },
  {
    id: 'sc6',
    name: 'National Mission on Oilseeds and Oil Palm',
    nameTamil: 'எண்ணெய் வித்துகள் தேசிய இயக்கம்',
    benefit: '₹15,000/ha seed support + ₹25,000/ha cultivation subsidy',
    eligibility: 'Farmers cultivating oilseed crops',
    crops: ['Groundnut'],
    landSize: 'Up to 4 ha',
    district: 'Villupuram, Cuddalore, Perambalur, Ariyalur',
    howToApply: 'Register at Agriculture department with land records and bank account',
    helpline: '044-2522-5319',
    category: 'Cultivation',
  },
  {
    id: 'sc7',
    name: 'Soil Health Card Scheme',
    nameTamil: 'மண் ஆரோக்கிய அட்டை திட்டம்',
    benefit: 'Free soil testing + personalized fertilizer recommendations',
    eligibility: 'All farmers',
    crops: ['All'],
    landSize: 'All sizes',
    district: 'All Districts',
    howToApply: 'Contact local Agriculture Officer or visit soil testing lab with soil sample',
    helpline: '1800-180-1551',
    category: 'Agriculture',
  },
  {
    id: 'sc8',
    name: 'eNAM - National Agriculture Market',
    nameTamil: 'தேசிய வேளாண் சந்தை',
    benefit: 'Direct market access, better prices via online auction',
    eligibility: 'All farmers with valid license',
    crops: ['All'],
    landSize: 'All sizes',
    district: 'All Districts',
    howToApply: 'Register at nearest APMC with Aadhaar and bank account',
    helpline: '1800-270-0224',
    category: 'Market Access',
  },
];

// Pest diagnoses history
export const PEST_HISTORY = [
  {
    id: 'ph1',
    farmerId: 'F001',
    farmerName: FARMERS[0].name,
    date: '2026-03-10',
    diseaseEn: 'Rice Blast Disease',
    diseaseTa: 'நெல் தாக்குதல் நோய்',
    severity: 'High',
    confidence: 92,
    treatment: [
      'Apply Tricyclazole 75% WP @ 0.6g/litre of water',
      'Spray during early morning or evening hours',
      'Repeat after 10-15 days if infection persists',
      'Ensure proper field drainage to prevent spread',
    ],
    imageUrl: null,
  },
  {
    id: 'ph2',
    farmerId: 'F005',
    farmerName: FARMERS[4].name,
    date: '2026-03-08',
    diseaseEn: 'Tomato Leaf Curl Virus',
    diseaseTa: 'தக்காளி இலை சுருட்டு வைரஸ்',
    severity: 'Medium',
    confidence: 87,
    treatment: [
      'Remove and destroy infected plants immediately',
      'Control whitefly vectors with Imidacloprid 17.8% SL @ 0.5ml/litre',
      'Install yellow sticky traps @ 25/acre',
      'Use reflective mulch to repel whiteflies',
    ],
    imageUrl: null,
  },
];

export const COMMON_PESTS = [
  { name: 'Rice Blast', icon: '🌾', severity: 'High', tip: 'Use resistant varieties and balanced nitrogen fertilization' },
  { name: 'Brown Plant Hopper', icon: '🦗', severity: 'High', tip: 'Avoid excessive nitrogen; use light traps for monitoring' },
  { name: 'Whitefly', icon: '🪲', severity: 'Medium', tip: 'Yellow sticky traps and neem oil spray are effective' },
  { name: 'Aphids', icon: '🐜', severity: 'Medium', tip: 'Encourage natural predators like ladybugs; neem oil works well' },
  { name: 'Thrips', icon: '🦟', severity: 'Low', tip: 'Spray spinosad or neem-based insecticides early morning' },
  { name: 'Stem Borer', icon: '🐛', severity: 'High', tip: 'Release Trichogramma egg parasitoids before flowering' },
];

// Dashboard stats
export const STATS = {
  totalFarmers: FARMERS.length,
  callsToday: randInt(12, 45),
  activeAlerts: WEATHER_DATA.filter(w => w.alert).length,
  avgLandSize: '4.2 acres',
  topCrops: [
    { name: 'Rice', count: 18 },
    { name: 'Banana', count: 14 },
    { name: 'Tomato', count: 11 },
    { name: 'Sugarcane', count: 9 },
    { name: 'Cotton', count: 7 },
  ],
  districtCounts: DISTRICTS.slice(0, 10).map(d => ({
    district: d.split(' ')[0],
    count: randInt(15, 120),
  })),
};
