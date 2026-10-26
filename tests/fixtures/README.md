# Synthetic signed fixture

`signed-synthetic.pdf` contains one synthetic page and a real CMS signature produced locally during the 25/10/2026 audit with pyHanko and an ephemeral self-signed RSA certificate. The text and certificate identity are artificial. The private key and PKCS#12 are not included.

This fixture tests structural detection and the warning before modification. It does **not** represent ICP-Brasil, PAdES homologation, ITI validation, trusted identity or long-term validity. Certificate expiry is independent of detecting the existing ByteRange/Contents structure; tests do not claim a valid trust chain.

The separate public compatibility corpus remains managed by `tests/pdf-corpus/manifest.json`.

SHA-256: `ef5cc01153acb2ef5a2ca001b321ba6df789708411181ae349969b7dad6bc92b`.
