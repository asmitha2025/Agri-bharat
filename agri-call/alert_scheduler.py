"""
alert_scheduler.py — SMS alert scheduler for AgriVoice AI
Runs periodic checks and sends SMS alerts. Voice call alerts
are handled separately by _run_alert_scheduler() in app.py.
"""
import threading
import time
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

_scheduler_started = False


def start_scheduler():
    """
    Start the background SMS alert scheduler.
    Runs weather checks every hour and digital twin updates daily at 6 AM IST.
    Safe to call multiple times — only starts once.
    """
    global _scheduler_started
    if _scheduler_started:
        return
    _scheduler_started = True

    def _hourly_weather_check():
        """Check weather alerts every hour and send SMS to at-risk farmers."""
        while True:
            try:
                _run_hourly_check()
            except Exception as e:
                print(f"Scheduler hourly error: {e}")
            time.sleep(3600)  # every hour

    def _daily_twin_update():
        """Update digital twins daily at 6 AM IST (00:30 UTC)."""
        while True:
            try:
                now = datetime.utcnow()
                # target 00:30 UTC = 6:00 AM IST
                target_hour, target_min = 0, 30
                seconds_until = ((target_hour - now.hour) % 24) * 3600 + (target_min - now.minute) * 60 - now.second
                if seconds_until < 0:
                    seconds_until += 86400
                time.sleep(max(seconds_until, 60))
                _run_daily_twin_update()
            except Exception as e:
                print(f"Scheduler daily error: {e}")

    threading.Thread(target=_hourly_weather_check, daemon=True).start()
    threading.Thread(target=_daily_twin_update, daemon=True).start()

    print("⏰ Scheduler running:")
    print("   Weather alerts : every hour")
    print("   Digital twin   : daily 6:00 AM IST")


def _run_hourly_check():
    """Send SMS alerts to farmers with urgent weather conditions."""
    try:
        from database import get_db, phone_to_id
        from weather_engine import fetch_weather, detect_alerts, format_weather_sms
        from app import _get_cached_weather, send_sms, save_weather_alert

        db = get_db()
        alerted = 0
        for doc in db.collection("farmers").stream():
            try:
                data     = doc.to_dict()
                phone    = data.get("phone", "")
                district = data.get("district", "")
                crops    = data.get("crops", [])
                if not phone or not district or not crops:
                    continue

                wd = _get_cached_weather(district, days=3)
                if not wd:
                    continue

                alerts = detect_alerts(wd, crops)
                urgent = [a for a in alerts if a.get("days_from_now", 99) == 0]
                if not urgent:
                    continue

                # Check if we already sent an alert in the last 6 hours
                last_ref = db.collection("sms_alerts").document(phone_to_id(phone))
                last_doc = last_ref.get()
                if last_doc.exists:
                    last_ts = last_doc.to_dict().get("ts", 0)
                    if time.time() - last_ts < 21600:
                        continue

                atype    = urgent[0]["type"]
                sms_body = format_weather_sms(wd, crops, district, atype)
                if send_sms(phone, sms_body):
                    last_ref.set({"ts": time.time(), "type": atype})
                    save_weather_alert(phone, atype, district)
                    alerted += 1
                    time.sleep(1)

            except Exception as e:
                print(f"Hourly check farmer error: {e}")

        if alerted:
            print(f"📱 Hourly check: {alerted} SMS alerts sent")

    except Exception as e:
        print(f"Hourly check error: {e}")


def _run_daily_twin_update():
    """Update digital twins for all farmers once per day."""
    try:
        from database import get_db, phone_to_id
        from app import _get_cached_weather, update_twin

        print("🌱 Daily twin update starting...")
        db = get_db()
        updated = 0
        for doc in db.collection("farmers").stream():
            try:
                data     = doc.to_dict()
                phone    = data.get("phone", "")
                district = data.get("district", "")
                if not phone or not district:
                    continue
                update_twin(phone, data, district)
                updated += 1
                time.sleep(2)  # stagger to avoid API rate limits
            except Exception as e:
                print(f"Daily twin farmer error: {e}")

        print(f"🌱 Daily twin update: {updated} farmers")
    except Exception as e:
        print(f"Daily twin error: {e}")
