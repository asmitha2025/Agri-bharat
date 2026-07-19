"""
languages.py — AgriVoice AI v4
Multilingual: Tamil, Telugu, Hindi, English
Includes rich filler words and interrupt-aware phrases
"""

# Twilio STT language codes
TWILIO_LANG = {
    "ta": "ta-IN",
    "te": "te-IN",
    "hi": "hi-IN",
    "en": "en-IN",
}

# Google TTS voices (best quality for each language)
# ── TTS Voice Configuration ────────────────────────────────────────────────
# IMPORTANT: Voice selection depends on your Twilio account type
#
# FREE TRIAL (current):
#   - Use "alice" voice with language tag — Twilio's built-in multilingual TTS
#   - alice supports: ta-IN, hi-IN, te-IN, en-IN natively
#   - Quality is basic but WORKS on free trial
#
# PAID/UPGRADED TWILIO:
#   - Switch to Google.ta-IN-Standard-A for natural Tamil speech
#   - Uncomment GOOGLE_VOICE_PAID below and rename to GOOGLE_VOICE

GOOGLE_VOICE = {
    "ta": ("alice", "ta-IN"),   # alice speaks Tamil on free trial
    "te": ("alice", "te-IN"),   # alice speaks Telugu on free trial
    "hi": ("alice", "hi-IN"),   # alice speaks Hindi on free trial
    "en": ("alice", "en-IN"),   # alice speaks English on free trial
}

# Upgrade to these after paying for Twilio:
# GOOGLE_VOICE_PAID = {
#     "ta": ("Google.ta-IN-Standard-A", "ta-IN"),
#     "te": ("Google.te-IN-Standard-A", "te-IN"),
#     "hi": ("Google.hi-IN-Standard-A", "hi-IN"),
#     "en": ("Google.en-IN-Standard-A", "en-IN"),
# }

# Groq Whisper language codes
WHISPER_LANG = {
    "ta": "ta",
    "te": "te",
    "hi": "hi",
    "en": "en",
}

# Rich filler sounds — varied so it sounds natural
FILLERS = {
    "ta": [
        "ம்ம்...",
        "ஆமா...",
        "சரி சரி...",
        "அப்படியா...",
        "ஒரு நிமிடம்...",
        "தெரியும்...",
    ],
    "te": [
        "అమ్మా...",
        "సరే...",
        "అలాగా...",
        "ఒక్క నిమిషం...",
        "అర్థమైంది...",
    ],
    "hi": [
        "हम्म...",
        "अच्छा...",
        "हाँ हाँ...",
        "एक पल...",
        "ठीक है...",
        "समझ गया...",
    ],
    "en": [
        "Hmm...",
        "I see...",
        "Right...",
        "One moment...",
        "Okay...",
        "Got it...",
    ],
}

# Language switch acknowledgement — when AI detects language change
LANG_SWITCH_ACK = {
    "ta": "சரி, தமிழில் பேசுகிறேன்.",
    "te": "సరే, తెలుగులో మాట్లాడతాను.",
    "hi": "ठीक है, हिंदी में बात करते हैं।",
    "en": "Sure, let me switch to English.",
}

# Interrupt acknowledgement — when farmer cuts in mid-reply
INTERRUPT_ACK = {
    "ta": "சரி, சொல்லுங்கள்...",
    "te": "సరే, చెప్పండి...",
    "hi": "हाँ, बोलिए...",
    "en": "Yes, go ahead...",
}

GREETINGS = {
    "ta": (
        "வணக்கம்! நான் AgriVoice AI, உங்கள் விவசாய நண்பன். "
        "உங்கள் பெயர் என்ன?"
    ),
    "te": (
        "నమస్కారం! నేను AgriVoice AI, మీ వ్యవసాయ మిత్రుడు. "
        "మీ పేరు ఏమిటి?"
    ),
    "hi": (
        "नमस्ते! मैं AgriVoice AI हूँ, आपका किसान दोस्त। "
        "आपका नाम क्या है?"
    ),
    "en": (
        "Hello! I am AgriVoice AI, your farming friend. "
        "What is your name?"
    ),
}

RETURNING_GREETINGS = {
    "ta": "வணக்கம் {name}! {district}ல் {crops} பயிரிடுகிறீர்கள். {weather} என்ன உதவி வேண்டும்?",
    "te": "నమస్కారం {name}! {district}లో {crops} పండిస్తున్నారు. {weather} ఏమి సహాయం కావాలి?",
    "hi": "नमस्ते {name}! आप {district} में {crops} उगाते हैं। {weather} क्या मदद चाहिए?",
    "en": "Hello {name}! You grow {crops} in {district}. {weather} How can I help?",
}

GOODBYES = {
    "ta": "நன்றி! உங்கள் பயிர்கள் நன்றாக வளரட்டும். SMS அனுப்பினேன். எந்த நேரமும் அழைக்கலாம்!",
    "te": "ధన్యవాదాలు! మీ పంటలు బాగా పెరగాలి. SMS పంపాను. ఎప్పుడైనా కాల్ చేయండి!",
    "hi": "धन्यवाद! फसल अच्छी हो। SMS भेज दिया। कभी भी कॉल करें!",
    "en": "Thank you! Wishing you a great harvest. SMS sent. Call anytime!",
}

NOT_HEARD = {
    "ta": "மன்னிக்கவும், சரியாக கேட்கவில்லை. மீண்டும் சொல்லுங்கள்.",
    "te": "క్షమించండి, సరిగా వినలేదు. మళ్ళీ చెప్పండి.",
    "hi": "माफ़ करें, ठीक से सुनाई नहीं दिया। फिर बोलें।",
    "en": "Sorry, I didn't catch that clearly. Please say it again.",
}

ONBOARD_QUESTIONS = {
    "ta": {
        1: "உங்கள் பெயர் என்ன?",
        2: "நீங்கள் எந்த கிராமத்தில் வசிக்கிறீர்கள்?",
        3: "உங்கள் மாவட்டம் எது? உதாரணம்: கோயம்புத்தூர், மதுரை, திருச்சி.",
        4: "நீங்கள் என்ன பயிர் பயிரிடுகிறீர்கள்?",
        5: "உங்கள் நிலம் எத்தனை ஏக்கர்?",
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

ONBOARD_DONE = {
    "ta": "நன்றி {name}! விவரங்கள் சேமிக்கப்பட்டன. {weather} இப்போது என்ன உதவி வேண்டும்?",
    "te": "ధన్యవాదాలు {name}! వివరాలు సేవ్ అయ్యాయి. {weather} ఇప్పుడు ఏమి సహాయం కావాలి?",
    "hi": "धन्यवाद {name}! जानकारी सहेजी गई। {weather} अब क्या मदद चाहिए?",
    "en": "Thank you {name}! Profile saved. {weather} How can I help you now?",
}

# SMS templates
SMS_TEMPLATES = {
    "ta": "AgriVoice AI உரையாடல் சுருக்கம்:\n{summary}\n\nமேலும் உதவிக்கு: {helpline}",
    "te": "AgriVoice AI సంభాషణ సారాంశం:\n{summary}\n\nమరింత సహాయానికి: {helpline}",
    "hi": "AgriVoice AI बातचीत सारांश:\n{summary}\n\nसहायता: {helpline}",
    "en": "AgriVoice AI conversation summary:\n{summary}\n\nHelp: {helpline}",
}

YIELD_TRANSFER = {
    "ta": "உங்கள் விளைச்சலை விற்க விரும்புகிறீர்களா? நான் வினியோகஸ்தரிடம் இணைக்கிறேன். ஒரு நிமிடம்.",
    "te": "మీ దిగుబడి అమ్మాలనుకుంటున్నారా? పంపిణీదారుతో కలుపుతాను. ఒక్క నిమిషం.",
    "hi": "फसल बेचना चाहते हैं? वितरक से जोड़ रहा हूँ। एक पल।",
    "en": "Want to sell your yield? Connecting you to a distributor. Please hold.",
}

YIELD_KEYWORDS = {
    "ta": ["விளைச்சல்", "விற்க", "விற்பனை", "கொள்முதல்", "மார்க்கெட்", "விலை கிடைக்கும்"],
    "te": ["దిగుబడి", "అమ్మాలి", "అమ్మకం", "మార్కెట్", "ధర"],
    "hi": ["फसल बेचनी", "बेचना", "मंडी", "खरीद", "दाम मिलेगा"],
    "en": ["sell yield", "sell harvest", "sell crop", "buyer", "distributor", "market price"],
}

END_KEYWORDS = {
    "ta": ["நன்றி", "போகிறேன்", "வைக்கிறேன்", "முடிந்தது", "bye", "finish"],
    "te": ["ధన్యవాదాలు", "వెళ్తున్నాను", "bye", "అయిపోయింది"],
    "hi": ["धन्यवाद", "जा रहा हूँ", "bye", "बस हो गया"],
    "en": ["thank you", "goodbye", "bye", "done", "finished", "that's all"],
}

SMS_KEYWORDS = {
    "ta": ["sms", "மெசேஜ்", "அனுப்பு", "message"],
    "te": ["sms", "మెసేజ్", "పంపు", "message"],
    "hi": ["sms", "मैसेज", "भेजो", "message"],
    "en": ["sms", "message", "send", "text me"],
}


def detect_language(text: str) -> str:
    """
    Detect language from Unicode character ranges.
    Counts script characters and returns dominant language.
    """
    if not text:
        return "en"
    tamil  = sum(1 for c in text if '\u0B80' <= c <= '\u0BFF')
    telugu = sum(1 for c in text if '\u0C00' <= c <= '\u0C7F')
    hindi  = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    total  = len(text)

    # Need at least 5% of text to be native script to count
    if tamil  > 1 and tamil  / total > 0.05 and tamil  >= telugu and tamil  >= hindi:
        return "ta"
    if telugu > 1 and telugu / total > 0.05 and telugu >= tamil  and telugu >= hindi:
        return "te"
    if hindi  > 1 and hindi  / total > 0.05 and hindi  >= tamil  and hindi  >= telugu:
        return "hi"
    return "en"
