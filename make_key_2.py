import base64, hmac, hashlib, json
from datetime import datetime, timedelta, timezone

SECRET_KEY = "Telegram_Adder_Super_Secret_Key_@2024!"

def make_token(machine_id: str, days_valid: int = 365):
    expires_at = (datetime.now(timezone.utc) + timedelta(days=days_valid))\
        .isoformat(timespec="microseconds")  # includes +00:00
    payload = {"expires_at": expires_at, "machine_id": machine_id}
    raw_payload = json.dumps(payload, separators=(",", ":"))
    payload_bytes = raw_payload.encode("utf-8")

    sig = hmac.new(SECRET_KEY.encode("utf-8"), payload_bytes, hashlib.sha256).digest()
    token = base64.urlsafe_b64encode(payload_bytes + sig).decode("utf-8")
    print("Payload:", raw_payload)
    print("Generated Token:\n", token)
    return token

# Example
make_token("132281831523414", days_valid=365)
