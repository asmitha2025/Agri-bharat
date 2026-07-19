"""
database.py — AgriVoice AI Firebase Firestore manager
"""

import os
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

_db = None


def get_db():
    global _db
    if _db is None:
        if not firebase_admin._apps:
            key_path = os.path.join(os.path.dirname(__file__), "firebase_key.json")
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
        _db = firestore.client()
    return _db


def phone_to_id(phone: str) -> str:
    return phone.replace("+", "").replace(" ", "").strip()


def get_farmer(phone: str) -> dict:
    """Returns farmer dict or empty dict if not found."""
    try:
        db  = get_db()
        doc = db.collection("farmers").document(phone_to_id(phone)).get()
        return doc.to_dict() if doc.exists else {}
    except Exception as e:
        print(f"DB get_farmer error: {e}")
        return {}


def save_farmer(phone: str, data: dict):
    """Create or update farmer profile."""
    try:
        db  = get_db()
        ref = db.collection("farmers").document(phone_to_id(phone))
        data["phone"]     = phone
        data["last_call"] = datetime.now().isoformat()
        doc = ref.get()
        if not doc.exists:
            data["first_call"]  = datetime.now().isoformat()
            data["total_calls"] = 1
            ref.set(data)
        else:
            existing = doc.to_dict()
            data["total_calls"] = existing.get("total_calls", 0) + 1
            ref.update(data)
    except Exception as e:
        print(f"DB save_farmer error: {e}")


def update_farmer_field(phone: str, field: str, value):
    try:
        db  = get_db()
        db.collection("farmers").document(phone_to_id(phone)).update({field: value})
    except Exception as e:
        print(f"DB update_field error: {e}")


def save_conversation_summary(phone: str, summary: str):
    try:
        db  = get_db()
        ref = db.collection("farmers").document(phone_to_id(phone))
        ref.update({
            "conversation_summaries": firestore.ArrayUnion([{
                "date":    datetime.now().strftime("%Y-%m-%d %H:%M"),
                "summary": summary,
            }])
        })
    except Exception as e:
        print(f"DB save_summary error: {e}")


def save_weather_alert(phone: str, alert_type: str, location: str):
    try:
        db  = get_db()
        ref = db.collection("farmers").document(phone_to_id(phone))
        ref.update({
            "weather_alerts_sent": firestore.ArrayUnion([{
                "date":       datetime.now().strftime("%Y-%m-%d %H:%M"),
                "alert_type": alert_type,
                "location":   location,
            }])
        })
    except Exception as e:
        print(f"DB save_alert error: {e}")


def get_all_farmers() -> list:
    try:
        db   = get_db()
        docs = db.collection("farmers").stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"DB get_all error: {e}")
        return []


def farmer_profile_summary(farmer: dict) -> str:
    if not farmer:
        return ""
    crops     = ", ".join(farmer.get("crops", [])) or "unknown"
    summaries = farmer.get("conversation_summaries", [])
    recent    = summaries[-3:] if summaries else []
    recent_text = "\n".join(f"  - {s['date']}: {s['summary']}" for s in recent)
    return (
        f"Name: {farmer.get('name', '?')}\n"
        f"Village: {farmer.get('village', '?')}\n"
        f"District: {farmer.get('district', '?')}\n"
        f"Crops: {crops}\n"
        f"Land: {farmer.get('land_size', '?')} acres\n"
        f"Total calls: {farmer.get('total_calls', 1)}\n"
        f"Recent conversations:\n{recent_text if recent_text else '  First call'}"
    )
