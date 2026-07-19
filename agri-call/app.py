"""
AgriVoice AI — app.py v5.3 (AI hallucination fixes)
Fixes applied:
  v5.1:
    1. extract_land_size: handles Tamil word-numbers AND "X ஏக்கர்" phrases
    2. Language switch: system prompt + conversation memory flushed on switch
    3. Groq timeout: filler wait increased + future timeout raised to 20s
    4. AI hallucination: system prompt grounded — unknown words must NOT be treated as pest/disease names
    5. Bullet lists: double-enforced in prompt + post-processing strip
    6. /transfer-complete: missing @app.route decorator added
    7. AI always replies in the currently-active language (hard rule injected)
  v5.2:
    8. STT three-tier pipeline: high-conf Twilio → Whisper → low-conf fallback
    9. Whisper silence/garbage detection: skip <1KB audio, filter hallucinations
   10. make_gather: speech_timeout="auto", phone_call model, profanity_filter=False
   11. Garbage text detector: drops single-word noise before hitting the AI
   12. Short-input clarification: 1-2 word inputs ask farmer to elaborate
  v5.3 (AI hallucination overhaul):
   13. FIX-A: Model upgraded llama-3.1-8b-instant → llama-3.3-70b-versatile
   14. FIX-B: Temperature lowered 0.4 → 0.15, top_p 0.85 → 0.75
   15. FIX-C: Crop KB injection increased crops[:2] → crops[:4]
   16. FIX-D: Explicit "I don't know" instruction added to all 4 language prompts
   17. FIX-E: Conversation history trimmed [-10:] → [-6:] to reduce context noise
   18. ai-reply timeout raised 20s → 25s to handle 70B model latency
"""

import threading
import time
import os
import re
import random
import tempfile
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

import requests
from flask import Flask, request, jsonify
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Gather
from groq import Groq
from dotenv import load_dotenv

from database import (
    get_farmer, save_farmer, save_conversation_summary,
    save_weather_alert, farmer_profile_summary,
    update_farmer_field, get_db, phone_to_id,
)
from weather_engine import fetch_weather, generate_crop_advisory, detect_alerts, format_weather_sms
from digital_twin import run_digital_twin
from alert_scheduler import start_scheduler

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
GROQ_API_KEY       = os.environ.get("GROQ_API_KEY",       "")
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN  = os.environ.get("TWILIO_AUTH_TOKEN",  "")
TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER", "")
YOUR_PHONE_NUMBER  = os.environ.get("YOUR_PHONE_NUMBER",  "")
NGROK_URL          = os.environ.get("NGROK_URL",          "")

# ── Init ──────────────────────────────────────────────────────────────────────
app    = Flask(__name__)
groq   = Groq(api_key=GROQ_API_KEY)
twilio = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Per-call state
conversations = {}   # call_sid → [{role, content}]
call_phones   = {}   # call_sid → phone number
call_lang     = {}   # call_sid → current language
onboarding    = {}   # call_sid → {step, data, system}

# Background Groq executor
_executor      = ThreadPoolExecutor(max_workers=10)
_pending_reply = {}  # call_sid → Future[str]

# ── Language config ───────────────────────────────────────────────────────────
VOICES = {
    "ta": ("Google.ta-IN-Standard-A", "ta-IN"),
    "te": ("Google.te-IN-Standard-A", "te-IN"),
    "hi": ("Google.hi-IN-Standard-A", "hi-IN"),
    "en": ("Google.en-IN-Standard-A", "en-IN"),
}

STT_LANG = {
    "ta": "ta-IN",
    "te": "te-IN",
    "hi": "hi-IN",
    "en": "en-IN",
}

WHISPER_LANG = {
    "ta": "ta",
    "te": "te",
    "hi": "hi",
    "en": "en",
}

# Filler sounds — alice TTS plays instantly (zero synthesis delay)
FILLERS = {
    "ta": ["ம்ம்ம்...", "ஆமா...", "சரி சரி...", "ஒரு நிமிடம்..."],
    "te": ["అమ్మా...", "సరే...", "ఒక్క నిమిషం..."],
    "hi": ["हम्म...", "अच्छा...", "एक पल..."],
    "en": ["Hmm...", "I see...", "One moment..."],
}
_ALICE_LANG = {"ta": "ta-IN", "te": "te-IN", "hi": "hi-IN", "en": "en-IN"}

# ── Crop knowledge base ───────────────────────────────────────────────────────
CROP_KB = {
    "rice": {
        "ta": (
            "நெல் / அரிசி பயிர் தகவல்:\n"
            "• பூச்சிகள்: தண்டு துளைப்பான் (stem borer) — இலைகள் மஞ்சளாகும், குழல்கள் இறந்துவிடும். குளோரான்ட்ரனிலிப்ரோல் தெளிக்கவும்.\n"
            "• நோய்கள்: பிளாஸ்ட் (blast) — பழுப்பு புள்ளிகள் இலையில். ட்ரைசைக்ளசோல் பூச்சிக்கொல்லி பயன்படுத்தவும்.\n"
            "• நோய்கள்: தண்டு அழுகல் (sheath blight) — அதிக ஈரப்பதத்தில் வரும். வயலில் நீர் தேங்காமல் பார்க்கவும்.\n"
            "• பருவம்: குறுவை (Jun-Sep), சம்பா (Aug-Jan), தாளடி (Jan-Apr).\n"
            "• நீர்: நாள் ஒன்றுக்கு 8மிமீ. வயல் 2-3 செமீ தண்ணீர் வைத்திருக்கவும்.\n"
            "• உரம்: நாற்று நடும்போது 50 கிலோ யூரியா + 50 கிலோ DAP / ஏக்கர். 30 நாள் கழித்து மேலுரம் 25 கிலோ யூரியா."
        ),
        "en": (
            "Rice crop knowledge:\n"
            "• Pests: Stem borer — yellowing tillers, dead hearts. Use Chlorantraniliprole.\n"
            "• Disease: Blast — brown lesions on leaves. Apply Tricyclazole.\n"
            "• Disease: Sheath blight — high humidity. Drain waterlogged fields.\n"
            "• Seasons: Kuruvai (Jun-Sep), Samba (Aug-Jan), Thaladi (Jan-Apr).\n"
            "• Water: 8mm/day. Keep 2-3cm standing water.\n"
            "• Fertilizer: 50kg Urea + 50kg DAP/acre at planting. Top dress 25kg Urea at 30 days."
        ),
    },
    "wheat": {
        "ta": (
            "கோதுமை பயிர் தகவல்:\n"
            "• பூச்சிகள்: அசுவினி (aphid) — இலை அடிபாகத்தில் கூட்டமாக இருக்கும். இமிடாக்ளோபிரிட் தெளிக்கவும்.\n"
            "• நோய்கள்: துரு நோய் (rust) — மஞ்சள்/பழுப்பு தூள். டெப்யூகோனசோல் தெளிக்கவும்.\n"
            "• பருவம்: நவம்பர்-டிசம்பர் விதை; மார்ச்-ஏப்ரல் அறுவடை.\n"
            "• நீர்: CRI (21 நாள்), தூர் விடுதல் (45 நாள்), பூக்கும் நேரம் (65 நாள்) — 3 தடவை நீர் தேவை.\n"
            "• வெப்பம்: 35°C மேல் போனால் தானியம் சுருங்கும் — ஆரம்ப காலை நீர் பாய்ச்சவும்."
        ),
        "en": (
            "Wheat crop knowledge:\n"
            "• Pest: Aphids — clusters under leaves. Apply Imidacloprid.\n"
            "• Disease: Rust — yellow/brown powder on leaves. Use Tebuconazole.\n"
            "• Season: Sow Nov-Dec; harvest Mar-Apr.\n"
            "• Irrigation: 3 critical stages — CRI (21d), tillering (45d), flowering (65d).\n"
            "• Heat: Above 35°C causes grain shriveling — irrigate early morning."
        ),
    },
    "cotton": {
        "ta": (
            "பருத்தி பயிர் தகவல்:\n"
            "• பூச்சிகள்: வெள்ளை ஈ (whitefly) — இலை அடிபாகம். திமேத்தாக்சம் தெளிக்கவும்.\n"
            "• பூச்சிகள்: பிங்க் போல்வார்ம் (pink bollworm) — காய் உள்ளே புழு. ஃபெனவலரேட் தெளிக்கவும்.\n"
            "• நோய்கள்: வேர் அழுகல் (root rot) — அதிக நீரில் வரும். வடிகால் சரிசெய்யவும்.\n"
            "• உரம்: 30 கிலோ N + 15 கிலோ P + 15 கிலோ K / ஏக்கர். பூ வரும்போது கலோரைடு தவிர்க்கவும்.\n"
            "• ஈரப்பதம் 75% மேல் → பூஞ்சை நோய் வாய்ப்பு, கோபர் ஆக்சிகுளோரைடு தெளிக்கவும்."
        ),
        "en": (
            "Cotton crop knowledge:\n"
            "• Pest: Whitefly — under leaves. Apply Thiamethoxam.\n"
            "• Pest: Pink bollworm — larvae inside bolls. Use Fenvalerate.\n"
            "• Disease: Root rot — overwatering. Improve drainage.\n"
            "• Fertilizer: 30kg N + 15kg P + 15kg K/acre. Avoid chloride at flowering.\n"
            "• Humidity >75% → fungal risk, spray Copper Oxychloride."
        ),
    },
    "tomato": {
        "ta": (
            "தக்காளி பயிர் தகவல்:\n"
            "• பூச்சிகள்: பழம் துளைப்பான் (fruit borer) — காய்களில் துளை. ஸ்பினோசாட் தெளிக்கவும்.\n"
            "• நோய்கள்: இலை சுருள் வைரஸ் (leaf curl) — வெள்ளை ஈ மூலம் பரவும். மஞ்சள் நாடா பொறி வையுங்கள்.\n"
            "• நோய்கள்: ஆர்லி பிளைட் — பழுப்பு வளையம் இலையில். மான்கோஸெப் தெளிக்கவும்.\n"
            "• நீர்: 6மிமீ/நாள். மாலை நீர் தவிர்க்கவும் (நோய் வரும்). காலை நீர் மட்டும்.\n"
            "• வெப்பம் 35°C மேல் → பூ உதிரும். மாலை தண்ணீர் தெளிக்கவும் (foliar spray)."
        ),
        "en": (
            "Tomato crop knowledge:\n"
            "• Pest: Fruit borer — holes in fruits. Apply Spinosad.\n"
            "• Disease: Leaf curl virus — spread by whitefly. Use yellow sticky traps.\n"
            "• Disease: Early blight — brown rings on leaves. Spray Mancozeb.\n"
            "• Water: 6mm/day. Avoid evening watering (causes disease). Morning only.\n"
            "• Above 35°C → flower drop. Do foliar spray in evening."
        ),
    },
    "sugarcane": {
        "ta": (
            "கரும்பு பயிர் தகவல்:\n"
            "• பூச்சிகள்: இடுப்பு புழு (internode borer) — தண்டில் துளை, சாறு வடியும். குளோரோபைரிஃபாஸ் தெளிக்கவும்.\n"
            "• நோய்கள்: சிவப்பு அழுகல் (red rot) — தண்டை வெட்டினால் சிவப்பு நிறம். நோய் தாக்கிய தண்டை அகற்றவும்.\n"
            "• உரம்: 250 கிலோ யூரியா + 100 கிலோ DAP + 100 கிலோ MOP / ஏக்கர் — 3 தவணைகளாக கொடுக்கவும்.\n"
            "• நீர்: வாரம் ஒரு தடவை. பூக்கும் நேரம் நீர் குறைக்காதீர்கள்."
        ),
        "en": (
            "Sugarcane crop knowledge:\n"
            "• Pest: Internode borer — holes in stalk, sap oozing. Apply Chlorpyrifos.\n"
            "• Disease: Red rot — red discoloration inside stalk. Remove infected stalks immediately.\n"
            "• Fertilizer: 250kg Urea + 100kg DAP + 100kg MOP/acre in 3 splits.\n"
            "• Water: Once a week. Do not reduce water during grand growth phase."
        ),
    },
    "maize": {
        "ta": (
            "மக்காச்சோளம் பயிர் தகவல்:\n"
            "• பூச்சிகள்: ஃபால் ஆர்மி வார்ம் (fall armyworm) — இளம் இலையில் துளைகள், மலம் தெரியும். ஸ்பினோசாட் அல்லது எமாமெக்டின் தெளிக்கவும்.\n"
            "• நோய்கள்: டவ்னி மில்டு (downy mildew) — இலை வெள்ளை பூஞ்சை. மெட்டலாக்சில் விதை நேர்த்தி செய்யவும்.\n"
            "• உரம்: விதை நேரத்தில் 50 கிலோ DAP. 25 நாளில் 50 கிலோ யூரியா. பூக்கும்போது 25 கிலோ யூரியா.\n"
            "• நீர்: தாசல் நேரம் (tasseling) மற்றும் கதிர் நிரம்பும் நேரம் (grain filling) — தண்ணீர் தவறாமல் கொடுக்கவும்."
        ),
        "en": (
            "Maize crop knowledge:\n"
            "• Pest: Fall armyworm — holes in young leaves, frass visible. Apply Spinosad or Emamectin.\n"
            "• Disease: Downy mildew — white fungus on leaves. Seed treat with Metalaxyl.\n"
            "• Fertilizer: 50kg DAP at sowing, 50kg Urea at 25 days, 25kg Urea at tasseling.\n"
            "• Water: Critical at tasseling and grain filling — never miss irrigation."
        ),
    },
    "groundnut": {
        "ta": (
            "நிலக்கடலை பயிர் தகவல்:\n"
            "• பூச்சிகள்: இலை சுரண்டி (leaf miner) — இலையில் வெள்ளை கோடுகள். இமிடாக்ளோபிரிட் தெளிக்கவும்.\n"
            "• நோய்கள்: டிக்கா இலை புள்ளி (tikka) — பழுப்பு புள்ளிகள். மான்கோஸெப் 45 நாட்களுக்கு ஒரு முறை தெளிக்கவும்.\n"
            "• பெக்கிங் நேரம் (peg formation): 40-60 நாள். மண் தளர்வாக இருக்கவேண்டும், நடவு வேண்டாம்.\n"
            "• கால்சியம்: ஜிப்சம் 200 கிலோ/ஏக்கர் — பூக்கும் நேரத்தில் இடவும்."
        ),
        "en": (
            "Groundnut crop knowledge:\n"
            "• Pest: Leaf miner — white streaks on leaves. Apply Imidacloprid.\n"
            "• Disease: Tikka leaf spot — brown spots. Spray Mancozeb every 45 days.\n"
            "• Peg formation (40-60 days): Keep soil loose, avoid inter-cultivation.\n"
            "• Calcium: Apply 200kg Gypsum/acre at flowering stage."
        ),
    },
    "banana": {
        "ta": (
            "வாழை பயிர் தகவல்:\n"
            "• பூச்சிகள்: குருத்து அழுகல் (corm weevil) — தண்டின் அடி அழுகும். குளோரோபைரிஃபாஸ் கரைசல் ஊற்றவும்.\n"
            "• நோய்கள்: பனாமா விட் (Panama wilt / Fusarium) — இலை மஞ்சளாகி வாடும். நோய் தாக்கிய செடியை அகற்றவும், மண் சுகாதாரம் பராமரிக்கவும்.\n"
            "• நோய்கள்: சிகடோகா (Sigatoka) — இலையில் கோடுகள். பிரோபிக்கோனசோல் தெளிக்கவும்.\n"
            "• உரம்: மாதம் 100 கிராம் யூரியா + 100 கிராம் MOP செடி ஒன்றுக்கு."
        ),
        "en": (
            "Banana crop knowledge:\n"
            "• Pest: Corm weevil — base of plant rots. Drench with Chlorpyrifos solution.\n"
            "• Disease: Panama wilt (Fusarium) — yellowing, wilting. Remove infected plants, maintain soil hygiene.\n"
            "• Disease: Sigatoka — streaks on leaves. Spray Propiconazole.\n"
            "• Fertilizer: 100g Urea + 100g MOP per plant per month."
        ),
    },
}

_CROP_SYNONYMS = {
    "நெல்": "rice", "அரிசி": "rice", "paddy": "rice",
    "கோதுமை": "wheat",
    "பருத்தி": "cotton",
    "தக்காளி": "tomato",
    "கரும்பு": "sugarcane",
    "மக்காச்சோளம்": "maize", "சோளம்": "maize", "corn": "maize",
    "நிலக்கடலை": "groundnut", "கடலை": "groundnut", "peanut": "groundnut",
    "வாழை": "banana",
}


def _normalize_crop(name: str) -> str:
    n = name.lower().strip()
    for syn, key in _CROP_SYNONYMS.items():
        if syn in n or n in syn:
            return key
    return n


# ── FIX 1: Robust land size extractor ────────────────────────────────────────
_TAMIL_NUMS = {
    "ஒன்று": 1, "ஒன்றை": 1, "ஒண்ணு": 1, "ஒரு": 1, "ஒண்": 1,
    "இரண்டு": 2, "ரெண்டு": 2, "இரு": 2, "ரண்டு": 2,
    "மூன்று": 3, "மூணு": 3, "மூன்": 3,
    "நான்கு": 4, "நாலு": 4, "நான்": 4,
    "ஐந்து": 5, "அஞ்சு": 5, "ஐந்": 5,
    "ஆறு": 6, "ஏழு": 7, "எட்டு": 8,
    "ஒன்பது": 9, "பத்து": 10,
    "பதினைந்து": 15, "இருபது": 20, "முப்பது": 30,
    "நாற்பது": 40, "ஐம்பது": 50,
    # Hindi
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5,
    "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
    # Telugu
    "ఒకటి": 1, "రెండు": 2, "మూడు": 3, "నాలుగు": 4, "అయిదు": 5,
}

def extract_land_size(text: str) -> str:
    clean = re.sub(
        r"(ஏக்கர்|ஏக்|acres?|acre|एकड़|ఎకరాలు|ఎకరం|hectares?|ha)\s*",
        " ", text, flags=re.IGNORECASE
    ).strip()
    nums = re.findall(r'\d+\.?\d*', clean)
    if nums:
        return str(float(nums[0]))
    best_val   = None
    best_len   = 0
    lower_text = text.lower()
    for word, val in sorted(_TAMIL_NUMS.items(), key=lambda x: -len(x[0])):
        if word in lower_text or word in text:
            if len(word) > best_len:
                best_val = val
                best_len = len(word)
    if best_val is not None:
        return str(float(best_val))
    return "1.0"


def clean_name(text: str) -> str:
    noise = {"என்னோட", "என்", "பேர்", "பெயர்", "நான்", "name", "is", "my",
             "i", "am", "பேரு", "ஐ", "அம்"}
    words = [w for w in text.split() if w.lower() not in noise]
    return " ".join(words[:3]).strip() if words else text.strip()


# ── FIX-C + FIX-D: Grounded system prompt with I-don't-know rule ─────────────
def build_system_prompt(lang: str, farmer: dict = None, weather_text: str = "") -> str:
    """
    Build a crop-specific, voice-optimised system prompt.
    FIX-C: injects up to 4 crops into KB (was 2).
    FIX-D: explicit 'I don't know' instruction added to every language.
    """
    crops = [_normalize_crop(c) for c in (farmer or {}).get("crops", [])]
    name  = (farmer or {}).get("name", "")
    dist  = (farmer or {}).get("district", "")
    land  = (farmer or {}).get("land_size", "")

    voice_rules = {
        "ta": (
            "நீங்கள் AgriVoice AI — தமிழ் விவசாயிகளின் நம்பகமான விவசாய நிபுணர்.\n\n"
            "கட்டாய விதிகள்:\n"
            "1. எப்போதும் தமிழில் மட்டுமே பேசவும். ஒரு வார்த்தை கூட வேறு மொழியில் பேசாதீர்கள்.\n"
            "2. பதில் முழுமையாக, விரிவாக இருக்கவேண்டும் — எதையும் சுருக்காதீர்கள்.\n"
            "3. பட்டியல் (bullet points, numbers) வேண்டாம் — இயற்கையான தொடர் பேச்சு மட்டுமே.\n"
            "4. விவசாயி சொன்ன வார்த்தை ஒரு அறியப்பட்ட பூச்சி அல்லது நோய் பெயர் இல்லாவிட்டால், "
            "அதை பூச்சி அல்லது நோய் என்று கற்பனை செய்து பதில் சொல்லாதீர்கள். "
            "அந்த வார்த்தையை புரிந்துகொண்டு சரியான விவசாய அர்த்தத்தில் மட்டும் பதில் சொல்லவும்.\n"
            "5. பயிர் பிரச்சனைக்கு இந்த வரிசையில் சொல்லவும்: "
            "அறிகுறி → ஏன் வருகிறது → எந்த மருந்து → எவ்வளவு அளவு → எப்போது தெளிக்கணும் → எத்தனை தடவை → தடுப்பு முறை.\n"
            "6. உரம் கேட்டால்: எந்த உரம், எவ்வளவு கிலோ, எப்போது, எப்படி.\n"
            "7. நீர்ப்பாசனம் கேட்டால்: எத்தனை நாளுக்கு ஒரு முறை, எவ்வளவு நேரம், எந்த நேரம்.\n"
            "8. வானிலை தகவல் இருந்தால் பயிருக்கு என்ன தாக்கம் என்று சொல்லவும்.\n"
            "9. விவசாயி பெயரை அன்புடன் சொல்லவும்.\n"
            # FIX-D
            "10. உங்களுக்கு தெரியாத கேள்விக்கு: 'எனக்கு இந்த தகவல் தெரியவில்லை, "
            "உங்கள் அருகிலுள்ள கிருஷி விக்யான் கேந்திரா அல்லது விவசாய அலுவலரை தொடர்பு கொள்ளுங்கள்' "
            "என்று சொல்லவும். கற்பனையான பூச்சிக்கொல்லி பெயர், அளவு, அல்லது நோய் பெயர் ஒருபோதும் சொல்லாதீர்கள்.\n"
            "11. பதில் முடிந்த பிறகு: 'வேறு ஏதாவது உதவி வேண்டுமா?' என்று கேளுங்கள்.\n"
        ),
        "te": (
            "మీరు AgriVoice AI — తెలుగు రైతుల నమ్మకమైన వ్యవసాయ నిపుణుడు.\n\n"
            "తప్పనిసరి నియమాలు:\n"
            "1. ఎల్లప్పుడూ తెలుగులో మాట్లాడండి — మరే భాష వాడవద్దు.\n"
            "2. ప్రతి ప్రశ్నకు పూర్తి విస్తృత సమాధానం ఇవ్వండి.\n"
            "3. జాబితా (bullets/numbers) వద్దు — సహజ మాట్లాట.\n"
            "4. రైతు చెప్పిన పదం తెలిసిన పురుగు లేదా వ్యాధి పేరు కాకపోతే, దాన్ని పురుగు లేదా వ్యాధిగా "
            "ఊహించి సమాధానం చెప్పవద్దు. సరైన వ్యవసాయ అర్థంలో మాత్రమే సమాధానం చెప్పండి.\n"
            # FIX-D
            "5. మీకు సమాధానం తెలియకపోతే: 'నాకు ఈ సమాచారం తెలియదు, దయచేసి మీ స్థానిక "
            "కృషి విజ్ఞాన కేంద్రాన్ని సంప్రదించండి' అని చెప్పండి. "
            "కల్పిత పురుగుమందు పేర్లు లేదా మోతాదులు చెప్పవద్దు.\n"
            "6. చివర 'మరింత సహాయం కావాలా?' అని అడగండి.\n"
        ),
        "hi": (
            "आप AgriVoice AI हैं — हिंदी किसानों के विश्वसनीय कृषि विशेषज्ञ।\n\n"
            "अनिवार्य नियम:\n"
            "1. हमेशा हिंदी में बोलें — कोई और भाषा नहीं।\n"
            "2. हर सवाल का पूरा विस्तृत जवाब दें।\n"
            "3. सूची (bullets/numbers) नहीं — बातचीत की भाषा।\n"
            "4. किसान ने जो शब्द बोला वो कोई जानी-मानी कीट या बीमारी का नाम नहीं है तो उसे "
            "कीट या बीमारी मानकर जवाब मत दें। सही कृषि संदर्भ में जवाब दें।\n"
            # FIX-D
            "5. अगर आपको जवाब नहीं पता: 'मुझे यह जानकारी नहीं है, कृपया अपने नज़दीकी "
            "कृषि विज्ञान केंद्र से संपर्क करें' — यही कहें। "
            "कभी भी काल्पनिक कीटनाशक नाम, खुराक या बीमारी का नाम मत बताएं।\n"
            "6. अंत में 'और कोई मदद चाहिए?' पूछें।\n"
        ),
        "en": (
            "You are AgriVoice AI — a trusted agricultural expert for Indian farmers.\n\n"
            "MANDATORY RULES:\n"
            "1. ALWAYS reply in English only — never mix Tamil, Telugu, or Hindi into your response.\n"
            "2. Give complete, exhaustive answers — never cut short.\n"
            "3. NEVER use bullet points, numbered lists, or headers — flowing natural speech only.\n"
            "4. CRITICAL: If the farmer mentions a word that is NOT a known pest, disease, or crop term, "
            "do NOT invent a pest/disease/symptom around it. Understand the farmer's actual intent and "
            "answer based on real agricultural knowledge only.\n"
            "5. For crop problems: exact symptom, root cause, precise pesticide name, exact dosage per acre, "
            "frequency, best time of day, re-entry interval, and prevention steps.\n"
            "6. For fertilizer: exact product, kg per acre, timing, method.\n"
            "7. For irrigation: frequency, duration, best time.\n"
            # FIX-D
            "8. CRITICAL — I DON'T KNOW RULE: If you are not certain about a pesticide name, dosage, "
            "disease name, or any specific agricultural fact, say: "
            "'I don't have reliable information on that — please contact your local Krishi Vigyan Kendra "
            "or agricultural officer.' NEVER invent product names, chemical names, or dosages. "
            "A wrong pesticide recommendation can destroy a farmer's crop and income.\n"
            "9. End every response with: 'Is there anything else you need help with?'\n"
        ),
    }

    prompt = voice_rules.get(lang, voice_rules["en"])

    # ── Farmer context ────────────────────────────────────────────────────────
    if name or dist or crops:
        ctx_parts = []
        if name: ctx_parts.append(f"விவசாயி: {name}" if lang == "ta" else f"Farmer: {name}")
        if dist: ctx_parts.append(f"மாவட்டம்: {dist}" if lang == "ta" else f"District: {dist}")
        if land: ctx_parts.append(f"நிலம்: {land} ஏக்கர்" if lang == "ta" else f"Land: {land} acres")
        if crops:
            crop_str = ", ".join(crops)
            ctx_parts.append(f"பயிர்கள்: {crop_str}" if lang == "ta" else f"Crops: {crop_str}")
        prompt += "\n" + " | ".join(ctx_parts) + "\n"

    # ── Active language reminder ───────────────────────────────────────────────
    reminder = {
        "ta": "\nமிக முக்கியம்: உங்கள் பதில் முழுவதும் தமிழில் மட்டும் இருக்கவேண்டும்.\n",
        "te": "\nచాలా ముఖ్యం: మీ సమాధానం మొత్తం తెలుగులో మాత్రమే ఉండాలి.\n",
        "hi": "\nबहुत जरूरी: आपका जवाब पूरा हिंदी में होना चाहिए।\n",
        "en": "\nCRITICAL: Your ENTIRE response must be in English. Do not write even one word in Tamil, Telugu, or Hindi.\n",
    }
    prompt += reminder.get(lang, "")

    # ── Weather context ───────────────────────────────────────────────────────
    if weather_text:
        prefix = "இன்று வானிலை: " if lang == "ta" else "Today's weather: "
        prompt += prefix + weather_text.split(".")[0] + ".\n"

    # ── Crop-specific KB — FIX-C: inject up to 4 crops (was 2) ───────────────
    kb_lang = "ta" if lang == "ta" else "en"
    added = 0
    for crop in crops[:4]:                    # ← FIX-C
        kb = CROP_KB.get(crop, {}).get(kb_lang, "")
        if kb:
            prompt += "\n" + kb
            added += 1

    if added == 0:
        if lang == "ta":
            prompt += "\nபொது உதவி: பயிர் நோய், பூச்சி, நீர்ப்பாசனம், உரம், அரசு திட்டங்கள், சந்தை விலை."
        else:
            prompt += "\nHelp topics: crop disease, pests, irrigation, fertilizer, government schemes, market prices."

    return prompt


SYSTEM_PROMPTS = {lang: build_system_prompt(lang) for lang in ("ta", "te", "hi", "en")}


# ── Onboarding questions ──────────────────────────────────────────────────────
ONBOARD_Q = {
    "ta": {
        1: "உங்கள் பெயர் என்ன?",
        2: "நீங்கள் எந்த கிராமத்தில் வசிக்கிறீர்கள்?",
        3: "உங்கள் மாவட்டம் எது? கோயம்புத்தூர், மதுரை என்று சொல்லுங்கள்.",
        4: "நீங்கள் என்ன பயிர் பயிரிடுகிறீர்கள்?",
        5: "உங்கள் நிலத்தின் அளவு எத்தனை ஏக்கர்?",
    },
    "te": {
        1: "మీ పేరు ఏమిటి?",
        2: "మీరు ఏ గ్రామంలో నివసిస్తున్నారు?",
        3: "మీ జిల్లా ఏది?",
        4: "మీరు ఏ పంటలు పండిస్తున్నారు?",
        5: "మీ భూమి ఎన్ని ఎకరాలు?",
    },
    "hi": {
        1: "आपका नाम क्या है?",
        2: "आप किस गाँव में रहते हैं?",
        3: "आपका जिला कौन सा है?",
        4: "आप कौन सी फसल उगाते हैं?",
        5: "आपकी जमीन कितने एकड़ है?",
    },
    "en": {
        1: "What is your name?",
        2: "Which village do you live in?",
        3: "What is your district?",
        4: "What crops do you grow?",
        5: "How many acres of land do you have?",
    },
}

END_WORDS = ["நன்றி", "போகிறேன்", "முடிந்தது", "வைக்கிறேன்",
             "ధన్యవాదాలు", "వెళ్తున్నాను",
             "धन्यवाद", "जा रहा हूँ",
             "bye", "goodbye", "thank you", "done"]

_EXTRA_END_WORDS = [
    "தேங்க்யூ", "தாங்க்யூ", "பை", "பை பை",
    "ఓకే బై", "థాంక్యూ",
    "शुक्रिया", "ओके बाय",
]

SMS_WORDS = ["sms", "மெசேஜ்", "அனுப்பு", "మెసేజ్", "పంపు", "मैसेज", "भेजो", "message", "send"]

YIELD_WORDS = {
    "ta": ["விளைச்சல்", "விற்க", "விற்பனை"],
    "te": ["దిగుబడి", "అమ్మాలి", "అమ్మకం"],
    "hi": ["फसल", "बेचना", "बिक्री"],
    "en": ["yield", "sell", "sale", "harvest"],
}

_ENGLISH_SWITCH = [
    "speak in english", "english please", "talk in english",
    "english lo", "english mein", "in english", "switch english",
    "english only", "use english",
    "இங்கிலீஷ்", "ஆங்கிலம்", "english", "இங்கிலீஷ் ஸ்பீக்",
    "अंग्रेजी", "इंग्लिश",
    "ఇంగ్లీష్",
]


# ── Language detection ────────────────────────────────────────────────────────
def detect_lang(text: str) -> str:
    ta = sum(1 for c in text if '\u0B80' <= c <= '\u0BFF')
    te = sum(1 for c in text if '\u0C00' <= c <= '\u0C7F')
    hi = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    if ta > 1 and ta >= te and ta >= hi: return "ta"
    if te > 1 and te > ta  and te >= hi: return "te"
    if hi > 1 and hi > ta  and hi > te:  return "hi"
    return "en"


# ── TwiML helpers ─────────────────────────────────────────────────────────────
def say(target, text: str, lang: str = "ta"):
    voice, lc = VOICES.get(lang, VOICES["ta"])
    target.say(text, voice=voice, language=lc)


def make_gather(action: str, lang: str = "ta") -> Gather:
    return Gather(
        input="speech",
        action=action,
        method="POST",
        speech_timeout="auto",
        speech_model="phone_call",
        language=STT_LANG.get(lang, "ta-IN"),
        enhanced=True,
        profanity_filter=False,
    )


# ── STT ───────────────────────────────────────────────────────────────────────
def transcribe_whisper(recording_url: str, lang: str = "ta") -> str:
    """Download Twilio recording and transcribe with Groq Whisper."""
    try:
        time.sleep(0.8)
        r = requests.get(
            recording_url + ".mp3",
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            timeout=15,
        )
        r.raise_for_status()
        if len(r.content) < 1000:
            print("⚠️  Whisper: recording too short, skipping")
            return ""
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            f.write(r.content)
            tmp = f.name
        with open(tmp, "rb") as af:
            result = groq.audio.transcriptions.create(
                file=("audio.mp3", af),
                model="whisper-large-v3",
                language=WHISPER_LANG.get(lang, "ta"),
                response_format="text",
                temperature=0.0,
            )
        os.unlink(tmp)
        text = (result if isinstance(result, str) else result.text).strip()
        if len(text) < 2 or text in (".", "...", " "):
            return ""
        return text
    except Exception as e:
        print(f"Whisper error: {e}")
        return ""


# ── Garbage / noise detector ──────────────────────────────────────────────────
_GARBAGE_PATTERNS = re.compile(
    r"^(எனக்கு|நான்|ஆமா|சரி|ஓ|ஆ|ம்|ம்ம்|ok|okay|yes|no|hmm|ah|uh|um)\.?$",
    re.IGNORECASE,
)

def _is_garbage(text: str) -> bool:
    text = text.strip()
    if len(text) < 3:
        return True
    if _GARBAGE_PATTERNS.match(text):
        return True
    return False


def get_speech(form: dict, lang: str = "ta") -> str:
    """
    STT pipeline — three-tier priority:
      1. Twilio STT with HIGH confidence
      2. Groq Whisper from RecordingUrl
      3. Twilio STT low-confidence fallback
    """
    speech     = form.get("SpeechResult", "").strip()
    confidence = float(form.get("Confidence", 0))
    rec_url    = form.get("RecordingUrl", "").strip()

    hi_threshold = 0.55 if lang in ("ta", "te") else 0.60
    if speech and confidence >= hi_threshold and not _is_garbage(speech):
        print(f"🎤 [Twilio {confidence:.0%}] {speech}")
        return speech

    if rec_url:
        result = transcribe_whisper(rec_url, lang)
        if result and not _is_garbage(result):
            print(f"🎤 [Whisper] {result}")
            return result

    if speech and not _is_garbage(speech) and len(speech.split()) >= 2:
        print(f"🎤 [Twilio low-conf {confidence:.0%}] {speech}")
        return speech

    if speech:
        print(f"🎤 [Discarded low-conf {confidence:.0%}] {speech}")
    return ""


# ── FIX-A + FIX-B + FIX-E: AI Reply ─────────────────────────────────────────
def get_ai_reply(call_sid: str, user_msg: str, system: str, lang: str = "ta") -> str:
    """
    Get AI reply.
    FIX-A: upgraded to llama-3.3-70b-versatile for better domain grounding.
    FIX-B: temperature lowered to 0.15, top_p to 0.75.
    FIX-E: history trimmed to last 6 messages (3 exchanges).
    """
    if call_sid not in conversations:
        conversations[call_sid] = []
    conversations[call_sid].append({"role": "user", "content": user_msg})

    history = conversations[call_sid][-6:]    # ← FIX-E (was -10)

    response = groq.chat.completions.create(
        model="llama-3.3-70b-versatile",      # ← FIX-A (was llama-3.1-8b-instant)
        messages=[{"role": "system", "content": system}] + history,
        max_tokens=600,
        temperature=0.15,                      # ← FIX-B (was 0.4)
        top_p=0.75,                            # ← FIX-B (was 0.85)
        frequency_penalty=0.3,
        stop=["---"],
    )
    reply = response.choices[0].message.content.strip()

    # ── Post-processing: strip bullet artifacts ───────────────────────────────
    reply = re.sub(r"^\s*[-•*]\s+", "", reply, flags=re.MULTILINE)
    reply = re.sub(r"^\s*\d+\.\s+", "", reply, flags=re.MULTILINE)
    reply = re.sub(r"\n+", " ", reply).strip()

    # ── Language guard: English active but Tamil chars bleed in ───────────────
    if lang == "en":
        ta_chars = sum(1 for c in reply if '\u0B80' <= c <= '\u0BFF')
        total    = max(len(reply), 1)
        if ta_chars / total > 0.15:
            print(f"⚠️  Language bleed detected, re-prompting in English...")
            enforce = system + "\n\nIMPERATIVE: Respond in ENGLISH ONLY. Do not write Tamil."
            response2 = groq.chat.completions.create(
                model="llama-3.3-70b-versatile",  # ← FIX-A
                messages=[{"role": "system", "content": enforce},
                          {"role": "user",   "content": user_msg}],
                max_tokens=600,
                temperature=0.15,                  # ← FIX-B
            )
            reply = response2.choices[0].message.content.strip()
            reply = re.sub(r"\n+", " ", reply).strip()

    conversations[call_sid].append({"role": "assistant", "content": reply})
    return reply


def summarize_conversation(call_sid: str, lang: str = "ta") -> str:
    if not conversations.get(call_sid):
        return ""
    history_text = "\n".join(
        f"{'விவசாயி' if m['role'] == 'user' else 'AgriVoice'}: {m['content'][:150]}"
        for m in conversations[call_sid][-8:]
    )
    prompts = {
        "ta": f"இந்த உரையாடலை 2 வரிகளில் தமிழில் சுருக்கவும்:\n{history_text}",
        "te": f"ఈ సంభాషణను 2 తెలుగు వాక్యాలలో సారాంశం:\n{history_text}",
        "hi": f"इस बातचीत को 2 हिंदी वाक्यों में सारांशित करें:\n{history_text}",
        "en": f"Summarize this conversation in 2 sentences:\n{history_text}",
    }
    try:
        response = groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompts.get(lang, prompts["en"])}],
            max_tokens=80,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Summary error: {e}")
        return ""


# ── Weather ───────────────────────────────────────────────────────────────────
def get_weather_advisory(district: str, crops: list, lang: str = "ta") -> str:
    if not district:
        return ""
    try:
        data = fetch_weather(f"{district},India", days=7)
        if data:
            return generate_crop_advisory(data, crops, lang)
    except Exception as e:
        print(f"Weather error: {e}")
    return ""


# ── Digital Twin ──────────────────────────────────────────────────────────────
def update_twin(phone: str, farmer: dict, district: str):
    def _run():
        try:
            data = fetch_weather(f"{district},India", days=30, include_history=True)
            if data:
                twin = run_digital_twin(farmer, data, farmer.get("sowing_date"))
                get_db().collection("farmers").document(phone_to_id(phone)).update({
                    "digital_twin": twin,
                    "twin_updated": datetime.now().isoformat(),
                })
                print(f"🌱 Twin updated: {phone} health={twin.get('overall_health')}%")
        except Exception as e:
            print(f"Twin error: {e}")
    threading.Thread(target=_run, daemon=True).start()


# ── SMS ───────────────────────────────────────────────────────────────────────
def send_sms(phone: str, body: str) -> bool:
    if not phone or not body:
        return False
    if not phone.startswith("+"):
        phone = "+" + phone
    try:
        msg = twilio.messages.create(
            from_=TWILIO_FROM_NUMBER,
            body=body[:320],
            to=phone,
        )
        print(f"📱 SMS sent → {phone} | {msg.sid}")
        return True
    except Exception as e:
        print(f"❌ SMS failed: {e}")
        return False


def send_summary_sms(call_sid: str, phone: str, lang: str):
    summary = summarize_conversation(call_sid, lang)
    if not summary:
        return
    prefixes = {
        "ta": "AgriVoice AI உரையாடல் சுருக்கம்:\n",
        "te": "AgriVoice AI సంభాషణ సారాంశం:\n",
        "hi": "AgriVoice AI बातचीत सारांश:\n",
        "en": "AgriVoice AI conversation summary:\n",
    }
    body = prefixes.get(lang, prefixes["en"]) + summary + "\nஉதவி: 1800-180-1551"
    if send_sms(phone, body):
        save_conversation_summary(phone, summary)


# ── Flask Routes ──────────────────────────────────────────────────────────────

@app.route("/start", methods=["POST", "GET"])
def start():
    call_sid  = request.form.get("CallSid", "default")
    direction = request.form.get("Direction", "inbound")
    if direction == "outbound-api" or request.form.get("From", "") == TWILIO_FROM_NUMBER:
        phone = request.form.get("To", YOUR_PHONE_NUMBER)
    else:
        phone = request.form.get("From", YOUR_PHONE_NUMBER)
    call_phones[call_sid] = phone

    farmer = get_farmer(phone)
    resp   = VoiceResponse()

    if farmer:
        lang     = farmer.get("language", "ta")
        call_lang[call_sid] = lang
        name     = farmer.get("name", "விவசாயி")
        district = farmer.get("district", "")
        crops    = farmer.get("crops", [])
        crops_str= ", ".join(crops)

        weather_text = get_weather_advisory(district, crops, lang)
        if district:
            save_weather_alert(phone, "daily_check", district)
            update_twin(phone, farmer, district)

        if district:
            try:
                wd = fetch_weather(f"{district},India", days=2)
                if wd:
                    alerts = detect_alerts(wd, crops)
                    urgent = [a for a in alerts if a.get("days_from_now", 99) <= 1]
                    if urgent:
                        sms_body = format_weather_sms(wd, crops, district, urgent[0]["type"])
                        send_sms(phone, sms_body)
                        save_weather_alert(phone, urgent[0]["type"], district)
            except Exception as e:
                print(f"Alert check error: {e}")

        greetings = {
            "ta": f"வணக்கம் {name} அவர்களே! நான் AgriVoice AI. நீங்கள் {district} மாவட்டத்தில் {crops_str} பயிரிடுகிறீர்கள். {weather_text} என்ன உதவி வேண்டும்?",
            "te": f"నమస్కారం {name} గారూ! నేను AgriVoice AI. మీరు {district} జిల్లాలో {crops_str} పండిస్తున్నారు. {weather_text} ఏమి సహాయం కావాలి?",
            "hi": f"नमस्ते {name} जी! मैं AgriVoice AI हूँ। आप {district} जिले में {crops_str} उगाते हैं। {weather_text} क्या मदद चाहिए?",
            "en": f"Hello {name}! I am AgriVoice AI. You grow {crops_str} in {district}. {weather_text} How can I help you today?",
        }
        greeting = greetings.get(lang, greetings["ta"])
        system   = build_system_prompt(lang, farmer, weather_text)

        conversations[call_sid] = [{"role": "assistant", "content": greeting}]
        onboarding[call_sid]    = {"step": 0, "data": farmer, "system": system}

        gather = make_gather("/respond", lang)
        say(gather, greeting, lang)
        resp.append(gather)

    else:
        lang = "ta"
        call_lang[call_sid] = lang
        onboarding[call_sid] = {"step": 1, "data": {}, "system": SYSTEM_PROMPTS["ta"]}

        greet_new = {
            "ta": "வணக்கம்! நான் AgriVoice AI, உங்கள் விவசாய உதவியாளர். இது உங்கள் முதல் அழைப்பு, சில விவரங்கள் கேட்கிறேன். உங்கள் பெயர் என்ன?",
            "en": "Hello! I am AgriVoice AI, your agriculture assistant. This is your first call. What is your name?",
        }
        greeting = greet_new.get(lang, greet_new["ta"])
        gather   = make_gather("/onboard", lang)
        say(gather, greeting, lang)
        resp.append(gather)

    resp.redirect("/start")
    return str(resp)


@app.route("/onboard", methods=["POST"])
def onboard():
    call_sid = request.form.get("CallSid", "default")
    phone    = call_phones.get(call_sid, YOUR_PHONE_NUMBER)
    lang     = call_lang.get(call_sid, "ta")
    resp     = VoiceResponse()
    state    = onboarding.get(call_sid, {"step": 1, "data": {}})
    step     = state["step"]
    data     = state["data"]

    answer = get_speech(request.form, lang)

    if not answer:
        gather = make_gather("/onboard", lang)
        say(gather, "மன்னிக்கவும், சரியாக கேட்கவில்லை. கொஞ்சம் தெளிவாக சொல்லுங்கள்.", lang)
        resp.append(gather)
        return str(resp)

    if step == 1:
        detected = detect_lang(answer)
        if detected != lang:
            print(f"🌐 Language detected: {detected}")
            lang = detected
            call_lang[call_sid] = lang
            onboarding[call_sid]["system"] = SYSTEM_PROMPTS.get(lang, SYSTEM_PROMPTS["ta"])
            if detected != "ta":
                gather = make_gather("/onboard", lang)
                greet_msgs = {
                    "te": "నమస్కారం! నేను AgriVoice AI. మీ పేరు ఏమిటి?",
                    "hi": "नमस्ते! मैं AgriVoice AI हूँ। आपका नाम क्या है?",
                    "en": "Hello! I am AgriVoice AI. What is your name?",
                }
                say(gather, greet_msgs.get(lang, greet_msgs["en"]), lang)
                resp.append(gather)
                return str(resp)

    print(f"📝 Step {step} [{lang}]: {answer}")

    answer = answer.strip()
    if   step == 1: data["name"]    = clean_name(answer)
    elif step == 2: data["village"] = answer
    elif step == 3: data["district"]= answer
    elif step == 4:
        crops = [c.strip() for c in answer.replace(",", " ").replace("மற்றும்", " ").split() if len(c.strip()) > 1]
        data["crops"] = crops or [answer]
    elif step == 5:
        data["land_size"] = extract_land_size(answer)

    state["data"] = data
    state["step"] = step + 1
    onboarding[call_sid] = state

    if step >= 5:
        data["language"] = lang
        save_farmer(phone, data)

        district     = data.get("district", "")
        weather_text = get_weather_advisory(district, data.get("crops", []), lang)
        if district:
            save_weather_alert(phone, "first_call", district)
            update_twin(phone, data, district)

        system = build_system_prompt(lang, data, weather_text)
        onboarding[call_sid]["system"] = system
        conversations[call_sid] = []

        name = data.get("name", "")
        done_msgs = {
            "ta": f"நன்றி {name} அவர்களே! உங்கள் விவரங்கள் சேமிக்கப்பட்டன. இனி எப்போது அழைத்தாலும் உங்களை அடையாளம் காண்போம். {weather_text} இப்போது என்ன உதவி வேண்டும்?",
            "te": f"ధన్యవాదాలు {name} గారూ! మీ వివరాలు సేవ్ చేయబడ్డాయి. {weather_text} ఇప్పుడు ఏమి సహాయం కావాలి?",
            "hi": f"धन्यवाद {name} जी! आपकी जानकारी सहेज ली गई। {weather_text} अब आपको क्या मदद चाहिए?",
            "en": f"Thank you {name}! Your details have been saved. {weather_text} How can I help you now?",
        }
        done_msg = done_msgs.get(lang, done_msgs["ta"])
        gather   = make_gather("/respond", lang)
        say(gather, done_msg, lang)
        resp.append(gather)

    else:
        next_q = ONBOARD_Q.get(lang, ONBOARD_Q["ta"]).get(step + 1, "")
        gather = make_gather("/onboard", lang)
        say(gather, next_q, lang)
        resp.append(gather)

    return str(resp)


@app.route("/respond", methods=["POST"])
def respond():
    call_sid = request.form.get("CallSid", "default")
    phone    = call_phones.get(call_sid, YOUR_PHONE_NUMBER)
    lang     = call_lang.get(call_sid, "ta")
    resp     = VoiceResponse()
    state    = onboarding.get(call_sid, {"system": SYSTEM_PROMPTS.get(lang, SYSTEM_PROMPTS["ta"])})
    system   = state.get("system", SYSTEM_PROMPTS.get(lang, SYSTEM_PROMPTS["ta"]))

    farmer_said = get_speech(request.form, lang)

    if not farmer_said:
        gather = make_gather("/respond", lang)
        not_heard = {
            "ta": "மன்னிக்கவும், சரியாக கேட்கவில்லை. கொஞ்சம் தெளிவாக சொல்லுங்கள்.",
            "te": "క్షమించండి, సరిగ్గా వినలేదు. కొంచెం స్పష్టంగా చెప్పండి.",
            "hi": "माफ़ करें, स्पष्ट रूप से नहीं सुना। ज़रा साफ़ बोलें।",
            "en": "Sorry, I didn't catch that clearly. Could you please speak again?",
        }
        say(gather, not_heard.get(lang, not_heard["ta"]), lang)
        resp.append(gather)
        return str(resp)

    # ── Mid-call language switch ──────────────────────────────────────────────
    farmer_lower = farmer_said.lower()
    if any(kw in farmer_lower or kw in farmer_said for kw in _ENGLISH_SWITCH):
        detected = "en"
    else:
        detected = detect_lang(farmer_said)

    if detected != lang:
        print(f"🌐 Language switch: {lang} → {detected}")
        lang = detected
        call_lang[call_sid] = lang

        farmer   = state.get("data", {})
        new_sys  = build_system_prompt(lang, farmer)
        state["system"] = new_sys
        system   = new_sys
        onboarding[call_sid] = state
        conversations[call_sid] = []

        ack = {
            "ta": "சரி, தமிழில் பேசுகிறேன்.",
            "te": "సరే, తెలుగులో మాట్లాడతాను.",
            "hi": "ठीक है, हिंदी में बात करते हैं।",
            "en": "Sure, switching to English now.",
        }
        voice, lc = VOICES.get(lang, VOICES["en"])
        resp.say(ack.get(lang, ack["en"]), voice=voice, language=lc)

    # ── Intent checks ─────────────────────────────────────────────────────────
    all_end_words = END_WORDS + _EXTRA_END_WORDS

    # 1. Goodbye
    if any(w in farmer_lower or w in farmer_said for w in all_end_words):
        send_summary_sms(call_sid, phone, lang)
        update_farmer_field(phone, "last_call", datetime.now().isoformat())
        goodbyes = {
            "ta": "நன்றி! உங்கள் பயிர்கள் நன்றாக வளரட்டும். எந்த நேரமும் அழைக்கலாம். வணக்கம்!",
            "te": "ధన్యవాదాలు! మీ పంటలు బాగా పెరగాలి. నమస్కారం!",
            "hi": "धन्यवाद! आपकी फसल अच्छी हो। नमस्ते!",
            "en": "Thank you! Wishing you a great harvest. Goodbye!",
        }
        say(resp, goodbyes.get(lang, goodbyes["ta"]), lang)
        resp.hangup()
        conversations.pop(call_sid, None)
        onboarding.pop(call_sid, None)
        call_phones.pop(call_sid, None)
        call_lang.pop(call_sid, None)
        return str(resp)

    # 2. On-demand SMS
    if any(w in farmer_said.lower() for w in SMS_WORDS):
        send_summary_sms(call_sid, phone, lang)
        sms_confirms = {
            "ta": "SMS அனுப்பப்பட்டது! தொடரலாம்.",
            "te": "SMS పంపబడింది! కొనసాగించవచ్చు.",
            "hi": "SMS भेज दिया! जारी रखें।",
            "en": "SMS sent! Let's continue.",
        }
        gather = make_gather("/respond", lang)
        say(gather, sms_confirms.get(lang, sms_confirms["ta"]), lang)
        resp.append(gather)
        return str(resp)

    # 3. Yield sale → distributor transfer
    yield_kws = YIELD_WORDS.get(lang, YIELD_WORDS["en"])
    if sum(1 for k in yield_kws if k in farmer_said.lower()) >= 2:
        transfer_msgs = {
            "ta": "உங்களை வினியோகஸ்தரிடம் இணைக்கிறேன். ஒரு நிமிடம் இருங்கள்.",
            "te": "మిమ్మల్ని పంపిణీదారుతో కలుపుతాను. ఒక్క నిమిషం.",
            "hi": "आपको वितरक से जोड़ रहा हूँ। एक पल रुकें।",
            "en": "Let me transfer you to a distributor. Please hold.",
        }
        send_summary_sms(call_sid, phone, lang)
        say(resp, transfer_msgs.get(lang, transfer_msgs["ta"]), lang)
        dial = resp.dial(action="/transfer-complete", method="POST", timeout=30)
        dial.number("+919000000001")
        return str(resp)

    # 4. Short input → clarify
    words = farmer_said.strip().split()
    if len(words) <= 2 and not any(w in farmer_said.lower() for w in SMS_WORDS + END_WORDS + _EXTRA_END_WORDS):
        clarify = {
            "ta": f"'{farmer_said}' — கொஞ்சம் விரிவாக சொல்லுங்கள். என்ன பிரச்சனை?",
            "te": f"'{farmer_said}' — కొంచెం వివరంగా చెప్పండి. ఏమి సమస్యం?",
            "hi": f"'{farmer_said}' — ज़रा विस्तार से बताएं। क्या समस्या है?",
            "en": f"Could you tell me more about '{farmer_said}'? What exactly is the problem?",
        }
        gather = make_gather("/respond", lang)
        say(gather, clarify.get(lang, clarify["en"]), lang)
        resp.append(gather)
        return str(resp)

    # 5. Launch AI in background
    future = _executor.submit(get_ai_reply, call_sid, farmer_said, system, lang)
    _pending_reply[call_sid] = future

    filler = random.choice(FILLERS.get(lang, FILLERS["ta"]))
    resp.say(filler, voice="alice", language=_ALICE_LANG.get(lang, "ta-IN"))
    resp.redirect("/ai-reply", method="POST")
    return str(resp)


@app.route("/ai-reply", methods=["POST"])
def ai_reply():
    call_sid = request.form.get("CallSid", "default")
    lang     = call_lang.get(call_sid, "ta")
    resp     = VoiceResponse()

    future = _pending_reply.pop(call_sid, None)
    try:
        # FIX-18: raised timeout 20s → 25s to handle 70B model latency
        reply = future.result(timeout=25) if future else ""
    except Exception as e:
        print(f"Groq timeout/error: {e}")
        reply = ""

    if not reply:
        reply = {
            "ta": "மன்னிக்கவும், மீண்டும் கேளுங்கள்.",
            "te": "క్షమించండి, మళ్ళీ చెప్పండి.",
            "hi": "माफ़ करें, फिर से बोलें।",
            "en": "Sorry, could you repeat that?",
        }.get(lang, "Sorry, please repeat.")

    print(f"🤖 AgriVoice [{lang}]: {reply}\n")
    gather = make_gather("/respond", lang)
    say(gather, reply, lang)
    resp.append(gather)
    resp.redirect("/respond")
    return str(resp)


@app.route("/call-status", methods=["POST"])
def call_status():
    call_sid = request.form.get("CallSid", "")
    status   = request.form.get("CallStatus", "")
    print(f"📞 Call {call_sid} ended — status: {status}")

    if status in ("completed", "no-answer", "busy", "failed"):
        phone = call_phones.get(call_sid, "")
        lang  = call_lang.get(call_sid, "ta")
        if phone and conversations.get(call_sid):
            print(f"📱 Auto-sending SMS summary for {phone}...")
            threading.Thread(
                target=send_summary_sms,
                args=(call_sid, phone, lang),
                daemon=True,
            ).start()
        conversations.pop(call_sid, None)
        onboarding.pop(call_sid, None)
        call_phones.pop(call_sid, None)
        call_lang.pop(call_sid, None)
        _pending_reply.pop(call_sid, None)

    return ("", 204)


@app.route("/transfer-complete", methods=["POST"])
def transfer_complete():
    call_sid = request.form.get("CallSid", "default")
    lang     = call_lang.get(call_sid, "ta")
    status   = request.form.get("DialCallStatus", "")
    resp     = VoiceResponse()
    if status in ("busy", "no-answer", "failed"):
        msgs = {
            "ta": "வினியோகஸ்தர் கிடைக்கவில்லை. கொஞ்சம் நேரம் கழித்து மீண்டும் அழைக்கவும்.",
            "te": "పంపిణీదారు అందుబాటులో లేరు. తర్వాత కాల్ చేయండి.",
            "hi": "वितरक उपलब्ध नहीं। बाद में कॉल करें।",
            "en": "Distributor unavailable. Please call back later.",
        }
        say(resp, msgs.get(lang, msgs["ta"]), lang)
    resp.hangup()
    return str(resp)


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "AgriVoice AI", "version": "5.3"})


# ── Auto-call on startup ──────────────────────────────────────────────────────
def place_call():
    time.sleep(3)
    print(f"\n📲 Calling {YOUR_PHONE_NUMBER}...")
    try:
        call = twilio.calls.create(
            to=YOUR_PHONE_NUMBER,
            from_=TWILIO_FROM_NUMBER,
            url=f"{NGROK_URL}/start",
            method="POST",
            timeout=30,
            status_callback=f"{NGROK_URL}/call-status",
            status_callback_method="POST",
            status_callback_event=["completed", "no-answer", "busy", "failed"],
        )
        print(f"✅ Call placed! SID: {call.sid}")
        print(f"📱 Pick up and speak!\n")
        print("💬 Live conversation:\n")
    except Exception as e:
        print(f"❌ Call failed: {e}")


if __name__ == "__main__":
    print("\n" + "═" * 50)
    print("  🌾  AgriVoice AI v5.3")
    print("═" * 50)
    print(f"  Phone   : {YOUR_PHONE_NUMBER}")
    print(f"  Webhook : {NGROK_URL}/start")
    print(f"  TTS     : Google.ta-IN-Standard-A ✅")
    print(f"  STT     : Whisper-first (Twilio hi-conf → Whisper → fallback)")
    print(f"  LLM     : Groq LLaMA 3.3 70B Versatile ✅")
    print(f"  Lang    : Tamil / Telugu / Hindi / English")
    print(f"  DB      : Firebase Firestore")
    print("═" * 50 + "\n")

    start_scheduler()
    threading.Thread(target=place_call, daemon=True).start()
    app.run(host="0.0.0.0", port=5000, debug=False)