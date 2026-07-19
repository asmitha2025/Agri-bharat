"""
AgriVoice AI — app_final.py
Production-ready. Clean rewrite incorporating all fixes from v5.1 → v7.7.
"""

import os, re, time, random, tempfile, threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, date

import requests
from flask import Flask, request, jsonify
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Gather
from groq import Groq
from dotenv import load_dotenv

from database import (
    get_farmer, save_farmer, save_conversation_summary,
    save_weather_alert, update_farmer_field, get_db, phone_to_id,
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

# ── Flask / Groq / Twilio init ────────────────────────────────────────────────
app    = Flask(__name__)
groq   = Groq(api_key=GROQ_API_KEY)
twilio = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Per-call in-memory state
conversations  = {}   # call_sid → [{role,content}]
call_phones    = {}   # call_sid → phone
call_lang      = {}   # call_sid → "ta"/"te"/"hi"/"en"
onboarding     = {}   # call_sid → {step, data, system, silence_count}
_pending_reply = {}   # call_sid → Future
_executor      = ThreadPoolExecutor(max_workers=20)

# ── Language / voice config ───────────────────────────────────────────────────
VOICES = {
    "ta": ("Google.ta-IN-Standard-A", "ta-IN"),
    "te": ("Google.te-IN-Standard-A", "te-IN"),
    "hi": ("Google.hi-IN-Standard-A", "hi-IN"),
    "en": ("Google.en-IN-Standard-A", "en-IN"),
}
STT_LANG    = {"ta":"ta-IN","te":"te-IN","hi":"hi-IN","en":"en-IN"}
WHISPER_LANG= {"ta":"ta",   "te":"te",   "hi":"hi",   "en":"en"}
_ALICE_LANG = {"ta":"ta-IN","te":"te-IN","hi":"hi-IN","en":"en-IN"}

FILLERS = {
    "ta": ["ம்ம்ம்...", "ஆமா...", "சரி சரி...", "ஒரு நிமிடம்..."],
    "te": ["అమ్మా...", "సరే...", "ఒక్క నిమిషం..."],
    "hi": ["हम्म...", "अच्छा...", "एक पल..."],
    "en": ["Hmm...", "I see...", "One moment..."],
}

# ── Crop knowledge base ───────────────────────────────────────────────────────
CROP_KB = {
    "rice":      {"ta": "நெல்: தண்டு துளைப்பான்→குளோரான்ட்ரனிலிப்ரோல். பிளாஸ்ட்→ட்ரைசைக்ளசோல். தண்டு அழுகல்→நீர் தேங்காமல். நீர் 8மிமீ/நாள். உரம் 50 யூரியா+50 DAP கிலோ/ஏக்கர்.", "en": "Rice: Stem borer→Chlorantraniliprole. Blast→Tricyclazole. Sheath blight→drain water. Water 8mm/day. Fertilizer 50kg Urea+50kg DAP/acre."},
    "wheat":     {"ta": "கோதுமை: அசுவினி→இமிடாக்ளோபிரிட். துரு→டெப்யூகோனசோல். நவம்பர்-டிசம்பர் விதை. நீர் CRI 21நாள், தூர் 45நாள், பூ 65நாள்.", "en": "Wheat: Aphids→Imidacloprid. Rust→Tebuconazole. Sow Nov-Dec. Irrigate: CRI 21d, tillering 45d, flowering 65d."},
    "cotton":    {"ta": "பருத்தி: வெள்ளை ஈ→திமேத்தாக்சம். பிங்க் போல்வார்ம்→ஃபெனவலரேட். வேர் அழுகல்→வடிகால். உரம் 30N+15P+15K கிலோ/ஏக்கர்.", "en": "Cotton: Whitefly→Thiamethoxam. Pink bollworm→Fenvalerate. Root rot→drainage. Fertilizer 30N+15P+15K kg/acre."},
    "tomato":    {"ta": "தக்காளி: பழம் துளைப்பான்→ஸ்பினோசாட். இலை சுருள்→மஞ்சள் நாடா. ஆர்லி பிளைட்→மான்கோஸெப். நீர் 6மிமீ/நாள் காலை மட்டும்.", "en": "Tomato: Fruit borer→Spinosad. Leaf curl→yellow traps. Early blight→Mancozeb. Water 6mm/day morning only."},
    "sugarcane": {"ta": "கரும்பு: இடுப்பு புழு→குளோரோபைரிஃபாஸ். சிவப்பு அழுகல்→தாக்கிய தண்டு அகற்று. உரம் 250 யூரியா+100 DAP+100 MOP கிலோ/ஏக்கர் 3 தவணை. வாரம் ஒரு நீர்.", "en": "Sugarcane: Internode borer→Chlorpyrifos. Red rot→remove stalks. Fertilizer 250 Urea+100 DAP+100 MOP kg/acre 3 splits. Water weekly."},
    "maize":     {"ta": "மக்காச்சோளம்: ஃபால் ஆர்மி வார்ம்→ஸ்பினோசாட். டவ்னி மில்டு→மெட்டலாக்சில். உரம் 50 DAP விதை, 50 யூரியா 25நாள், 25 யூரியா பூ.", "en": "Maize: Fall armyworm→Spinosad. Downy mildew→Metalaxyl. Fertilizer 50 DAP sowing, 50 Urea 25d, 25 Urea tasseling."},
    "groundnut": {"ta": "நிலக்கடலை: இலை சுரண்டி→இமிடாக்ளோபிரிட். டிக்கா→மான்கோஸெப் 45நாளுக்கொரு. பெக்கிங் 40-60நாள் மண் தளர்வு. ஜிப்சம் 200கிலோ/ஏக்கர் பூ நேரம்.", "en": "Groundnut: Leaf miner→Imidacloprid. Tikka→Mancozeb every 45d. Peg formation 40-60d loose soil. Gypsum 200kg/acre at flowering."},
    "banana":    {"ta": "வாழை: கோர்ம் வீவில்→குளோரோபைரிஃபாஸ். பனாமா விட்→நோய் செடி அகற்று. சிகடோகா→பிரோபிக்கோனசோல். உரம் 100கிராம் யூரியா+100கிராம் MOP மாதம்/செடி.", "en": "Banana: Corm weevil→Chlorpyrifos drench. Panama wilt→remove plants. Sigatoka→Propiconazole. Fertilizer 100g Urea+100g MOP/plant/month."},
}

_CROP_SYNONYMS = {
    "நெல்":"rice","அரிசி":"rice","paddy":"rice","கோதுமை":"wheat",
    "பருத்தி":"cotton","தக்காளி":"tomato","கரும்பு":"sugarcane",
    "மக்காச்சோளம்":"maize","சோளம்":"maize","corn":"maize",
    "நிலக்கடலை":"groundnut","கடலை":"groundnut","peanut":"groundnut","வாழை":"banana",
}

def _normalize_crop(name):
    n = name.lower().strip()
    for syn, key in _CROP_SYNONYMS.items():
        if syn in n or n in syn: return key
    return n

# ── Number / date helpers ─────────────────────────────────────────────────────
_TAMIL_NUMS = {
    "ஒன்று":1,"ஒன்றை":1,"ஒண்ணு":1,"ஒரு":1,"இரண்டு":2,"ரெண்டு":2,
    "மூன்று":3,"மூணு":3,"நான்கு":4,"நாலு":4,"ஐந்து":5,"அஞ்சு":5,
    "ஆறு":6,"ஏழு":7,"எட்டு":8,"ஒன்பது":9,"பத்து":10,
    "பதினைந்து":15,"இருபது":20,"முப்பது":30,"நாற்பது":40,"ஐம்பது":50,
    "एक":1,"दो":2,"तीन":3,"चार":4,"पांच":5,"छह":6,"सात":7,"आठ":8,"नौ":9,"दस":10,
    "ఒకటి":1,"రెండు":2,"మూడు":3,"నాలుగు":4,"అయిదు":5,
}

def extract_land_size(text):
    clean = re.sub(r"(ஏக்கர்|ஏக்|acres?|acre|एकड़|ఎకరాలు|ఎకరం|hectares?|ha)\s*"," ",text,flags=re.IGNORECASE).strip()
    nums = re.findall(r'\d+\.?\d*', clean)
    if nums: return str(float(nums[0]))
    best_val, best_len = None, 0
    for word, val in sorted(_TAMIL_NUMS.items(), key=lambda x: -len(x[0])):
        if word in text.lower() or word in text:
            if len(word) > best_len: best_val, best_len = val, len(word)
    return str(float(best_val)) if best_val else "1.0"

def clean_name(text):
    noise = {"என்னோட","என்","பேர்","பெயர்","நான்","name","is","my","i","am","பேரு"}
    words = [w for w in text.split() if w.lower() not in noise]
    return " ".join(words[:3]).strip() if words else text.strip()

_MONTH_MAP = {
    "ஜனவரி":1,"பிப்ரவரி":2,"மார்ச்":3,"ஏப்ரல்":4,"மே":5,"ஜூன்":6,
    "ஜூலை":7,"ஆகஸ்ட்":8,"செப்டம்பர்":9,"அக்டோபர்":10,"நவம்பர்":11,"டிசம்பர்":12,
    # Tamil ordinal spoken forms
    "முதல்":1,"முதலாம்":1,"ஒன்னாம்":1,"ரெண்டாம்":2,"இரண்டாம்":2,
    "மூணாம்":3,"மூன்றாம்":3,"நாலாம்":4,"நான்காம்":4,
    "ஐந்தாம்":5,"அஞ்சாம்":5,"ஆறாம்":6,"ஏழாம்":7,"எட்டாம்":8,
    "ஒன்பதாம்":9,"பத்தாம்":10,"பதினொன்றாம்":11,"பன்னிரண்டாம்":12,
    # English
    "january":1,"february":2,"march":3,"april":4,"may":5,"june":6,
    "july":7,"august":8,"september":9,"october":10,"november":11,"december":12,
    "jan":1,"feb":2,"mar":3,"apr":4,"jun":6,"jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12,
    # Hindi
    "पहला":1,"दूसरा":2,"तीसरा":3,"चौथा":4,"पांचवां":5,"छठा":6,
}

def parse_sowing_date(text):
    skip = {"தெரியல","தெரியவில்லை","skip","తెలియదు","पता नहीं","नहीं"}
    if any(w in text.lower() for w in skip): return None
    month_num, year_num = None, None
    a_lower = text.lower()
    for m_name, m_num in sorted(_MONTH_MAP.items(), key=lambda x: -len(x[0])):
        if m_name in a_lower:
            month_num = m_num
            break
    y = re.search(r"(20\d{2})", text)
    if y: year_num = int(y.group(1))
    if month_num and year_num: return f"{year_num}-{month_num:02d}-01"
    if year_num: return f"{year_num}-01-01"
    return None

# ── Crop growth stage ─────────────────────────────────────────────────────────
_CROP_STAGES = {
    "rice":      [(0,15,"நாற்று"),(15,35,"தூர் விடுதல்"),(35,65,"பூக்கும்"),(65,90,"கதிர்"),(90,120,"அறுவடை")],
    "wheat":     [(0,25,"Seedling"),(25,45,"Tillering"),(45,75,"Jointing"),(75,95,"Heading"),(95,150,"Harvest")],
    "cotton":    [(0,20,"Seedling"),(20,50,"Vegetative"),(50,80,"Squaring"),(80,150,"Flowering/Boll"),(150,180,"Harvest")],
    "sugarcane": [(0,30,"Germination"),(30,90,"Tillering"),(90,270,"Grand growth"),(270,365,"Harvest")],
    "tomato":    [(0,20,"Seedling"),(20,40,"Vegetative"),(40,60,"Flowering"),(60,110,"Harvest")],
    "maize":     [(0,20,"Seedling"),(20,65,"Vegetative/Tasseling"),(65,110,"Grain fill/Harvest")],
    "groundnut": [(0,20,"Seedling"),(20,70,"Vegetative/Pegging"),(70,130,"Pod fill/Harvest")],
    "banana":    [(0,60,"Establishment"),(60,240,"Vegetative"),(240,365,"Shooting/Harvest")],
}

def get_crop_stage(crop, sowing_date_str):
    if not sowing_date_str: return ""
    try:
        sowing = datetime.strptime(sowing_date_str, "%Y-%m-%d").date()
        days = (date.today() - sowing).days
        if days < 0: return ""
        for start, end, label in _CROP_STAGES.get(crop, []):
            if start <= days < end:
                return f"{label} ({days} நாள்)"
        return f"அறுவடை கழிந்தது ({days} நாள்)"
    except Exception:
        return ""

# ── Weather cache — one fetch per district per hour ───────────────────────────
_WEATHER_CACHE = {}
_WEATHER_TTL   = 3600

def _get_cached_weather(district, days=7):
    key = district.lower().replace(",india","").replace(", india","").strip()
    cached = _WEATHER_CACHE.get(key)
    if cached and (time.time() - cached["ts"]) < _WEATHER_TTL:
        return cached["data"]
    try:
        data = fetch_weather(f"{district},India", days=days)
        if data:
            _WEATHER_CACHE[key] = {"data": data, "ts": time.time()}
            print(f"🌤 Weather cached: {key}")
            return data
    except Exception as e:
        print(f"Weather error ({district}): {e}")
    return None

def get_weather_advisory(district, crops, lang="ta"):
    if not district: return ""
    try:
        data = _get_cached_weather(district)
        return generate_crop_advisory(data, crops, lang) if data else ""
    except Exception as e:
        print(f"Advisory error: {e}")
        return ""

# ── System prompt ─────────────────────────────────────────────────────────────
_PROMPT_CACHE = {}

def build_system_prompt(lang, farmer=None, weather_text=""):
    f = farmer or {}
    name  = f.get("name","")
    dist  = f.get("district","")
    land  = f.get("land_size","")
    crops = [_normalize_crop(c) for c in f.get("crops",[])]
    sowing= f.get("sowing_date","")
    twin  = f.get("digital_twin",{})

    RULES = {
        "ta": (
            "AgriVoice AI — தமிழ் விவசாய நிபுணர்.\n"
            "• தமிழில் மட்டும். மீண்டும் வணக்கம்/அறிமுகம் வேண்டாம். ஒரே கருத்தை திரும்பாதீர்கள்.\n"
            "• bullet/numbers/label: வேண்டாம் — இயற்கை பேச்சு.\n"
            "• 'தெரியும்'/'செய்தேன்' = statement, கேள்வியாக நினைக்காதே.\n"
            "• அறியாத வார்த்தையை பூச்சி/நோய் என்று கற்பனை செய்யாதே.\n"
            "• நோய்: அறிகுறி→காரணம்→மருந்து→அளவு/ஏக்கர்→நேரம்→தடவை→தடுப்பு.\n"
            "• வானிலை தரவை பயன்படுத்தி நேரடி அறிவுரை.\n"
            "• கடைசியில்: 'வேறு உதவி வேண்டுமா?'\n"
        ),
        "te": (
            "AgriVoice AI — తెలుగు వ్యవసాయ నిపుణుడు.\n"
            "• తెలుగులో మాత్రమే. మళ్ళీ నమస్కారం వద్దు. పునరావృతం వద్దు.\n"
            "• bullets/numbers వద్దు — సహజ మాట్లాట.\n"
            "• వ్యాధి: లక్షణం→కారణం→మందు→మోతాదు→సమయం→నివారణ.\n"
            "• చివర: 'మరింత సహాయం కావాలా?'\n"
        ),
        "hi": (
            "AgriVoice AI — हिंदी कृषि विशेषज्ञ।\n"
            "• हिंदी में ही। दोबारा नमस्ते मत कहो। दोहराव नहीं।\n"
            "• bullets/numbers नहीं — बातचीत की भाषा।\n"
            "• बीमारी: लक्षण→कारण→दवा→मात्रा/एकड़→समय→रोकथाम।\n"
            "• अंत में: 'और मदद चाहिए?'\n"
        ),
        "en": (
            "AgriVoice AI — agricultural expert.\n"
            "• English only. No re-greeting. No repetition. No bullets/labels.\n"
            "• 'I know X'/'I did X' = statement, ask what help they need.\n"
            "• Disease: symptom→cause→pesticide→dose/acre→timing→prevention.\n"
            "• Use weather data for timely specific advice.\n"
            "• End: 'Is there anything else you need help with?'\n"
        ),
    }

    prompt = RULES.get(lang, RULES["en"])

    # Farmer context
    ctx = []
    if name: ctx.append(f"விவசாயி:{name}" if lang=="ta" else f"Farmer:{name}")
    if dist: ctx.append(f"மாவட்டம்:{dist}" if lang=="ta" else f"District:{dist}")
    if land: ctx.append(f"நிலம்:{land}ஏக்கர்" if lang=="ta" else f"Land:{land}ac")
    if crops:
        ctx.append(f"பயிர்:{','.join(crops)}" if lang=="ta" else f"Crops:{','.join(crops)}")
        if sowing:
            stage = get_crop_stage(crops[0], sowing)
            if stage:
                ctx.append(f"நிலை:{stage}" if lang=="ta" else f"Stage:{stage}")
                if lang=="ta": prompt += f"பயிர் இப்போது {stage} நிலையில் — இந்த நிலைக்கேற்ற அறிவுரை மட்டும்.\n"
                else: prompt += f"Crop at {stage} — give stage-specific advice only.\n"
    if ctx: prompt += " | ".join(ctx) + "\n"

    # Digital twin health
    if twin:
        h = twin.get("overall_health", 0)
        label = ("நல்ல நிலை" if h>=75 else "கவனம் தேவை" if h>=50 else "உடனடி நடவடிக்கை") if lang=="ta" else ("good" if h>=75 else "needs attention" if h>=50 else "critical")
        prompt += f"பயிர் ஆரோக்கியம்: {h}% ({label}).\n" if lang=="ta" else f"Crop health: {h}% ({label}).\n"
        alerts = twin.get("alerts",[])
        if alerts: prompt += ("எச்சரிக்கை: " if lang=="ta" else "Alerts: ") + "; ".join(str(a) for a in alerts[:2]) + "\n"
        prompt += ("இந்த ட்வின் தரவை பயன்படுத்தி குறிப்பிட்ட அறிவுரை சொல்.\n" if lang=="ta"
                   else "Use twin data for specific advice.\n")

    # Weather context
    if weather_text:
        prompt += ("வானிலை (இதை பயன்படுத்தி நேரடி அறிவுரை):\n" if lang=="ta"
                   else "Weather (use for timely advice):\n")
        prompt += weather_text + "\n"

    # Crop KB
    kb_lang = "ta" if lang=="ta" else "en"
    for crop in crops[:2]:
        kb = CROP_KB.get(crop,{}).get(kb_lang,"")
        if kb: prompt += kb + "\n"

    return prompt


def get_cached_prompt(phone, lang, farmer, weather_text):
    key = f"{phone}:{lang}"
    wsig = weather_text[:40] if weather_text else ""
    c = _PROMPT_CACHE.get(key)
    if c and (time.time()-c["ts"])<1800 and c.get("wsig")==wsig:
        return c["prompt"]
    p = build_system_prompt(lang, farmer, weather_text)
    _PROMPT_CACHE[key] = {"prompt":p,"ts":time.time(),"wsig":wsig}
    return p

SYSTEM_PROMPTS = {lang: build_system_prompt(lang) for lang in ("ta","te","hi","en")}

# ── Onboarding ────────────────────────────────────────────────────────────────
ONBOARD_Q = {
    "ta":{1:"உங்கள் பெயர் என்ன?",2:"நீங்கள் எந்த கிராமத்தில் வசிக்கிறீர்கள்?",3:"உங்கள் மாவட்டம் எது?",4:"நீங்கள் என்ன பயிர் பயிரிடுகிறீர்கள்?",5:"உங்கள் நிலம் எத்தனை ஏக்கர்?",6:"எந்த மாதம் பயிர் விதைத்தீர்கள்? தெரியவில்லை என்றால் 'தெரியல' சொல்லுங்கள்."},
    "te":{1:"మీ పేరు ఏమిటి?",2:"మీరు ఏ గ్రామంలో నివసిస్తున్నారు?",3:"మీ జిల్లా ఏది?",4:"మీరు ఏ పంటలు పండిస్తున్నారు?",5:"మీ భూమి ఎన్ని ఎకరాలు?",6:"పంట ఎప్పుడు విత్తారు? తెలియకపోతే 'తెలియదు'."},
    "hi":{1:"आपका नाम क्या है?",2:"आप किस गाँव में रहते हैं?",3:"आपका जिला?",4:"आप कौन सी फसल उगाते हैं?",5:"जमीन कितने एकड़?",6:"फसल कब बोई? नहीं पता तो 'पता नहीं'."},
    "en":{1:"What is your name?",2:"Which village?",3:"What is your district?",4:"What crops do you grow?",5:"How many acres?",6:"When did you sow? Say 'skip' if unsure."},
}

END_WORDS   = ["நன்றி","போகிறேன்","முடிந்தது","வைக்கிறேன்","ధన్యవాదాలు","వెళ్తున్నాను","धन्यवाद","bye","goodbye","thank you","done","தேங்க்யூ","பை"]
SMS_WORDS   = ["sms","மெசேஜ்","அனுப்பு","మెసేజ్","పంపు","मैसेज","message","send"]
YIELD_WORDS = {"ta":["விளைச்சல்","விற்க","விற்பனை"],"te":["దిగుబడి","అమ్మాలి"],"hi":["फसल","बेचना"],"en":["yield","sell","sale"]}
PRICE_WORDS = {"ta":["விலை","மண்டி","சந்தை","ரேட்"],"te":["ధర","మండి"],"hi":["भाव","मंडी","कीमत"],"en":["price","mandi","market rate","rate"]}

_HINDI_SWITCH   = ["hindi","ஹிந்தி","ஹிந்தியில்","speak in hindi","hindi mein","हिंदी","switch hindi"]
_TAMIL_SWITCH   = ["tamil","தமிழ்","தமிழில்","speak in tamil","tamil la","switch tamil"]
_TELUGU_SWITCH  = ["telugu","తెలుగు","తెలుగులో","speak in telugu","switch telugu"]
_ENGLISH_SWITCH = ["speak in english","english please","english","இங்கிலீஷ்","ஆங்கிலம்","अंग्रेजी","ఇంగ్లీష్"]

_KNOWN_AGRI = {"நெல்","அரிசி","கோதுமை","பருத்தி","தக்காளி","கரும்பு","மக்காச்சோளம்","நிலக்கடலை","வாழை","பூச்சி","நோய்","புழு","அழுகல்","இலை","தண்டு","வேர்","காய்","பூ","விதை","மருந்து","உரம்","நீர்","பாசனம்","அறுவடை","தெளி","போடு","மழை","வெப்பம்","வானிலை","விலை","சந்தை","எப்படி","என்ன","எதனால்","எப்போது","எவ்வளவு","rice","wheat","cotton","pest","disease","water","fertilizer","harvest","rain","weather","price","how","what"}

# ── Language detection ────────────────────────────────────────────────────────
def detect_lang(text):
    ta=sum(1 for c in text if '\u0B80'<=c<='\u0BFF')
    te=sum(1 for c in text if '\u0C00'<=c<='\u0C7F')
    hi=sum(1 for c in text if '\u0900'<=c<='\u097F')
    if ta>1 and ta>=te and ta>=hi: return "ta"
    if te>1 and te>ta  and te>=hi: return "te"
    if hi>1 and hi>ta  and hi>te:  return "hi"
    return "en"

def detect_lang_switch(text):
    t = text.lower()
    if any(k in t or k in text for k in _HINDI_SWITCH):   return "hi"
    if any(k in t or k in text for k in _TAMIL_SWITCH):   return "ta"
    if any(k in t or k in text for k in _TELUGU_SWITCH):  return "te"
    if any(k in t or k in text for k in _ENGLISH_SWITCH): return "en"
    return None

# ── TwiML helpers ─────────────────────────────────────────────────────────────
def say(target, text, lang="ta"):
    voice, lc = VOICES.get(lang, VOICES["ta"])
    target.say(text, voice=voice, language=lc)

def make_gather(action, lang="ta"):
    return Gather(
        input="speech", action=action, method="POST",
        speech_timeout="2",        # 2s silence → stop recording (saves ~2s/turn)
        timeout=15,                # 15s to start speaking after prompt
        action_on_empty_result=True,
        speech_model="phone_call",
        language=STT_LANG.get(lang,"ta-IN"),
        enhanced=True,
        profanity_filter=False,
    )

# ── STT pipeline ──────────────────────────────────────────────────────────────
def transcribe_whisper(recording_url, lang="ta"):
    try:
        time.sleep(0.6)
        r = requests.get(recording_url+".mp3",
                         auth=(TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN), timeout=12)
        r.raise_for_status()
        if len(r.content) < 1000: return ""
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            f.write(r.content); tmp=f.name
        with open(tmp,"rb") as af:
            result = groq.audio.transcriptions.create(
                file=("audio.mp3",af), model="whisper-large-v3",
                language=WHISPER_LANG.get(lang,"ta"), response_format="text", temperature=0.0)
        os.unlink(tmp)
        text = (result if isinstance(result,str) else result.text).strip()
        return "" if len(text)<2 or text in ("."," ","...") else text
    except Exception as e:
        print(f"Whisper error: {e}"); return ""

_GARBAGE = re.compile(r"^(எனக்கு|நான்|ஆமா|சரி|ஓ|ஆ|ம்|ம்ம்|ok|okay|yes|no|hmm|ah|uh|um)\.?$", re.IGNORECASE)

def _is_garbage(text):
    t = text.strip()
    return len(t)<3 or bool(_GARBAGE.match(t))

def _log_stt(speech, confidence, lang, source, call_sid=""):
    def _save():
        try:
            get_db().collection("stt_training").add({
                "text":speech,"confidence":confidence,"lang":lang,
                "source":source,"call_sid":call_sid,"ts":datetime.now().isoformat(),"reviewed":False
            })
        except Exception: pass
    threading.Thread(target=_save, daemon=True).start()

def get_speech(form, lang="ta"):
    speech     = form.get("SpeechResult","").strip()
    confidence = float(form.get("Confidence",0))
    rec_url    = form.get("RecordingUrl","").strip()
    call_sid   = form.get("CallSid","")

    # Tier 1: High-confidence Twilio STT
    if speech and confidence>=0.50 and not _is_garbage(speech):
        print(f"🎤 [Twilio {confidence:.0%}] {speech}")
        if confidence<0.65: _log_stt(speech,confidence,lang,"twilio_borderline",call_sid)
        return speech

    # Tier 2: Whisper fallback
    if rec_url:
        result = transcribe_whisper(rec_url, lang)
        if result and not _is_garbage(result):
            print(f"🎤 [Whisper] {result}")
            _log_stt(result,confidence,lang,"whisper",call_sid)
            if speech and speech!=result:
                _log_stt(speech,confidence,lang,"twilio_vs_whisper",call_sid)
            return result

    # Tier 3: Low-confidence fallback (≥2 words)
    if speech and not _is_garbage(speech) and len(speech.split())>=2:
        print(f"🎤 [Low-conf {confidence:.0%}] {speech}")
        _log_stt(speech,confidence,lang,"twilio_low",call_sid)
        return speech

    if speech and len(speech)>2:
        _log_stt(speech,confidence,lang,"discarded",call_sid)
    return ""

# ── AI reply ──────────────────────────────────────────────────────────────────
def get_ai_reply(call_sid, user_msg, system, lang="ta"):
    if call_sid not in conversations: conversations[call_sid]=[]
    conversations[call_sid].append({"role":"user","content":user_msg})
    history = conversations[call_sid][-6:]

    anti_loop = " Reply concisely. Say each point once only. Never repeat a sentence. If unsure, say so in one sentence."

    try:
        resp = groq.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role":"system","content":system+anti_loop}]+history,
            max_tokens=900, temperature=0.3,
            top_p=0.85, frequency_penalty=0.8, presence_penalty=0.6,
            stop=["---"],
        )
        reply = resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq error: {e}")
        reply = ""

    if not reply:
        return {"ta":"மன்னிக்கவும், மீண்டும் கேளுங்கள்.","te":"క్షమించండి, మళ్ళీ చెప్పండి.","hi":"माफ़ करें, फिर बोलें।","en":"Sorry, please repeat."}.get(lang,"Sorry.")

    # Post-processing
    reply = re.sub(r"^\s*[-•*]\s+","",reply,flags=re.MULTILINE)
    reply = re.sub(r"^\s*\d+\.\s+","",reply,flags=re.MULTILINE)
    reply = re.sub(r"\n+"," ",reply).strip()

    # Trim mid-sentence truncation
    if not re.search(r'[.!?।]\s*$', reply):
        last_b = max(reply.rfind('. '),reply.rfind('? '),reply.rfind('! '),reply.rfind('। '))
        if last_b > len(reply)//2: reply=reply[:last_b+1].strip()

    # English language guard
    if lang=="en":
        ta_chars=sum(1 for c in reply if '\u0B80'<=c<='\u0BFF')
        if ta_chars/max(len(reply),1)>0.15:
            try:
                resp2=groq.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[{"role":"system","content":system+anti_loop+"\n\nENGLISH ONLY. Do not write Tamil."},{"role":"user","content":user_msg}],
                    max_tokens=900,temperature=0.3,frequency_penalty=0.8,presence_penalty=0.6)
                reply=re.sub(r"\n+"," ",resp2.choices[0].message.content.strip()).strip()
            except Exception: pass

    conversations[call_sid].append({"role":"assistant","content":reply})
    return reply

# ── Summarise ─────────────────────────────────────────────────────────────────
def summarize_conversation(call_sid, lang="ta"):
    if not conversations.get(call_sid): return ""
    hist = "\n".join(f"{'F' if m['role']=='user' else 'A'}: {m['content'][:120]}" for m in conversations[call_sid][-8:])
    prompts={"ta":f"2 வரிகளில் சுருக்கம்:\n{hist}","te":f"2 వాక్యాలలో:\n{hist}","hi":f"2 वाक्यों में:\n{hist}","en":f"Summarize in 2 sentences:\n{hist}"}
    try:
        r=groq.chat.completions.create(model="llama-3.3-70b-versatile",messages=[{"role":"user","content":prompts.get(lang,prompts["en"])}],max_tokens=80,temperature=0.3)
        return r.choices[0].message.content.strip()
    except Exception as e:
        print(f"Summary error: {e}"); return ""

# ── SMS ───────────────────────────────────────────────────────────────────────
def send_sms(phone, body):
    if not phone or not body: return False
    if not phone.startswith("+"): phone="+"+phone
    try:
        msg=twilio.messages.create(from_=TWILIO_FROM_NUMBER,body=body[:320],to=phone)
        print(f"📱 SMS → {phone} | {msg.sid}"); return True
    except Exception as e:
        print(f"❌ SMS: {e}"); return False

def send_summary_sms(call_sid, phone, lang):
    s=summarize_conversation(call_sid,lang)
    if not s: return
    pfx={"ta":"AgriVoice AI சுருக்கம்:\n","te":"AgriVoice AI సారాంశం:\n","hi":"AgriVoice AI सारांश:\n","en":"AgriVoice AI summary:\n"}
    send_sms(phone, pfx.get(lang,pfx["en"])+s+"\nHelp: 1800-180-1551")
    save_conversation_summary(phone,s)

# ── Digital Twin update ───────────────────────────────────────────────────────
def update_twin(phone, farmer, district):
    def _run():
        try:
            time.sleep(5)
            data=_get_cached_weather(district)
            if data:
                twin=run_digital_twin(farmer,data,farmer.get("sowing_date"))
                get_db().collection("farmers").document(phone_to_id(phone)).update({
                    "digital_twin":twin,"twin_updated":datetime.now().isoformat()})
                print(f"🌱 Twin updated: {phone} health={twin.get('overall_health')}%")
        except Exception as e: print(f"Twin error: {e}")
    threading.Thread(target=_run,daemon=True).start()

# ── Market prices ─────────────────────────────────────────────────────────────
_PRICE_CACHE = {}
_COMMODITY_MAP = {"rice":"Rice","wheat":"Wheat","cotton":"Cotton","tomato":"Tomato","sugarcane":"Sugarcane","maize":"Maize","groundnut":"Groundnut","banana":"Banana","நெல்":"Rice","கோதுமை":"Wheat","பருத்தி":"Cotton","தக்காளி":"Tomato","கரும்பு":"Sugarcane","மக்காச்சோளம்":"Maize","நிலக்கடலை":"Groundnut","வாழை":"Banana"}

def fetch_market_price(crop, district):
    commodity=_COMMODITY_MAP.get(crop.lower(),crop.title())
    key=f"{commodity}:{district}"
    c=_PRICE_CACHE.get(key)
    if c and (time.time()-c[1])<3600: return c[0]
    try:
        r=requests.get("https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
            params={"api-key":"579b464db66ec23bdd000001cdd3946e44ce4aab0920f4b63ba75d1c","format":"json","limit":5,"filters[commodity]":commodity,"filters[state]":"Tamil Nadu"},timeout=8)
        r.raise_for_status()
        records=r.json().get("records",[])
        if not records: return ""
        best=next((x for x in records if district.lower() in x.get("district","").lower()),records[0])
        result=f"{commodity} @ {best.get('market','')}: ₹{best.get('min_price','?')}-₹{best.get('max_price','?')}, modal ₹{best.get('modal_price','?')}/quintal"
        _PRICE_CACHE[key]=(result,time.time())
        return result
    except Exception as e:
        print(f"Price error: {e}"); return ""

# ── Proactive alert calls ─────────────────────────────────────────────────────
_alert_messages = {}

def place_alert_call(phone, msg, lang="ta"):
    if not phone.startswith("+"): phone="+"+phone
    _alert_messages[phone]={"msg":msg,"lang":lang}
    try:
        call=twilio.calls.create(to=phone,from_=TWILIO_FROM_NUMBER,
            url=f"{NGROK_URL}/alert-start",method="POST",timeout=30,
            status_callback=f"{NGROK_URL}/call-status",status_callback_method="POST",
            status_callback_event=["completed","no-answer","busy","failed"])
        print(f"📲 Alert call → {phone} | {call.sid}"); return call.sid
    except Exception as e:
        print(f"❌ Alert call: {e}"); return None

def _run_alert_scheduler():
    def _check():
        print("🔔 Alert scheduler: checking farmers...")
        try:
            db=get_db()
            called=0
            for doc in db.collection("farmers").stream():
                try:
                    data=doc.to_dict()
                    phone=data.get("phone","")
                    if not phone: phone="+"+doc.id.replace("_","+") if "_" in doc.id else doc.id
                    district=data.get("district",""); crops=data.get("crops",[]); lang=data.get("language","ta")
                    if not district or not crops: continue
                    wd=_get_cached_weather(district,days=3)
                    if not wd: continue
                    alerts=detect_alerts(wd,crops)
                    urgent=[a for a in alerts if a.get("days_from_now",99)<=1]
                    if not urgent: continue
                    last=db.collection("alert_calls").document(phone_to_id(phone)).get()
                    if last.exists and time.time()-last.to_dict().get("ts",0)<43200: continue
                    atype=urgent[0].get("type","rain")
                    msgs={
                        "ta":{"rain":f"அவசர தகவல்! {district}ல் நாளை கனமழை வரும். {', '.join(crops)} பயிருக்கு தேவையான முன்னேற்பாடு செய்யுங்கள்.","pest_risk":f"எச்சரிக்கை! {', '.join(crops)} பயிரில் பூச்சி தாக்கும் வாய்ப்பு. இன்றே வயலை சோதிக்கவும்.","heat":f"வெப்ப எச்சரிக்கை! காலை 6 மணிக்கு நீர் பாய்ச்சவும்."},
                        "en":{"rain":f"Alert: Heavy rain expected in {district} tomorrow. Take precautions for {', '.join(crops)}.","pest_risk":f"Warning: High pest risk for {', '.join(crops)}. Check your field today.","heat":"Heat alert: Irrigate early morning."},
                    }
                    lang_msgs=msgs.get(lang,msgs["en"])
                    msg=lang_msgs.get(atype,lang_msgs.get("rain","உங்கள் பயிருக்கு முக்கியமான அறிவிப்பு."))
                    place_alert_call(phone,msg,lang)
                    db.collection("alert_calls").document(phone_to_id(phone)).set({"ts":time.time(),"type":atype})
                    called+=1; time.sleep(3)
                except Exception as e: print(f"Scheduler farmer error: {e}")
            print(f"🔔 Done — {called} calls placed")
        except Exception as e: print(f"Scheduler error: {e}")

    def _loop():
        time.sleep(30)
        while True:
            _check()
            time.sleep(21600)
    threading.Thread(target=_loop,daemon=True).start()
    print("🔔 Alert scheduler started (every 6h)")

# ── Weather cache pre-warm at startup ─────────────────────────────────────────
def _warm_weather_cache():
    try:
        time.sleep(8)
        db=get_db()
        districts=set()
        for doc in db.collection("farmers").stream():
            d=doc.to_dict().get("district","")
            if d: districts.add(d)
        for district in districts:
            _get_cached_weather(district)
            print(f"🌤 Pre-warmed: {district}")
            time.sleep(2)
    except Exception as e: print(f"Warm error: {e}")

# ═══════════════════════════════════════════════════════════════════════════════
# Flask Routes
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/start", methods=["POST","GET"])
def start():
    call_sid  = request.form.get("CallSid","default")
    direction = request.form.get("Direction","inbound")
    phone = (request.form.get("To",YOUR_PHONE_NUMBER)
             if direction=="outbound-api" or request.form.get("From","")==TWILIO_FROM_NUMBER
             else request.form.get("From",YOUR_PHONE_NUMBER))
    call_phones[call_sid]=phone

    resp  =VoiceResponse()
    farmer=get_farmer(phone)

    if farmer:
        lang=farmer.get("language","ta"); call_lang[call_sid]=lang
        name=farmer.get("name","விவசாயி"); district=farmer.get("district",""); crops=farmer.get("crops",[])

        # Load latest twin from Firestore
        try:
            doc=get_db().collection("farmers").document(phone_to_id(phone)).get()
            if doc.exists:
                stored=doc.to_dict()
                if "digital_twin" in stored: farmer["digital_twin"]=stored["digital_twin"]
        except Exception: pass

        weather_text=get_weather_advisory(district,crops,lang)

        # Background tasks — staggered to avoid 429
        if district:
            save_weather_alert(phone,"daily_check",district)
            def _bg_tasks():
                try:
                    time.sleep(3)
                    wd=_get_cached_weather(district,days=3)
                    if wd:
                        alerts=detect_alerts(wd,crops)
                        urgent=[a for a in alerts if a.get("days_from_now",99)<=1]
                        if urgent:
                            send_sms(phone,format_weather_sms(wd,crops,district,urgent[0]["type"]))
                            save_weather_alert(phone,urgent[0]["type"],district)
                except Exception as e: print(f"BG task error: {e}")
            threading.Thread(target=_bg_tasks,daemon=True).start()
            update_twin(phone,farmer,district)

        greetings={
            "ta":f"வணக்கம் {name} அவர்களே! நான் AgriVoice AI. நீங்கள் {district} மாவட்டத்தில் {', '.join(crops)} பயிரிடுகிறீர்கள். {weather_text} என்ன உதவி வேண்டும்?",
            "te":f"నమస్కారం {name} గారూ! AgriVoice AI. {district}లో {', '.join(crops)} పండిస్తున్నారు. {weather_text} ఏమి సహాయం కావాలి?",
            "hi":f"नमस्ते {name} जी! AgriVoice AI. आप {district} में {', '.join(crops)} उगाते हैं। {weather_text} क्या मदद चाहिए?",
            "en":f"Hello {name}! AgriVoice AI. You grow {', '.join(crops)} in {district}. {weather_text} How can I help?",
        }
        system=get_cached_prompt(phone,lang,farmer,weather_text)
        conversations[call_sid]=[]
        onboarding[call_sid]={"step":0,"data":farmer,"system":system,"silence_count":0}
        gather=make_gather("/respond",lang)
        say(gather,greetings.get(lang,greetings["ta"]),lang)
        resp.append(gather)
    else:
        lang="ta"; call_lang[call_sid]=lang
        onboarding[call_sid]={"step":1,"data":{},"system":SYSTEM_PROMPTS["ta"],"silence_count":0}
        gather=make_gather("/onboard",lang)
        say(gather,"வணக்கம்! நான் AgriVoice AI, உங்கள் விவசாய உதவியாளர். இது உங்கள் முதல் அழைப்பு. உங்கள் பெயர் என்ன?",lang)
        resp.append(gather)
    return str(resp)


@app.route("/onboard", methods=["POST"])
def onboard():
    call_sid=request.form.get("CallSid","default")
    phone=call_phones.get(call_sid,YOUR_PHONE_NUMBER)
    lang=call_lang.get(call_sid,"ta")
    resp=VoiceResponse()
    state=onboarding.get(call_sid,{"step":1,"data":{}})
    step=state["step"]; data=state["data"]

    answer=get_speech(request.form,lang)
    if not answer:
        gather=make_gather("/onboard",lang)
        say(gather,"மன்னிக்கவும், தெளிவாக சொல்லுங்கள்.",lang)
        resp.append(gather); return str(resp)

    # Language detection at step 1
    if step==1:
        sw=detect_lang_switch(answer) or detect_lang(answer)
        if sw!=lang:
            lang=sw; call_lang[call_sid]=lang
            onboarding[call_sid]["system"]=SYSTEM_PROMPTS.get(lang,SYSTEM_PROMPTS["ta"])
            if lang!="ta":
                gather=make_gather("/onboard",lang)
                say(gather,{"te":"నమస్కారం! మీ పేరు?","hi":"नमस्ते! आपका नाम?","en":"Hello! What is your name?"}.get(lang,"Hello!"),lang)
                resp.append(gather); return str(resp)

    answer=answer.strip()
    if   step==1: data["name"]=clean_name(answer)
    elif step==2: data["village"]=answer
    elif step==3: data["district"]=answer
    elif step==4:
        crops=[c.strip() for c in answer.replace(","," ").replace("மற்றும்"," ").split() if len(c.strip())>1]
        data["crops"]=crops or [answer]
    elif step==5: data["land_size"]=extract_land_size(answer)
    elif step==6: data["sowing_date"]=parse_sowing_date(answer)

    state["data"]=data; state["step"]=step+1; onboarding[call_sid]=state

    if step>=6:
        data["language"]=lang
        threading.Thread(target=save_farmer,args=(phone,data),daemon=True).start()
        onboarding[call_sid]["data"]=data; onboarding[call_sid]["step"]=99
        resp.say({"ta":"நன்றி! விவரங்கள் சேமிக்கிறேன்...","te":"ధన్యవాదాలు! వివరాలు సేవ్ చేస్తున్నాను...","hi":"धन्यवाद! जानकारी सहेज रहा हूँ...","en":"Thank you! Saving your details..."}.get(lang,"நன்றி..."),voice="alice",language=_ALICE_LANG.get(lang,"ta-IN"))
        resp.redirect("/onboard-complete",method="POST")
    else:
        nq=ONBOARD_Q.get(lang,ONBOARD_Q["ta"]).get(step+1,"")
        gather=make_gather("/onboard",lang)
        say(gather,nq,lang); resp.append(gather)
    return str(resp)


@app.route("/onboard-complete", methods=["POST"])
def onboard_complete():
    call_sid=request.form.get("CallSid","default")
    phone=call_phones.get(call_sid,YOUR_PHONE_NUMBER)
    lang=call_lang.get(call_sid,"ta")
    resp=VoiceResponse()
    done_msg=""

    try:
        state=onboarding.get(call_sid,{}); data=state.get("data",{})
        district=data.get("district",""); crops=data.get("crops",[]); name=data.get("name","")
        weather_text=get_weather_advisory(district,crops,lang)
        if district:
            save_weather_alert(phone,"first_call",district)
            update_twin(phone,data,district)
        system=build_system_prompt(lang,data,weather_text)
        onboarding[call_sid]["system"]=system
        conversations[call_sid]=[]
        done_msg={"ta":f"நன்றி {name} அவர்களே! விவரங்கள் சேமிக்கப்பட்டன. {weather_text} என்ன உதவி வேண்டும்?","te":f"ధన్యవాదాలు {name} గారూ! {weather_text} ఏమి సహాయం కావాలి?","hi":f"धन्यवाद {name} जी! {weather_text} क्या मदद चाहिए?","en":f"Thank you {name}! {weather_text} How can I help you?"}.get(lang,f"நன்றி {name}! என்ன உதவி வேண்டும்?")
    except Exception as e:
        print(f"❌ onboard-complete: {e}")
        try: name=onboarding.get(call_sid,{}).get("data",{}).get("name","")
        except Exception: name=""
        onboarding.setdefault(call_sid,{})["system"]=SYSTEM_PROMPTS.get(lang,SYSTEM_PROMPTS["ta"])
        conversations[call_sid]=[]
        done_msg={"ta":f"நன்றி {name}! என்ன உதவி வேண்டும்?","te":f"ధన్యవాదాలు {name}! ఏమి కావాలి?","hi":f"धन्यवाद {name}! क्या चाहिए?","en":f"Thank you {name}! How can I help?"}.get(lang,"நன்றி! என்ன உதவி?")

    gather=make_gather("/respond",lang)
    say(gather,done_msg,lang); resp.append(gather)
    return str(resp)


@app.route("/respond", methods=["POST"])
def respond():
    call_sid=request.form.get("CallSid","default")
    phone=call_phones.get(call_sid,YOUR_PHONE_NUMBER)
    lang=call_lang.get(call_sid,"ta")
    resp=VoiceResponse()

    try:
        state=onboarding.get(call_sid,{"system":SYSTEM_PROMPTS.get(lang,SYSTEM_PROMPTS["ta"]),"silence_count":0})
        system=state.get("system",SYSTEM_PROMPTS.get(lang,SYSTEM_PROMPTS["ta"]))
    except Exception:
        state={"system":SYSTEM_PROMPTS.get(lang,SYSTEM_PROMPTS["ta"]),"silence_count":0}
        system=state["system"]

    farmer_said=get_speech(request.form,lang)

    # ── Silence handler ───────────────────────────────────────────────────────
    if not farmer_said:
        sc=state.get("silence_count",0)+1
        state["silence_count"]=sc
        if call_sid in onboarding: onboarding[call_sid]["silence_count"]=sc
        gather=make_gather("/respond",lang)
        if sc>=2:
            state["silence_count"]=0
            if call_sid in onboarding: onboarding[call_sid]["silence_count"]=0
            say(gather,{"ta":"பயிர் நோய், உரம், நீர்ப்பாசனம் அல்லது மழை பற்றி கேட்கலாம். என்ன தெரிஞ்சுக்கணும்?","te":"పురుగులు, ఎరువు, నీరు గురించి అడగవచ్చు. ఏమి కావాలి?","hi":"कीट, खाद, सिंचाई के बारे में पूछें। क्या चाहिए?","en":"You can ask about pests, fertilizer, irrigation or weather. What do you need?"}.get(lang,"என்ன உதவி வேண்டும்?"),lang)
        else:
            say(gather,{"ta":"கொஞ்சம் தெளிவாக சொல்லுங்கள்.","te":"స్పష్టంగా చెప్పండి.","hi":"साफ़ बोलें।","en":"Could you speak a little louder?"}.get(lang,"கொஞ்சம் தெளிவாக சொல்லுங்கள்."),lang)
        resp.append(gather); return str(resp)

    # Reset silence counter on successful speech
    state["silence_count"]=0
    if call_sid in onboarding: onboarding[call_sid]["silence_count"]=0

    # ── Language switch ───────────────────────────────────────────────────────
    sw=detect_lang_switch(farmer_said)
    if sw is None: sw=detect_lang(farmer_said)
    if sw!=lang:
        print(f"🌐 {lang}→{sw}")
        lang=sw; call_lang[call_sid]=lang
        farmer=state.get("data",{})
        new_sys=build_system_prompt(lang,farmer)
        state["system"]=new_sys; onboarding[call_sid]=state; conversations[call_sid]=[]
        ack={"ta":"சரி, தமிழில் பேசுகிறேன். என்ன உதவி வேண்டும்?","te":"సరే, తెలుగులో. ఏమి కావాలి?","hi":"ठीक है, हिंदी में। क्या चाहिए?","en":"Sure, switching to English. How can I help?"}.get(lang,"சரி!")
        gather_ack=make_gather("/respond",lang)
        say(gather_ack,ack,lang); resp.append(gather_ack); return str(resp)

    farmer_lower=farmer_said.lower()
    all_end=END_WORDS

    # ── Goodbye ───────────────────────────────────────────────────────────────
    if any(w in farmer_lower or w in farmer_said for w in all_end):
        send_summary_sms(call_sid,phone,lang)
        update_farmer_field(phone,"last_call",datetime.now().isoformat())
        say(resp,{"ta":"நன்றி! பயிர்கள் நன்றாக வளரட்டும். வணக்கம்!","te":"ధన్యవాదాలు! నమస్కారం!","hi":"धन्यवाद! नमस्ते!","en":"Thank you! Wishing you a great harvest. Goodbye!"}.get(lang,"நன்றி!"),lang)
        resp.hangup()
        for d in (conversations,onboarding,call_phones,call_lang,_pending_reply):
            d.pop(call_sid,None)
        return str(resp)

    # ── SMS request ───────────────────────────────────────────────────────────
    if any(w in farmer_lower for w in SMS_WORDS):
        send_summary_sms(call_sid,phone,lang)
        gather=make_gather("/respond",lang)
        say(gather,{"ta":"SMS அனுப்பப்பட்டது!","te":"SMS పంపబడింది!","hi":"SMS भेज दिया!","en":"SMS sent!"}.get(lang,"SMS sent!"),lang)
        resp.append(gather); return str(resp)

    # ── Market price ──────────────────────────────────────────────────────────
    if any(w in farmer_lower for w in PRICE_WORDS.get(lang,PRICE_WORDS["en"])):
        farmer_data=state.get("data",{}); f_crops=farmer_data.get("crops",[]); f_dist=farmer_data.get("district","")
        price_lines=[p for p in (fetch_market_price(fc,f_dist) for fc in f_crops[:2]) if p]
        if price_lines:
            pmsg={"ta":f"இன்றைய சந்தை விலை: {' | '.join(price_lines)}. விற்பனை உதவி வேண்டுமா?","te":f"నేటి ధర: {' | '.join(price_lines)}. సహాయం కావాలా?","hi":f"आज का भाव: {' | '.join(price_lines)}. बिक्री में मदद?","en":f"Today's price: {' | '.join(price_lines)}. Need selling advice?"}.get(lang,"")
            if pmsg:
                gather=make_gather("/respond",lang)
                say(gather,pmsg,lang); resp.append(gather); return str(resp)

    # ── Yield/distributor transfer ─────────────────────────────────────────────
    if sum(1 for k in YIELD_WORDS.get(lang,YIELD_WORDS["en"]) if k in farmer_lower)>=2:
        send_summary_sms(call_sid,phone,lang)
        say(resp,{"ta":"உங்களை வினியோகஸ்தரிடம் இணைக்கிறேன். ஒரு நிமிடம்.","te":"పంపిణీదారుతో కలుపుతాను.","hi":"वितरक से जोड़ रहा हूँ।","en":"Transferring to a distributor. Please hold."}.get(lang,""),lang)
        dial=resp.dial(action="/transfer-complete",method="POST",timeout=30)
        dial.number("+919000000001"); return str(resp)

    # ── Unknown word guard ────────────────────────────────────────────────────
    words_in_msg=set(re.sub(r'[?.!,]','',farmer_said).split())
    known=sum(1 for w in words_in_msg if any(k in w or w in k for k in _KNOWN_AGRI))
    if len(words_in_msg)<=5 and known/max(len(words_in_msg),1)<0.3:
        gather=make_gather("/respond",lang)
        say(gather,{"ta":"மன்னிக்கவும், புரியவில்லை. என்ன அறிகுறி தெரிகிறது என்று சொல்லுங்கள் — இலை மஞ்சளாகுதா, தண்டு அழுகுதா?","te":"అర్థం కాలేదు. లక్షణాలు వివరించండి.","hi":"समझ नहीं आया। लक्षण बताएं।","en":"Sorry, didn't understand. Can you describe the symptoms?"}.get(lang,""),lang)
        resp.append(gather); return str(resp)

    # ── AI reply — fast path ──────────────────────────────────────────────────
    future=_executor.submit(get_ai_reply,call_sid,farmer_said,system,lang)

    # Two fillers cover ~1.5s while Groq runs (~1s for 8B)
    pool=FILLERS.get(lang,FILLERS["ta"])
    f1=random.choice(pool)
    f2=random.choice([f for f in pool if f!=f1] or pool)
    resp.say(f1,voice="alice",language=_ALICE_LANG.get(lang,"ta-IN"))
    resp.say(f2,voice="alice",language=_ALICE_LANG.get(lang,"ta-IN"))

    try:
        reply=future.result(timeout=8)
    except Exception:
        reply=None

    CUE={"ta":"சொல்லுங்கள், வேறு என்ன வேண்டும்?","te":"చెప్పండి, మరేమి కావాలి?","hi":"बोलिए, और क्या चाहिए?","en":"Go ahead, what else can I help with?"}

    if reply:
        print(f"🤖 [{lang}] (fast): {reply[:80]}")
        _pending_reply.pop(call_sid,None)
        gather=make_gather("/respond",lang)
        say(gather,reply,lang)
        say(gather,CUE.get(lang,CUE["ta"]),lang)
        resp.append(gather)
    else:
        _pending_reply[call_sid]=future
        resp.redirect("/ai-reply",method="POST")
    return str(resp)


@app.route("/ai-reply", methods=["POST"])
def ai_reply():
    call_sid=request.form.get("CallSid","default")
    lang=call_lang.get(call_sid,"ta")
    resp=VoiceResponse()
    future=_pending_reply.pop(call_sid,None)
    try: reply=future.result(timeout=20) if future else ""
    except Exception as e: print(f"Groq timeout: {e}"); reply=""
    if not reply:
        reply={"ta":"மன்னிக்கவும், மீண்டும் கேளுங்கள்.","te":"క్షమించండి, మళ్ళీ చెప్పండి.","hi":"माफ़ करें, फिर बोलें।","en":"Sorry, could you repeat?"}.get(lang,"Sorry.")
    print(f"🤖 [{lang}]: {reply[:80]}")
    CUE={"ta":"சொல்லுங்கள், வேறு என்ன வேண்டும்?","te":"చెప్పండి, మరేమి కావాలి?","hi":"बोलिए, और क्या चाहिए?","en":"Go ahead, what else?"}
    gather=make_gather("/respond",lang)
    say(gather,reply,lang)
    say(gather,CUE.get(lang,CUE["ta"]),lang)
    resp.append(gather)
    return str(resp)


@app.route("/alert-start", methods=["POST"])
def alert_start():
    call_sid=request.form.get("CallSid","default")
    phone=(request.form.get("To") or request.form.get("Called") or YOUR_PHONE_NUMBER).strip()
    if not phone.startswith("+"): phone="+"+phone
    alert_data=_alert_messages.pop(phone,{})
    msg=alert_data.get("msg","உங்கள் பயிருக்கு முக்கியமான அறிவிப்பு.")
    lang=alert_data.get("lang","ta")
    call_phones[call_sid]=phone; call_lang[call_sid]=lang
    farmer=get_farmer(phone)
    system=build_system_prompt(lang,farmer) if farmer else SYSTEM_PROMPTS.get(lang,SYSTEM_PROMPTS["ta"])
    conversations[call_sid]=[]; onboarding[call_sid]={"step":0,"data":farmer or {},"system":system,"silence_count":0}
    resp=VoiceResponse()
    gather=make_gather("/respond",lang)
    say(gather,msg,lang)
    say(gather,{"ta":"இது பற்றி கேள்வி இருந்தால் சொல்லுங்கள்.","te":"ప్రశ్న ఉంటే చెప్పండి.","hi":"सवाल हो तो पूछें।","en":"If you have any questions, go ahead."}.get(lang,""),lang)
    resp.append(gather); return str(resp)


@app.route("/trigger-alerts", methods=["POST"])
def trigger_alerts():
    data=request.json or {}
    phone=data.get("phone",""); lang=data.get("lang","ta")
    farmer=get_farmer(phone)
    if not farmer: return jsonify({"error":"farmer not found"}),404
    district=farmer.get("district",""); crops=farmer.get("crops",[])
    try:
        wd=_get_cached_weather(district,days=3)
        if not wd: return jsonify({"error":"weather unavailable"}),503
        alerts=detect_alerts(wd,crops)
        if not alerts: return jsonify({"status":"no alerts"}),200
        atype=alerts[0].get("type","rain")
        msgs={"ta":{"rain":f"அவசர தகவல்! {district}ல் நாளை கனமழை வரும். தயாராக இருங்கள்.","pest_risk":f"எச்சரிக்கை! {', '.join(crops)} பயிரில் பூச்சி அபாயம். இன்றே சோதிக்கவும்.","heat":"வெப்ப எச்சரிக்கை! காலை நீர் பாய்ச்சவும்."},"en":{"rain":f"Alert: Heavy rain expected in {district} tomorrow.","pest_risk":f"Warning: Pest risk for {', '.join(crops)}.","heat":"Heat alert: Irrigate early morning."}}
        msg=msgs.get(lang,msgs["en"]).get(atype,msgs["en"]["rain"])
        sid=place_alert_call(phone,msg,lang)
        return jsonify({"status":"call_placed","sid":sid,"alert":atype})
    except Exception as e: return jsonify({"error":str(e)}),500


@app.route("/call-status", methods=["POST"])
def call_status():
    call_sid=request.form.get("CallSid","")
    status=request.form.get("CallStatus","")
    print(f"📞 {call_sid} — {status}")
    if status in ("completed","no-answer","busy","failed"):
        phone=call_phones.get(call_sid,""); lang=call_lang.get(call_sid,"ta")
        if phone and conversations.get(call_sid):
            threading.Thread(target=send_summary_sms,args=(call_sid,phone,lang),daemon=True).start()
        for d in (conversations,onboarding,call_phones,call_lang,_pending_reply):
            d.pop(call_sid,None)
    return ("",204)


@app.route("/transfer-complete", methods=["POST"])
def transfer_complete():
    call_sid=request.form.get("CallSid","default")
    lang=call_lang.get(call_sid,"ta")
    status=request.form.get("DialCallStatus","")
    resp=VoiceResponse()
    if status in ("busy","no-answer","failed"):
        say(resp,{"ta":"வினியோகஸ்தர் கிடைக்கவில்லை. பின்னர் அழைக்கவும்.","te":"పంపిణీదారు అందుబాటులో లేరు.","hi":"वितरक उपलब्ध नहीं।","en":"Distributor unavailable. Please call back."}.get(lang,""),lang)
    resp.hangup(); return str(resp)


@app.route("/stt-stats")
def stt_stats():
    try:
        db=get_db(); stats={"total":0,"by_lang":{},"corrections":0,"discarded":0}
        for doc in db.collection("stt_training").stream():
            d=doc.to_dict(); stats["total"]+=1
            l=d.get("lang","?"); stats["by_lang"][l]=stats["by_lang"].get(l,0)+1
            src=d.get("source","")
            if "whisper" in src: stats["corrections"]+=1
            if "discard" in src: stats["discarded"]+=1
        return jsonify(stats)
    except Exception as e: return jsonify({"error":str(e)}),500


@app.route("/health")
def health():
    return jsonify({"status":"ok","service":"AgriVoice AI","version":"final"})


# ── Startup ───────────────────────────────────────────────────────────────────
def place_call():
    time.sleep(3)
    print(f"\n📲 Calling {YOUR_PHONE_NUMBER}...")
    try:
        call=twilio.calls.create(
            to=YOUR_PHONE_NUMBER,from_=TWILIO_FROM_NUMBER,
            url=f"{NGROK_URL}/start",method="POST",timeout=30,
            status_callback=f"{NGROK_URL}/call-status",
            status_callback_method="POST",
            status_callback_event=["completed","no-answer","busy","failed"])
        print(f"✅ SID: {call.sid}\n📱 Pick up and speak!\n")
    except Exception as e: print(f"❌ {e}")

if __name__=="__main__":
    print("\n"+"═"*52)
    print("  🌾  AgriVoice AI — Final Production Build")
    print("═"*52)
    print(f"  Phone   : {YOUR_PHONE_NUMBER}")
    print(f"  Webhook : {NGROK_URL}/start")
    print(f"  LLM     : llama-3.1-8b-instant (fast path)")
    print(f"  STT     : Twilio→Whisper→fallback (3-tier)")
    print(f"  Lang    : Tamil / Telugu / Hindi / English")
    print(f"  Features: Twin | Alerts | Market | STT log")
    print("═"*52+"\n")
    start_scheduler()
    _run_alert_scheduler()
    threading.Thread(target=_warm_weather_cache,daemon=True).start()
    threading.Thread(target=place_call,daemon=True).start()
    app.run(host="0.0.0.0",port=5000,debug=False)
