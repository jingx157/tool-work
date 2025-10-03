#!/usr/bin/env python3
"""
make_license_key.py

Generate license keys compatible with the TelegramAdder validate_key routine:
  decoded = base64.urlsafe_b64decode(key)
  data_bytes = decoded[:-32]
  signature_from_key = decoded[-32:]
  expected_signature = hmac.new(SECRET_KEY, data_bytes, sha256).digest()
  compare_digest(...)

Usage:
  python make_license_key.py --machine 53447161649937 --expires "2026-09-02T14:05:46.327291"
  python make_license_key.py --machine 53447161649937 --days 365

Options:
  --secret    HMAC secret to use (defaults to discovered SECRET_KEY in the app)
  --format    choose payload formatting: "observed" (matches the exact spacing we saw),
              or "compact" (json.dumps with no extra spaces). Default: observed
  --verify    run a local verification step and print verification result
"""

import argparse
import base64
import hmac
import hashlib
import json
from datetime import datetime, timedelta, timezone

# Default secret discovered in the decompiled code (use only for your own app/testing)
DEFAULT_SECRET = "Telegram_Adder_Super_Secret_Key_@2024!"

def make_payload_str(machine_id: str, expires_at_iso: str, fmt: str = "observed") -> str:
    """
    Return payload string. fmt controls spacing/formatting.
    - 'observed' uses: {"expires_at": "ISO", "machine_id": "ID"}
    - 'compact' uses json.dumps with separators=(',',':')
    """
    if fmt == "observed":
        # This matches the formatting we observed in the token you decoded earlier.
        return f'{{"expires_at": "{expires_at_iso}", "machine_id": "{machine_id}"}}'
    else:
        # compact deterministic JSON (no spaces)
        return json.dumps({"expires_at": expires_at_iso, "machine_id": machine_id}, separators=(',',':'))

def make_key(machine_id: str, expires_at_iso: str, secret: str = DEFAULT_SECRET, fmt: str = "observed") -> str:
    payload_str = make_payload_str(machine_id, expires_at_iso, fmt=fmt)
    payload_bytes = payload_str.encode("utf-8")

    sig = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).digest()  # 32 bytes
    full = payload_bytes + sig
    key = base64.urlsafe_b64encode(full).decode("utf-8")
    # Remove padding to be consistent with URL-safe tokens (apps often strip '=')
    key = key.rstrip("=")
    return key

def verify_key(key: str, secret: str = DEFAULT_SECRET):
    try:
        # add padding if necessary
        padded = key + "=" * ((4 - len(key) % 4) % 4)
        decoded = base64.urlsafe_b64decode(padded.encode("ascii"))
        if len(decoded) < 33:
            return False, "decoded too short"
        data_bytes = decoded[:-32]
        sig = decoded[-32:]
        expected = hmac.new(secret.encode("utf-8"), data_bytes, hashlib.sha256).digest()
        ok = hmac.compare_digest(expected, sig)
        if not ok:
            return False, "signature mismatch"
        # parse payload
        payload_json = data_bytes.decode("utf-8")
        payload = json.loads(payload_json)
        # verify expiry if present
        expires = payload.get("expires_at")
        machine = payload.get("machine_id")
        if expires:
            try:
                # parse ISO format, allow timezone-less
                exp_dt = datetime.fromisoformat(expires)
            except Exception:
                # fallback: treat as invalid format
                return False, "bad expires format"
            now = datetime.utcnow()
            remaining = exp_dt - now
            valid_time = remaining.total_seconds() >= 0
        else:
            valid_time = True
            remaining = None
        return True, {"machine_id": machine, "expires_at": expires, "valid_time": valid_time, "remaining_seconds": (remaining.total_seconds() if remaining is not None else None)}
    except Exception as e:
        return False, f"error: {e}"

def iso_deadline_from_days(days: int) -> str:
    dt = datetime.utcnow() + timedelta(days=days)
    # maintain microsecond precision if needed; observed example had microseconds
    return dt.replace(tzinfo=None).isoformat(timespec="microseconds")

def main():
    p = argparse.ArgumentParser(description="Generate license key compatible with TelegramAdder validate_key.")
    p.add_argument("--machine", "-m", required=True, help="machine_id (e.g. 53447161649937)")
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument("--expires", "-e", help="expiration ISO timestamp, e.g. 2026-09-02T14:05:46.327291")
    group.add_argument("--days", "-d", type=int, help="days from now until expiry (integer)")
    p.add_argument("--secret", "-s", default=DEFAULT_SECRET, help="HMAC secret (default uses embedded secret)")
    p.add_argument("--format", "-f", choices=("observed", "compact"), default="observed", help="payload JSON formatting")
    p.add_argument("--verify", action="store_true", help="verify generated key locally")
    args = p.parse_args()

    if args.expires:
        expires_iso = args.expires
    else:
        expires_iso = iso_deadline_from_days(args.days)

    key = make_key(args.machine, expires_iso, secret=args.secret, fmt=args.format)
    print("LICENSE KEY:\n")
    print(key)
    print("\nPayload string used:")
    print(make_payload_str(args.machine, expires_iso, fmt=args.format))
    if args.verify:
        ok, info = verify_key(key, secret=args.secret)
        print("\nVerification result:", ok)
        print("Details:", info)

if __name__ == "__main__":
    main()


# python make_license_key.py --machine 962650882122 --days 365 --verify
