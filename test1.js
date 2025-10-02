const token = "eyJleHBpcmVzX2F0IjogIjIwMjYtMDktMDJUMTQ6MDU6NDYuMzI3MjkxIiwgIm1hY2hpbmVfaWQiOiAiNTM0NDcxNjE2NDk5MzcifW6A5Zo3vG-dkE1dvO4jkCp5epbOvZ855ve4yr93f3p4";

// 👇 Use the exact string you saw after decoding, copy-paste it exactly:
const rawPayloadString = '{"expires_at": "2026-09-02T14:05:46.327291", "machine_id": "53447161649937"}';

// Base64url encode that raw string
function toBase64Url(str) {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

const payloadB64 = toBase64Url(rawPayloadString);

// Slice the token into payload + signature
if (token.startsWith(payloadB64)) {
  const signatureB64 = token.slice(payloadB64.length);
  const signatureBuf = Buffer.from(
    signatureB64.replace(/-/g, "+").replace(/_/g, "/") + "==",
    "base64"
  );
  console.log("Payload string:", rawPayloadString);
  console.log("Payload (base64url):", payloadB64);
  console.log("Signature (base64url):", signatureB64);
  console.log("Signature (hex):", signatureBuf.toString("hex"));
} else {
  console.error("Still no match. That means the raw payload string you pasted isn't *exactly* what was used.");
}
