"""
weather_engine.py — Weather fetching and crop advisory for AgriVoice AI
Uses Visual Crossing Weather API (free tier: 1000 calls/day)
"""
import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

WEATHER_API_KEY = os.environ.get("WEATHER_API_KEY", "")
WEATHER_BASE    = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline"

ELEMENTS = "datetime,tempmax,tempmin,temp,humidity,precip,precipprob,windspeed,uvindex,conditions,description,weathercode,severerisk"


def fetch_weather(location: str, days: int = 7, include_history: bool = False) -> dict:
    """
    Fetch weather forecast for a location.
    Returns raw API response dict, or None on failure.
    """
    try:
        today = datetime.now().date()
        if include_history:
            start = (today - timedelta(days=30)).isoformat()
        else:
            start = today.isoformat()
        end = (today + timedelta(days=days)).isoformat()

        url = f"{WEATHER_BASE}/{requests.utils.quote(location)}/{start}/{end}"
        params = {
            "unitGroup": "metric",
            "elements": ELEMENTS,
            "include": "days",
            "key": WEATHER_API_KEY,
            "contentType": "json",
        }
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        print(f"✅ Weather fetched for {location} ({days} days)")
        return data
    except Exception as e:
        print(f"Weather HTTP error ({location}): {e}")
        return None


def generate_crop_advisory(weather_data: dict, crops: list, lang: str = "ta") -> str:
    """
    Generate a short crop-specific weather advisory from forecast data.
    Returns 1-2 sentences suitable for voice output.
    """
    if not weather_data:
        return ""

    try:
        days = weather_data.get("days", [])
        if not days:
            return ""

        today = days[0]
        tomorrow = days[1] if len(days) > 1 else {}

        temp     = today.get("temp", 0)
        humidity = today.get("humidity", 0)
        precip   = today.get("precip", 0)
        precip_prob_tomorrow = tomorrow.get("precipprob", 0) if tomorrow else 0
        temp_max = today.get("tempmax", 0)

        crop_str = ", ".join(crops[:2]) if crops else "பயிர்"

        if lang == "ta":
            parts = []
            if precip_prob_tomorrow >= 60:
                parts.append(f"நாளைக்கு மழை வாய்ப்பு {precip_prob_tomorrow:.0f}% — இன்றே யூரியா உரம் போடுங்கள், மழையில் கரைந்துவிடும்.")
            elif precip > 5:
                parts.append(f"இன்று மழை பெய்தது ({precip:.1f}மிமீ) — வயலில் நீர் வடிகால் சரிசெய்யுங்கள்.")
            if temp_max >= 38:
                parts.append(f"வெப்பம் {temp_max:.0f}°C — காலை 6 மணிக்கு நீர் பாய்ச்சுங்கள், மதியம் வேண்டாம்.")
            if humidity >= 80 and temp >= 28:
                parts.append(f"ஈரப்பதம் {humidity:.0f}% — பூஞ்சை நோய் வாய்ப்பு அதிகம், வயலை கண்காணியுங்கள்.")
            if not parts:
                parts.append(f"இன்று வெப்பம் {temp:.0f}°C, ஈரப்பதம் {humidity:.0f}%.")
            return " ".join(parts[:2])
        else:
            parts = []
            if precip_prob_tomorrow >= 60:
                parts.append(f"Rain likely tomorrow ({precip_prob_tomorrow:.0f}%) — apply urea today before it washes away.")
            elif precip > 5:
                parts.append(f"Rain today ({precip:.1f}mm) — check drainage in your fields.")
            if temp_max >= 38:
                parts.append(f"Heat {temp_max:.0f}°C — irrigate at 6am, avoid afternoon watering.")
            if humidity >= 80 and temp >= 28:
                parts.append(f"High humidity {humidity:.0f}% — fungal disease risk, monitor your {crop_str}.")
            if not parts:
                parts.append(f"Today: {temp:.0f}°C, humidity {humidity:.0f}%.")
            return " ".join(parts[:2])

    except Exception as e:
        print(f"Advisory error: {e}")
        return ""


def detect_alerts(weather_data: dict, crops: list) -> list:
    """
    Detect urgent weather alerts from forecast data.
    Returns list of alert dicts with type and days_from_now.
    """
    alerts = []
    if not weather_data:
        return alerts

    try:
        days = weather_data.get("days", [])
        for i, day in enumerate(days[:3]):
            precip_prob = day.get("precipprob", 0)
            temp_max    = day.get("tempmax", 0)
            humidity    = day.get("humidity", 0)
            severe_risk = day.get("severerisk", 0)

            if precip_prob >= 70 or severe_risk >= 50:
                alerts.append({"type": "rain", "days_from_now": i,
                                "value": precip_prob, "severity": "high" if precip_prob >= 85 else "medium"})
            elif temp_max >= 40:
                alerts.append({"type": "heat", "days_from_now": i,
                                "value": temp_max, "severity": "high"})
            elif humidity >= 85 and temp_max >= 28:
                alerts.append({"type": "pest_risk", "days_from_now": i,
                                "value": humidity, "severity": "medium"})
    except Exception as e:
        print(f"detect_alerts error: {e}")

    return sorted(alerts, key=lambda x: x["days_from_now"])


def format_weather_sms(weather_data: dict, crops: list, district: str, alert_type: str) -> str:
    """Format a weather alert as an SMS message."""
    try:
        days = weather_data.get("days", [])
        today = days[0] if days else {}
        tomorrow = days[1] if len(days) > 1 else {}

        crop_str = ", ".join(crops[:2])

        if alert_type == "rain":
            prob = tomorrow.get("precipprob", 0) if tomorrow else today.get("precipprob", 0)
            return (f"AgriVoice அவசர அறிவிப்பு: {district}ல் நாளைக்கு கனமழை வாய்ப்பு {prob:.0f}%. "
                    f"{crop_str} பயிருக்கு தேவையான முன்னேற்பாடு செய்யுங்கள். "
                    f"இன்றே யூரியா போட்டிருந்தால் தாமதிக்காதீர்கள்.")
        elif alert_type == "heat":
            temp = tomorrow.get("tempmax", today.get("tempmax", 40)) if tomorrow else today.get("tempmax", 40)
            return (f"AgriVoice வெப்ப எச்சரிக்கை: {district}ல் {temp:.0f}°C வெப்பம் வரும். "
                    f"{crop_str} பயிருக்கு காலை 6 மணிக்கு நீர் பாய்ச்சுங்கள்.")
        elif alert_type == "pest_risk":
            humidity = today.get("humidity", 85)
            return (f"AgriVoice பூச்சி எச்சரிக்கை: ஈரப்பதம் {humidity:.0f}% — "
                    f"{crop_str} பயிரில் பூஞ்சை/பூச்சி வாய்ப்பு. இன்றே வயலை சோதிக்கவும்.")
        return f"AgriVoice: {district} வானிலை அறிவிப்பு. தயவுசெய்து AgriVoice ஐ அழையுங்கள்."
    except Exception as e:
        print(f"format_weather_sms error: {e}")
        return "AgriVoice: வானிலை அறிவிப்பு. AgriVoice ஐ அழையுங்கள்."
