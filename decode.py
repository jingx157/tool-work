import base64
key = "eyJleHBpcmVzX2F0IjogIjIwMjYtMTAtMDNUMDQ6NTU6NTguMjAzMDU0IiwgIm1hY2hpbmVfaWQiOiAiOTYyNjUwODgyMTIyIn1-uH8oc1fKnlcRVTNzhShQimSQSQCLsjj_5Fv07mupaA"
padded = key + "=" * ((4 - len(key) % 4) % 4)
data = base64.urlsafe_b64decode(padded.encode())
print(data[:-32].decode())   # payload
print(len(data[-32:]))       # signature length
