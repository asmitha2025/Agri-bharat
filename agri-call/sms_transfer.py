"""
sms_transfer.py — AgriVoice AI SMS + distributor transfer
"""

import os
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse
from groq import Groq
from languages import SMS_TEMPLATES, YIELD_TRANSFER

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN  = os.environ.get("TWILIO_AUTH_TOKEN",  "")
TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER", "")
HELPLINE           = "1800-180-1551"

DISTRIBUTOR_NUMBERS = {
    "Tamil Nadu":     {"default": "+919000000001", "rice": "+919000000002", "cotton": "+919000000003"},
    "Andhra Pradesh": {"default": "+919000000005"},
    "Telangana":      {"default": "+919000000006"},
    "Karnataka":      {"default": "+919000000007"},
    "default":        "+919000000001",
}

VOICE_MAP = {
    "ta": ("Google.ta-IN-Standard-A", "ta-IN"),
    "te": ("Google.te-IN-Standard-A", "te-IN"),
    "hi": ("Google.hi-IN-Standard-A", "hi-IN"),
    "en": ("Google.en-IN-Standard-A", "en-IN"),
}


def get_distributor_number(state: str, crops: list) -> str:
    state_map = DISTRIBUTOR_NUMBERS.get(state, {})
    for crop in (crops or []):
        for key, num in state_map.items():
            if key != "default" and (key in crop.lower() or crop.lower() in key):
                return num
    return state_map.get("default", DISTRIBUTOR_NUMBERS["default"])


def generate_sms_summary(conversations: list, groq_client: Groq, lang: str = "ta") -> str:
    """Generate concise SMS-ready summary of conversation."""
    if not conversations:
        return ""
    # Take last 8 turns to summarize
    history = "\n".join(
        f"{'Farmer' if m['role'] == 'user' else 'AgriVoice'}: {m['content']}"
        for m in conversations[-8:]
        if isinstance(m.get('content'), str)
    )
    if not history.strip():
        return ""
    instructions = {
        "ta": "இந்த உரையாடலை 2-3 வரிகளில் தமிழில் சுருக்கவும். SMS-க்கு பொருத்தமாக இருக்கட்டும்.",
        "te": "2-3 వాక్యాలలో తెలుగులో సారాంశం. SMS కోసం తగినది.",
        "hi": "2-3 वाक्यों में हिंदी में सारांश। SMS के लिए उपयुक्त।",
        "en": "Summarize in 2-3 sentences in English. Keep it SMS-friendly.",
    }
    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": f"{instructions.get(lang, instructions['en'])}:\n{history}"}],
            max_tokens=100,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[SMS] Summary error: {e}")
        return ""


def send_sms_summary(phone: str, summary: str, lang: str = "ta") -> bool:
    """Send formatted SMS with conversation summary."""
    if not phone or not summary:
        return False
    try:
        client   = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        template = SMS_TEMPLATES.get(lang, SMS_TEMPLATES["en"])
        body     = template.format(summary=summary, helpline=HELPLINE)

        # Ensure SMS is within 320 chars (2 SMS segments)
        if len(body) > 320:
            body = body[:317] + "..."

        msg = client.messages.create(
            from_=TWILIO_FROM_NUMBER,
            body=body,
            to=phone,
        )
        print(f"[SMS] Sent to {phone}: {msg.sid}")
        return True
    except Exception as e:
        print(f"[SMS] Send error: {e}")
        return False


def transfer_to_distributor(
    resp: VoiceResponse, phone: str, lang: str, state: str, crops: list
) -> VoiceResponse:
    """Transfer call to distributor."""
    number    = get_distributor_number(state, crops)
    msg       = YIELD_TRANSFER.get(lang, YIELD_TRANSFER["en"])
    voice, lc = VOICE_MAP.get(lang, VOICE_MAP["en"])
    if voice == "alice":
        resp.say(msg, language=lc)
    else:
        resp.say(msg, voice=voice, language=lc)
    dial = resp.dial(action="/transfer-complete", method="POST", timeout=30)
    dial.number(number)
    print(f"[Transfer] {phone} → {number} ({state})")
    return resp
