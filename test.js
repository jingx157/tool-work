// auto_split_token.js
// Usage: edit the `token` and `knownPayload` variables below and run `node auto_split_token.js`
//
// This script tries multiple deterministic JSON serializations (sorted keys, compact, spaced, pretty, and a few common variants)
// to find which base64url-encoded payload matches the start of the provided token (no delimiter case).
//
// When a match is found, it prints the signature (base64url and hex) and payload variant used.

const crypto = require("crypto");

// --- Helpers: base64url encode/decode
function toBase64Url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromBase64Url(s) {
  s = String(s).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

// --- Deterministic stable stringify (shallow + recursive for nested objects)
// Produces JSON with keys sorted lexicographically. It keeps arrays and primitive types intact.
// For objects it produces compact representation (no spaces). We'll transform it into variants later.
function stableStringify(obj) {
  if (obj === null) return "null";
  if (Array.isArray(obj)) {
    return "[" + obj.map((v) => stableStringify(v)).join(",") + "]";
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj).sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
    return "{" + parts.join(",") + "}";
  }
  // primitive
  return JSON.stringify(obj);
}

// --- Candidate serializers (functions that produce a string from the object)
// Order here is chosen to try the most likely/compact forms first.
const serializers = [
  {
    name: "stable_compact (sorted keys, compact)",
    fn: (o) => stableStringify(o),
  },
  {
    name: "JSON.stringify compact (separators(',',':'))",
    fn: (o) => JSON.stringify(o, null, 0),
  },
  {
    name: "JSON.stringify default (may include spaces)",
    fn: (o) => JSON.stringify(o),
  },
  {
    name: "stable_spaced (sorted keys, spaces after colon/comma)",
    fn: (o) => {
      // convert stable compact -> add single space after colon and after comma
      return stableStringify(o).replace(/:/g, ": ").replace(/,/g, ", ");
    },
  },
  {
    name: "pretty (JSON.stringify with 2-space indent)",
    fn: (o) => JSON.stringify(o, null, 2),
  },
  {
    name: "stable_compact_with_trailing_space (compact + trailing space after object)",
    fn: (o) => stableStringify(o) + " ",
  },
  {
    name: "compact_with_space_after_colon (compact but space after colon only)",
    fn: (o) => stableStringify(o).replace(/:/g, ": "),
  },
  {
    name: "compact_with_space_after_comma (compact but space after comma only)",
    fn: (o) => stableStringify(o).replace(/,/g, ", "),
  },
  {
    name: "user_provided_raw (use if you set rawPayloadString variable below)",
    fn: (o) => {
      // the script will replace o with raw string later if provided
      return o;
    },
  },
];

// --- Main routine: tries each serialization and checks token prefix
function tryFindSignature(token, knownPayloadObj, rawPayloadStringMaybe) {
  const tried = [];
  for (const s of serializers) {
    let payloadStr;
    try {
      if (s.name === "user_provided_raw") {
        if (!rawPayloadStringMaybe) {
          // skip if user didn't provide a raw payload string
          continue;
        }
        payloadStr = rawPayloadStringMaybe;
      } else {
        payloadStr = s.fn(knownPayloadObj);
      }
    } catch (e) {
      // skip if serializer throws
      continue;
    }
    const payloadB64 = toBase64Url(payloadStr);
    const matches = token.startsWith(payloadB64);
    tried.push({ name: s.name, payloadStr, payloadB64, matches });

    if (matches) {
      const signatureB64 = token.slice(payloadB64.length);
      const sigBuf = signatureB64 ? fromBase64Url(signatureB64) : Buffer.alloc(0);
      return {
        found: true,
        variant: s.name,
        payloadStr,
        payloadB64,
        signatureB64,
        signatureHex: sigBuf.toString("hex"),
        signatureLen: sigBuf.length,
        tried,
      };
    }
  }

  return { found: false, tried };
}

// --------------------- USER INPUT: put your token + known payload here ---------------------
const token = "eyJleHBpcmVzX2F0IjogIjIwMjYtMDktMDJUMTQ6MDU6NDYuMzI3MjkxIiwgIm1hY2hpbmVfaWQiOiAiNTM0NDcxNjE2NDk5MzcifW6A5Zo3vG-dkE1dvO4jkCp5epbOvZ855ve4yr93f3p4";

// Provide the known payload as an object:
const knownPayload = {
  expires_at: "2026-09-02T14:05:46.327291",
  machine_id: "53447161649937",
};

// Optionally provide the exact raw JSON string (including original whitespace & key order).
// If you know the exact string used to create the token, put it here (set rawPayloadString = null to skip).
// Example: const rawPayloadString = '{"expires_at":"2026-09-02T14:05:46.327291","machine_id":"53447161649937"}';
const rawPayloadString = null; // <-- set to exact original JSON string if you have it

// ---------------------------------------------------------------------------------------------

const result = tryFindSignature(token, knownPayload, rawPayloadString);

if (result.found) {
  console.log("✅ Found a matching payload serialization!");
  console.log("Variant used:", result.variant);
  console.log("payload string (exact):");
  console.log(result.payloadStr);
  console.log("payload (base64url):", result.payloadB64);
  console.log("signature (base64url):", result.signatureB64);
  console.log("signature (hex):", result.signatureHex);
  console.log("signature length (bytes):", result.signatureLen);
  console.log("\nTried variants (summary):");
  result.tried.forEach((t) => {
    console.log(`- ${t.name}  => matches: ${t.matches}  (payloadB64 length ${t.payloadB64.length})`);
  });
  process.exit(0);
} else {
  console.error("❌ Failed to find payload prefix with tried serializations.");
  console.error("Tried variants (showing payloadB64 snippets):");
  result.tried.forEach((t, i) => {
    console.error(`${i + 1}. ${t.name}`);
    console.error("   payloadStr:", t.payloadStr);
    console.error("   payloadB64:", t.payloadB64);
    console.error("   matches?:", t.matches);
  });
  console.error("\nHints:");
  console.error("- If you know the *exact* JSON string used (same whitespace/order), set rawPayloadString to that value and re-run.");
  console.error("- Some serializers may include non-ASCII invisible characters; copy/paste exact payload from the original token if possible.");
  console.error("- If the token was created with a different key order, try reordering knownPayload keys to match exactly or provide rawPayloadString.");
  process.exit(2);
}
