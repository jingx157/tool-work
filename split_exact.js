// split_exact.js
const token = "eyJleHBpcmVzX2F0IjogIjIwMjYtMDktMDJUMTQ6MDU6NDYuMzI3MjkxIiwgIm1hY2hpbmVfaWQiOiAiNTM0NDcxNjE2NDk5MzcifW6A5Zo3vG-dkE1dvO4jkCp5epbOvZ855ve4yr93f3p4";

function fromBase64Url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}
function toBase64Url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// Decode full buffer
const buf = fromBase64Url(token);
const text = buf.toString("utf8");

// Find the last closing curly brace
const idx = text.indexOf("}") + 1;

// Extract the JSON string (payload)
const rawPayloadStr = text.slice(0, idx);
console.log("Raw payload string:", rawPayloadStr);

// Encode that payload back to base64url
const payloadB64 = toBase64Url(Buffer.from(rawPayloadStr, "utf8"));
console.log("Payload (base64url):", payloadB64);

// Now slice the token into payload + signature
const signatureB64 = token.slice(payloadB64.length);
console.log("Signature (base64url):", signatureB64);

const sigBuf = fromBase64Url(signatureB64);
console.log("Signature (hex):", sigBuf.toString("hex"));
console.log("Signature length (bytes):", sigBuf.length);
