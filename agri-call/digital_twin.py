"""
digital_twin.py — AgriVoice AI Digital Twin
Simulates crop health using historical + forecast weather.
Stored in Firebase under farmers/{phone}/digital_twin
"""

from datetime import datetime
from typing import Optional

CROP_PROFILES = {
    "rice":      {"optimal_temp": (22, 32), "optimal_humidity": (70, 90), "water_need_mm_day": 8,  "drought_stress_days": 4,  "disease_humidity_threshold": 85, "growth_days": 120},
    "cotton":    {"optimal_temp": (25, 35), "optimal_humidity": (50, 70), "water_need_mm_day": 5,  "drought_stress_days": 8,  "disease_humidity_threshold": 75, "growth_days": 150},
    "tomato":    {"optimal_temp": (18, 28), "optimal_humidity": (60, 80), "water_need_mm_day": 6,  "drought_stress_days": 3,  "disease_humidity_threshold": 80, "growth_days": 90},
    "wheat":     {"optimal_temp": (15, 25), "optimal_humidity": (50, 70), "water_need_mm_day": 4,  "drought_stress_days": 7,  "disease_humidity_threshold": 80, "growth_days": 120},
    "sugarcane": {"optimal_temp": (24, 35), "optimal_humidity": (65, 85), "water_need_mm_day": 10, "drought_stress_days": 7,  "disease_humidity_threshold": 90, "growth_days": 360},
    "maize":     {"optimal_temp": (20, 35), "optimal_humidity": (55, 80), "water_need_mm_day": 6,  "drought_stress_days": 5,  "disease_humidity_threshold": 80, "growth_days": 100},
    "default":   {"optimal_temp": (20, 35), "optimal_humidity": (55, 80), "water_need_mm_day": 6,  "drought_stress_days": 6,  "disease_humidity_threshold": 80, "growth_days": 90},
}

YIELD_BASE = {"rice": 4.5, "cotton": 1.8, "wheat": 3.5, "tomato": 25.0, "sugarcane": 60.0, "maize": 5.0, "default": 3.0}


def _get_profile(crop_name: str) -> tuple:
    crop_lower = crop_name.lower().strip()
    for key, profile in CROP_PROFILES.items():
        if key != "default" and (key in crop_lower or crop_lower in key):
            return key, profile
    return "default", CROP_PROFILES["default"]


def _stress(temp: float, humidity: float, rain: float, profile: dict) -> float:
    ot, oh = profile["optimal_temp"], profile["optimal_humidity"]
    s = 0.0
    if temp < ot[0]:   s += min(1.0, (ot[0] - temp)  / 10) * 0.4
    elif temp > ot[1]: s += min(1.0, (temp  - ot[1])  / 10) * 0.4
    if humidity < oh[0]:   s += min(1.0, (oh[0] - humidity) / 20) * 0.3
    elif humidity > oh[1]: s += min(1.0, (humidity - oh[1]) / 20) * 0.2
    need = profile["water_need_mm_day"]
    if rain < need * 0.3: s += 0.3
    elif rain > need * 5: s += 0.3
    return min(1.0, s)


def _disease_risk(humidity: float, temp: float, profile: dict) -> float:
    thr = profile["disease_humidity_threshold"]
    if humidity < thr:
        return 0.0
    h = min(1.0, (humidity - thr) / 15)
    ot = profile["optimal_temp"]
    t = 0.8 if ot[0] <= temp <= ot[1] + 5 else 0.4
    return h * t


def run_digital_twin(farmer: dict, weather_data: dict, sowing_date: Optional[str] = None) -> dict:
    crops = farmer.get("crops", ["default"])
    land  = float(farmer.get("land_size", 1) or 1)
    days  = weather_data.get("days", [])
    if not days:
        return {"error": "No weather data", "overall_health": 75, "crops": []}

    today_str  = datetime.now().strftime("%Y-%m-%d")
    historical = [d for d in days if d.get("datetime", "") <= today_str][-30:]
    forecast   = [d for d in days if d.get("datetime", "") >  today_str][:30]

    results = []
    for crop_name in crops[:3]:
        key, profile = _get_profile(crop_name)

        # Historical
        h_stress, h_disease, h_rain = [], [], 0.0
        dry_streak = max_dry = 0
        for d in historical:
            temp = d.get("temp", 28) or 28
            hum  = d.get("humidity", 65) or 65
            rain = d.get("precip", 0) or 0
            h_stress.append(_stress(temp, hum, rain, profile))
            h_disease.append(_disease_risk(hum, temp, profile))
            h_rain += rain
            if rain < 2:
                dry_streak += 1
                max_dry = max(max_dry, dry_streak)
            else:
                dry_streak = 0

        avg_hs = sum(h_stress)  / max(len(h_stress),  1)
        avg_hd = sum(h_disease) / max(len(h_disease), 1)

        # Forecast
        f_stress, f_disease, f_rain = [], [], 0.0
        water_deficit = 0.0
        risk_alerts   = []
        for i, d in enumerate(forecast):
            temp = d.get("tempmax", 30) or 30
            hum  = d.get("humidity", 65) or 65
            rain = d.get("precip", 0) or 0
            date = d.get("datetime", "")
            fs   = _stress(temp, hum, rain, profile)
            fd   = _disease_risk(hum, temp, profile)
            f_stress.append(fs)
            f_disease.append(fd)
            f_rain   += rain
            water_deficit = max(0, water_deficit + profile["water_need_mm_day"] - rain)
            if fs > 0.6:
                risk_alerts.append({"date": date, "type": "high_stress",    "score": round(fs, 2), "days_out": i + 1})
            if fd > 0.7:
                risk_alerts.append({"date": date, "type": "disease_risk",   "score": round(fd, 2), "days_out": i + 1})
            if water_deficit > profile["water_need_mm_day"] * 5:
                risk_alerts.append({"date": date, "type": "water_deficit",  "deficit_mm": round(water_deficit, 1), "days_out": i + 1})

        avg_fs = sum(f_stress)  / max(len(f_stress),  1)
        avg_fd = sum(f_disease) / max(len(f_disease), 1)

        health = max(0, int(100 - avg_hs * 40 - avg_hd * 30 - min(max_dry / 10, 1) * 30))
        base   = YIELD_BASE.get(key, 3.0)
        pred_yield = round(base * max(0.3, 1.0 - avg_hs * 0.5 - avg_fs * 0.3) * land, 2)

        recs = []
        if avg_hs > 0.4:   recs.append("Check irrigation and fertilizer — stress detected in past 30 days.")
        if avg_hd > 0.5:   recs.append("Fungal disease risk — apply fungicide.")
        if water_deficit > profile["water_need_mm_day"] * 3:
            recs.append(f"Water deficit {water_deficit:.0f}mm — irrigate immediately.")
        if max_dry >= profile["drought_stress_days"]:
            recs.append(f"{max_dry} dry days detected — apply mulching.")
        if avg_fd > 0.6:   recs.append("Disease risk high next 30 days — preventive spray recommended.")

        results.append({
            "crop": crop_name, "crop_key": key,
            "health_score": health,
            "predicted_yield_tons": pred_yield,
            "historical": {
                "avg_stress": round(avg_hs, 3), "avg_disease_risk": round(avg_hd, 3),
                "total_rain_mm": round(h_rain, 1), "max_dry_streak": max_dry,
            },
            "forecast": {
                "avg_stress": round(avg_fs, 3), "avg_disease_risk": round(avg_fd, 3),
                "total_rain_mm": round(f_rain, 1), "water_deficit_mm": round(water_deficit, 1),
                "risk_alerts": risk_alerts[:5],
            },
            "recommendations": recs,
        })

    avg_health = int(sum(r["health_score"] for r in results) / max(len(results), 1))
    urgent     = [a for r in results for a in r["forecast"]["risk_alerts"] if a["days_out"] <= 7]

    return {
        "updated_at":    datetime.now().isoformat(),
        "overall_health": avg_health,
        "farm": {"name": farmer.get("name"), "location": farmer.get("district"), "land_acres": land},
        "crops":          results,
        "urgent_alerts":  urgent[:5],
    }


def twin_voice_summary(twin: dict, lang: str = "ta") -> str:
    health = twin.get("overall_health", 75)
    crops  = twin.get("crops", [])
    alerts = twin.get("urgent_alerts", [])
    lines  = []
    if lang == "ta":
        status = "சிறப்பாக" if health >= 80 else ("சராசரியாக" if health >= 60 else "கவனிப்பு தேவை")
        lines.append(f"உங்கள் பண்ணை ஆரோக்கியம் {health}% — {status} உள்ளது.")
        for c in crops[:2]:
            lines.append(f"{c['crop']} எதிர்பார்க்கும் விளைச்சல் {c['predicted_yield_tons']} டன்.")
            if c.get("recommendations"):
                lines.append(c["recommendations"][0])
        if alerts:
            lines.append(f"அடுத்த 7 நாட்களில் {len(alerts)} எச்சரிக்கைகள் உள்ளன.")
    else:
        lines.append(f"Farm health: {health}%.")
        for c in crops[:2]:
            lines.append(f"{c['crop']} expected yield: {c['predicted_yield_tons']} tons.")
            if c.get("recommendations"):
                lines.append(c["recommendations"][0])
        if alerts:
            lines.append(f"{len(alerts)} alerts in next 7 days.")
    return " ".join(lines)
