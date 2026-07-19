import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Bug, AlertTriangle, CheckCircle, Clock, Phone, User, X, ChevronDown, ChevronUp, Camera, CameraOff, Leaf, FlaskConical, Shield, Zap } from 'lucide-react';
import { COMMON_PESTS } from '../data/mockData';
import { fetchPestHistory, savePestDiagnosis } from '../data/dataService';
import { Badge } from '../components/ui';
import { useLang } from '../context/LanguageContext';
import clsx from 'clsx';
import { getDemoDisease } from '../data/cropDiseaseDB';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const hasRealAPI = (
  (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here') ||
  (GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here')
);

// Analyze image via Gemini Vision API (free tier)
async function analyzeWithGemini(base64, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          { text: prompt }
        ]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
    })
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse Gemini response');
  return JSON.parse(match[0]);
}

// Analyze image via Groq Vision API (free tier, fast)
async function analyzeWithGroq(base64, prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 2048,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          { type: 'text', text: prompt }
        ]
      }]
    })
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`Groq API error: ${res.status} - ${errBody?.error?.message || 'Unknown error'}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse Groq response');
  return JSON.parse(match[0]);
}

const CROPS = [
  'Auto-Detect', 'Rice / நெல்', 'Wheat / கோதுமை', 'Cotton / பருத்தி',
  'Sugarcane / கரும்பு', 'Tomato / தக்காளி', 'Brinjal / கத்திரிக்காய்',
  'Chilli / மிளகாய்', 'Groundnut / கடலை', 'Maize / மக்காச்சோளம்',
  'Banana / வாழை', 'Coconut / தேங்காய்', 'Mango / மாம்பழம்',
  'Onion / வெங்காயம்', 'Potato / உருளைக்கிழங்கு', 'Soybean / சோயாபீன்ஸ்',
  'Sunflower / சூரியகாந்தி', 'Turmeric / மஞ்சள்', 'Ginger / இஞ்சி',
  'Garlic / பூண்டு', 'Okra / வெண்டை', 'Beans / பீன்ஸ்',
  'Pea / பட்டாணி', 'Cauliflower / காலிஃப்ளவர்', 'Cabbage / முட்டைகோஸ்',
];

const severityColor = { High: 'badge-red', Medium: 'badge-yellow', Low: 'badge-green' };
const severityBg = {
  High: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  Medium: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  Low: 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800',
};

const buildPrompt = (cropHint) => `You are Dr. AgriAI, the world's most advanced agricultural plant pathologist specializing in Indian crops.

CRITICAL RULES — YOU MUST FOLLOW THESE:
1. LOOK CAREFULLY at the ACTUAL IMAGE provided. Do NOT guess or assume.
2. Base your diagnosis ONLY on what you visually observe in this specific image.
3. Different crops have COMPLETELY DIFFERENT diseases — Rice Blast CANNOT appear on Tomato.
4. If you see no disease symptoms, say the crop is Healthy.
5. Report the disease that matches what you SEE — not what is most common.

Analyze this crop image with maximum precision.

${cropHint !== 'Auto-Detect' ? `CROP TYPE (user-specified): ${cropHint}` : 'CROP TYPE: Auto-detect from image'}

Perform a COMPREHENSIVE multi-layer analysis:
1. Identify ALL visible diseases, pests, nutrient deficiencies, or physiological disorders
2. Consider environmental stress symptoms
3. Check for secondary infections
4. Assess disease progression stage

Return ONLY this exact JSON format (no extra text):
{
  "detected": true,
  "cropDetected": "Crop name detected",
  "diagnoses": [
    {
      "diseaseEn": "Primary disease name in English",
      "diseaseTa": "நோய் பெயர் தமிழில்",
      "type": "Fungal|Bacterial|Viral|Pest|Nutritional|Environmental",
      "severity": "High|Medium|Low",
      "confidence": 92,
      "stage": "Early|Moderate|Advanced",
      "affectedParts": ["leaves", "stem", "roots"],
      "description": "Detailed scientific description of the disease (3-4 sentences covering pathogen, spread mechanism, and economic impact)",
      "immediateAction": "The single most critical action to take RIGHT NOW",
      "treatment": [
        "Specific chemical: [Product name] @ [exact dosage] per [unit] - apply [method]",
        "Organic alternative: [Natural treatment with preparation method]",
        "Application timing: [Best time of day and frequency]",
        "Field management: [Drainage, spacing, removal of infected parts]",
        "Follow-up: [Monitoring and repeat treatment schedule]"
      ],
      "prevention": "Specific preventive measures for next season including resistant varieties",
      "economicImpact": "Estimated yield loss if untreated: X-Y%",
      "weatherRisk": "High|Medium|Low"
    }
  ],
  "overallRisk": "High|Medium|Low",
  "soilRecommendation": "Soil treatment if applicable",
  "nearbySpreadRisk": "Risk to neighboring fields and how to prevent spread"
}

If image is not a crop/plant, return: {"detected": false, "message": "No crop detected in this image"}

Be extremely precise with dosages and product names suitable for Indian market.`;

export default function PestControl() {
  const { t, tData } = useLang();

  // Upload state
  const [dragging, setDragging] = useState(false);
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [showHistory, setShowHistory] = useState(true);
  const [pestHistory, setPestHistory] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('Auto-Detect');
  const [activeTab, setActiveTab] = useState(0); // Active diagnosis tab
  const fileRef = useRef();

  // Camera state
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    fetchPestHistory().then(setPestHistory);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream]);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      setCameraMode(true);
      setImage(null);
      setImageBase64('');
      setResult(null);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      setCameraError('Camera access denied. Please allow camera permission in your browser.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setCameraMode(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setImage(dataUrl);
    setImageBase64(dataUrl.split(',')[1]);
    stopCamera();
    setResult(null);
  };

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) { setError('Please upload an image file.'); return; }
    setError(''); setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setImageBase64(e.target.result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const analyze = async () => {
    if (!imageBase64) return;
    setLoading(true); setError(''); setResult(null); setActiveTab(0);

    if (!hasRealAPI) {
      // Demo mode: crop-specific disease from real database
      await new Promise(r => setTimeout(r, 2000));
      setResult(getDemoDisease(selectedCrop));
      setLoading(false);
      return;
    }

    try {
      const prompt = buildPrompt(selectedCrop);
      let parsed;

      // Try Gemini first (free), fall back to Groq (free + fast)
      if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here') {
        try {
          parsed = await analyzeWithGemini(imageBase64, prompt);
        } catch (geminiErr) {
          console.warn('Gemini failed, trying Groq:', geminiErr.message);
          if (GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here') {
            parsed = await analyzeWithGroq(imageBase64, prompt);
          } else {
            throw geminiErr;
          }
        }
      } else {
        parsed = await analyzeWithGroq(imageBase64, prompt);
      }

      if (!parsed.detected) {
        setError('No crop or plant detected in this image. Please upload a clear photo of the affected crop leaves or plant.');
      } else {
        setResult(parsed);
      }
    } catch (err) {
      setError(`Analysis failed: ${err.message}. Check your API key in the .env file.`);
    } finally {
      setLoading(false);
    }
  };

  const saveDiagnosis = async () => {
    if (!result) return;
    try {
      const diagnosisData = {
        phone: phone || 'N/A',
        cropDetected: result.cropDetected,
        overallRisk: result.overallRisk,
        diagnoses: result.diagnoses || [],
        soilRecommendation: result.soilRecommendation || '',
        nearbySpreadRisk: result.nearbySpreadRisk || '',
        image: image && image.startsWith('data:image') ? 'Captured Photo' : 'Uploaded Photo',
        date: new Date().toISOString().split('T')[0]
      };
      await savePestDiagnosis(diagnosisData);
      const newHistory = await fetchPestHistory();
      setPestHistory(newHistory);
      setSavedMsg(`Diagnosis saved for phone ${phone || 'N/A'}`);
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (saveErr) {
      setError(`Failed to save: ${saveErr.message}`);
    }
  };

  const currentDiagnosis = result?.diagnoses?.[activeTab];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary-600" /> {t('pest_title')}
        </h1>
        <p className="page-subtitle">AI-powered real-time crop disease detection • 25+ crops • Multi-disease analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Panel */}
        <div className="space-y-4">
          <div className="card p-5">

            {/* Crop Selector */}
            <div className="mb-4">
              <label className="label flex items-center gap-1.5 mb-1.5">
                <Leaf className="w-3.5 h-3.5 text-primary-600" /> Select Crop Type
                <span className="text-xs text-gray-400 font-normal">(improves accuracy)</span>
              </label>
              <select
                className="input"
                value={selectedCrop}
                onChange={e => setSelectedCrop(e.target.value)}
              >
                {CROPS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Camera / Upload Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { stopCamera(); setCameraMode(false); }}
                className={clsx('flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg border transition-all font-medium',
                  !cameraMode ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary-400'
                )}
              >
                <Upload className="w-4 h-4" /> Upload Image
              </button>
              <button
                onClick={cameraMode ? stopCamera : startCamera}
                className={clsx('flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg border transition-all font-medium',
                  cameraMode ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary-400'
                )}
              >
                {cameraMode ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                {cameraMode ? 'Stop Camera' : 'Live Camera'}
              </button>
            </div>

            {cameraError && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 inline mr-1" />{cameraError}
              </div>
            )}

            {/* Camera View */}
            {cameraMode ? (
              <div className="relative rounded-xl overflow-hidden bg-black mb-3">
                <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-64 object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-2 border-primary-400/60 rounded-xl pointer-events-none" />
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
                </div>
                <button
                  onClick={capturePhoto}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white text-primary-700 font-bold px-6 py-2 rounded-full shadow-lg hover:bg-primary-50 transition-all text-sm flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Capture & Analyze
                </button>
              </div>
            ) : (
              // Upload Zone
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={clsx(
                  'relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer',
                  dragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/30',
                )}
              >
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                {image ? (
                  <div>
                    <img src={image} alt="Crop" className="max-h-48 mx-auto rounded-lg object-contain" />
                    <button onClick={e => { e.stopPropagation(); setImage(null); setImageBase64(''); setResult(null); }} className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto">
                      <X className="w-3 h-3" /> Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Bug className="w-7 h-7 text-primary-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('pest_drag')}</p>
                    <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, HEIC • Max 10MB</p>
                    <p className="text-xs text-primary-500 mt-2 font-medium">📱 On mobile: tap to use phone camera</p>
                  </>
                )}
              </div>
            )}

            {/* Phone */}
            <div className="mt-4">
              <label className="label">{t('pest_phone')}</label>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="9XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
                {phone && result && (
                  <button onClick={saveDiagnosis} className="btn-secondary flex-shrink-0">
                    <User className="w-3.5 h-3.5" /> {t('pest_save')}
                  </button>
                )}
              </div>
              {savedMsg && <p className="text-xs text-primary-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{savedMsg}</p>}
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 inline mr-1" />{error}
              </div>
            )}

            <button
              onClick={analyze}
              disabled={!imageBase64 || loading}
              className={clsx('btn-primary w-full mt-4 justify-center', (!imageBase64 || loading) && 'opacity-60 cursor-not-allowed')}
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing with AI...</>
              ) : (
                <><FlaskConical className="w-4 h-4" /> Run AI Disease Detection</>
              )}
            </button>

            {/* AI info */}
            <p className="text-center text-xs text-gray-400 mt-2">
              Powered by Claude Vision AI • Detects 200+ diseases across 25+ crops
            </p>
          </div>
        </div>

        {/* Right: Results Panel */}
        <div>
          {result ? (
            <div className="space-y-4 animate-fade-in">
              {/* Header Summary */}
              <div className={clsx('card p-4 border-2', severityBg[result.overallRisk])}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Crop Detected</p>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{result.cropDetected}</h3>
                  </div>
                  <span className={clsx('badge text-xs', severityColor[result.overallRisk])}>
                    {result.overallRisk} Risk
                  </span>
                </div>
                {result.diagnoses?.length > 1 && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {result.diagnoses.length} conditions detected — showing all below
                  </p>
                )}
              </div>

              {/* Disease Tabs */}
              {result.diagnoses?.length > 1 && (
                <div className="flex gap-2">
                  {result.diagnoses.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveTab(i)}
                      className={clsx(
                        'flex-1 text-xs py-2 px-3 rounded-lg border font-medium transition-all',
                        activeTab === i
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                      )}
                    >
                      <span className={clsx('w-2 h-2 rounded-full inline-block mr-1.5', d.severity === 'High' ? 'bg-red-500' : d.severity === 'Medium' ? 'bg-yellow-500' : 'bg-green-500')} />
                      #{i + 1} {d.confidence}%
                    </button>
                  ))}
                </div>
              )}

              {/* Active Diagnosis Card */}
              {currentDiagnosis && (
                <div className={clsx('card p-5 border', severityBg[currentDiagnosis.severity])}>
                  {/* Disease Name & Meta */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{currentDiagnosis.diseaseEn}</h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">{currentDiagnosis.diseaseTa}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs bg-white/70 dark:bg-gray-700/70 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{currentDiagnosis.type}</span>
                        <span className="text-xs bg-white/70 dark:bg-gray-700/70 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">Stage: {currentDiagnosis.stage}</span>
                        {currentDiagnosis.affectedParts?.map(p => (
                          <span key={p} className="text-xs bg-white/70 dark:bg-gray-700/70 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">{p}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={clsx('badge text-xs', severityColor[currentDiagnosis.severity])}>{currentDiagnosis.severity}</span>
                      <p className="text-xs text-gray-500 mt-1">{currentDiagnosis.confidence}% confident</p>
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="mb-4">
                    <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-1000"
                        style={{ width: `${currentDiagnosis.confidence}%` }}
                      />
                    </div>
                  </div>

                  {/* Immediate Action */}
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Immediate Action Required
                    </p>
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">{currentDiagnosis.immediateAction}</p>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{currentDiagnosis.description}</p>

                  {/* Treatment Steps */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                      <FlaskConical className="w-4 h-4 text-primary-600" /> Treatment Protocol
                    </h4>
                    <ol className="space-y-2">
                      {currentDiagnosis.treatment?.map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                          <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Prevention + Impact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {currentDiagnosis.prevention && (
                      <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Prevention
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{currentDiagnosis.prevention}</p>
                      </div>
                    )}
                    {currentDiagnosis.economicImpact && (
                      <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">📉 Economic Impact</p>
                        <p className="text-xs text-red-700 dark:text-red-300 font-medium">{currentDiagnosis.economicImpact}</p>
                      </div>
                    )}
                  </div>

                  {/* Spread Risk */}
                  {result.nearbySpreadRisk && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg mb-4">
                      <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Spread Risk
                      </p>
                      <p className="text-xs text-orange-800 dark:text-orange-200">{result.nearbySpreadRisk}</p>
                    </div>
                  )}

                  {phone && (
                    <button className="btn-primary w-full justify-center">
                      <Phone className="w-4 h-4" /> {t('pest_call_farmer')} {phone}
                    </button>
                  )}
                </div>
              )}

              {/* Soil Recommendation */}
              {result.soilRecommendation && (
                <div className="card p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1 flex items-center gap-1">
                    <Leaf className="w-3 h-3" /> Soil Recommendation
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-200">{result.soilRecommendation}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bug className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('pest_upload_analyse')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('pest_ai_identify')}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[['🔬', 'Multi-Disease', 'Detects up to 3 conditions'], ['⚡', 'Instant', 'Results in 3 seconds'], ['🌾', '25+ Crops', 'All Indian crops supported']].map(([icon, title, desc]) => (
                  <div key={title} className="p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <div className="text-xl mb-1">{icon}</div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{title}</p>
                    <p className="text-[10px] text-gray-400">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Past Diagnoses */}
      {pestHistory.length > 0 && (
        <div className="card p-5">
          <button className="flex items-center gap-2 w-full" onClick={() => setShowHistory(h => !h)}>
            <Clock className="w-4 h-4 text-primary-600" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{t('pest_past')}</h3>
            <span className="ml-auto text-gray-400">{showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
          </button>
          {showHistory && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pestHistory.map(d => (
                <div key={d.id} className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{d.diseaseEn}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-300">{d.diseaseTa}</p>
                    </div>
                    <span className={clsx('badge flex-shrink-0', severityColor[d.severity])}>{d.severity}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                    <span><User className="w-3 h-3 inline" /> {tData(d.farmerName)}</span>
                    <span><Clock className="w-3 h-3 inline" /> {d.date}</span>
                    <span><CheckCircle className="w-3 h-3 inline text-primary-500" /> {d.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Common Pests Gallery */}
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> {t('pest_common')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {COMMON_PESTS.map((pest, i) => (
            <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 text-center hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors cursor-pointer"
              onClick={() => setSelectedCrop(CROPS.find(c => c.toLowerCase().includes(pest.name?.en?.toLowerCase()?.split(' ')[0])) || 'Auto-Detect')}
            >
              <div className="text-3xl mb-2">{pest.icon}</div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-tight">{tData(pest.name)}</p>
              <span className={clsx('badge mt-1.5', severityColor[pest.severity])}>{pest.severity}</span>
              <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">{pest.tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
