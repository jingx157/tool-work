const token = "eyJleHBpcmVzX2F0IjogIjIwMjYtMDktMDJUMTQ6MDU6NDYuMzI3MjkxIiwgIm1hY2hpbmVfaWQiOiAiNTM0NDcxNjE2NDk5MzcifW6A5Zo3vG-dkE1dvO4jkCp5epbOvZ855ve4yr93f3p4";

function fromBase64Url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

const buf = fromBase64Url(token);
console.log(buf.toString("utf8"));
