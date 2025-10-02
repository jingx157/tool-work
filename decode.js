const base64 = "eyJleHBpcmVzX2F0IjogIjIwMjYtMDktMDJUMTQ6MDU6NDYuMzI3MjkxIiwgIm1hY2hpbmVfaWQiOiAiNTM0NDcxNjE2NDk5MzcifW6A5Zo3vG-dkE1dvO4jkCp5epbOvZ855ve4yr93f3p4";
// const base64 = "dkE1dvO4jkCp5epbOvZ855ve4yr93f3p4";



// Split payload (before the signature)
const [payloadB64] = base64.split(/[\-_.]/); // crude split, depends on format
const decoded = Buffer.from(payloadB64, "base64").toString("utf8");

console.log(decoded)

const data = JSON.parse(decoded);
console.log("Decoded:", data);

const now = new Date();
const expiry = new Date(data.expires_at);

if (now > expiry) {
  console.log("❌ Token expired");
} else {
  console.log("✅ Token valid until", expiry.toISOString());
}
