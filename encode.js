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


// eyJleHBpcmVzX2F0IjogIjIwMjYtMDktMDJUMTQ6MDU6NDYuMzI3MjkxIiwgIm1hY2hpbmVfaWQiOiAiNTM0NDcxNjE2NDk5MzcifW6A5Zo3vG-dkE1dvO4jkCp5epbOvZ855ve4yr93f3p4