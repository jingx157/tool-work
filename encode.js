const crypto = require("crypto");

function makeToken(machineId) {
  const payload = {
    expires_at: "2026-09-02T14:05:46.327291", // reuse same expiry
    machine_id: machineId,
  };

  // Encode JSON to base64
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return payloadB64;
}

console.log(makeToken("962650882122")); // change machine_id here
