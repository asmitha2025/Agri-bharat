"""
location.py — Phone number prefix → state/district triangulation
"""

import re
import requests

TELECOM_CIRCLES = {
    "9444": "Tamil Nadu", "9445": "Tamil Nadu", "9442": "Tamil Nadu",
    "9443": "Tamil Nadu", "9941": "Tamil Nadu", "9942": "Tamil Nadu",
    "9943": "Tamil Nadu", "9944": "Tamil Nadu", "9500": "Tamil Nadu",
    "9600": "Tamil Nadu", "6380": "Tamil Nadu", "6381": "Tamil Nadu",
    "7339": "Tamil Nadu", "8056": "Tamil Nadu", "9363": "Tamil Nadu",
    "9361": "Tamil Nadu", "9360": "Tamil Nadu",
    "9848": "Andhra Pradesh", "9849": "Andhra Pradesh",
    "9000": "Telangana", "9001": "Telangana",
    "9448": "Karnataka", "9449": "Karnataka", "9980": "Karnataka",
    "9447": "Kerala", "9446": "Kerala", "9495": "Kerala",
    "9820": "Maharashtra", "9821": "Maharashtra",
    "9815": "Punjab", "9814": "Punjab",
    "9812": "Haryana", "9813": "Haryana",
    "9415": "Uttar Pradesh", "9450": "Uttar Pradesh",
    "9414": "Rajasthan", "9413": "Rajasthan",
    "9426": "Gujarat", "9427": "Gujarat",
    "9433": "West Bengal", "9432": "West Bengal",
    "9425": "Madhya Pradesh", "9424": "Madhya Pradesh",
}

STATE_DEFAULT_DISTRICT = {
    "Tamil Nadu":      "Chennai",
    "Andhra Pradesh":  "Vijayawada",
    "Telangana":       "Hyderabad",
    "Karnataka":       "Bangalore",
    "Kerala":          "Thiruvananthapuram",
    "Maharashtra":     "Mumbai",
    "Punjab":          "Amritsar",
    "Haryana":         "Chandigarh",
    "Uttar Pradesh":   "Lucknow",
    "Rajasthan":       "Jaipur",
    "Gujarat":         "Ahmedabad",
    "West Bengal":     "Kolkata",
    "Madhya Pradesh":  "Bhopal",
}


def triangulate_from_phone(phone: str) -> dict:
    digits = re.sub(r'\D', '', phone)
    if digits.startswith('91') and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith('0') and len(digits) == 11:
        digits = digits[1:]
    if len(digits) < 10:
        return {"state": None, "district": None, "confidence": "none"}

    state = TELECOM_CIRCLES.get(digits[:4]) or TELECOM_CIRCLES.get(digits[:3])
    if state:
        return {
            "state":      state,
            "district":   STATE_DEFAULT_DISTRICT.get(state, state),
            "confidence": "medium",
            "method":     "phone_prefix",
        }
    return {"state": None, "district": None, "confidence": "none", "method": "failed"}


def best_location_guess(phone: str, account_sid: str, auth_token: str) -> dict:
    result = triangulate_from_phone(phone)
    if result["confidence"] == "medium":
        return result
    # Try Twilio Lookup as fallback
    try:
        url  = f"https://lookups.twilio.com/v1/PhoneNumbers/{phone}?Type=carrier"
        resp = requests.get(url, auth=(account_sid, auth_token), timeout=5)
        if resp.status_code == 200:
            data    = resp.json()
            carrier = data.get("carrier", {}).get("name", "")
            result["carrier"] = carrier
    except Exception:
        pass
    return result
