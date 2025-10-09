import base64, hmac, hashlib

SECRET_KEY = "Telegram_Adder_Super_Secret_Key_@2024!"

def make_token(raw_payload: str, secret: str = SECRET_KEY) -> str:
    payload_bytes = raw_payload.encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).digest()
    full = payload_bytes + sig
    token = base64.urlsafe_b64encode(full).decode("utf-8")
    return token

def decode_token(token: str):
    padded = token + "=" * ((4 - len(token) % 4) % 4)
    decoded = base64.urlsafe_b64decode(padded.encode())
    payload = decoded[:-32].decode("utf-8")
    sig = decoded[-32:]
    return payload, sig

if __name__ == "__main__":
    # Example: just change machine_id in the raw payload
    raw_payload = '{"expires_at": "2026-09-02", "machine_id": "962650882122"}'
    # raw_payload = '{"expires_at": "2025-10-03T06:10:46.327291", "machine_id": "962650882122"}'
    token = make_token(raw_payload)
    print("Generated Token:\n", token)

    # Debug: round-trip check
    payload, sig = decode_token(token)
    print("\nDecoded payload:", payload)
    print("Signature length:", len(sig))
#   eyJleHBpcmVzX2F0IjogIjIwMjYtMDktMDJUMTQ6MDU6NDYuMzI3MjkxIiwgIm1hY2hpbmVfaWQiOiAiOTYyNjUwODgyMTIyIn3PHBwvpIKOpcr17SsQDUm0e46ln5c8cUHnnfsNVYWgpA==