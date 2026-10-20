# Protected .spell files

A `.spell` file is free by default: nothing in it is encrypted. A caster can protect one when
downloading it with a password. The format also has a slot for the caster's access keys (one
of them, or a password and keys together); Spellcast shows that option disabled until the
caster's account keeps their access keys. This document
describes how a protected file is laid out, so that any reader of the format can open one
with its password.

Implementation: `src/utils/spellProtection.ts` (the cryptography) and
`src/utils/spellContainer.ts` (the container).

## The container

Every `.spell` starts the same way. All integers are big-endian.

| Bytes | Field |
|---|---|
| 5 | `"SPELL"` (ASCII) |
| 1 | container version (currently `1`) |
| 1 | flags: bit `0x01` = PROTECTED |
| 2 | protection length, `n` (uint16) |
| n | protection block: UTF-8 JSON (empty when the file isn't protected) |
| … | body |

The **body** of an unprotected file is:

| Bytes | Field |
|---|---|
| 4 | index length, `m` (uint32) |
| m | index: raw DEFLATE (RFC 1951) of UTF-8 JSON `{ manifest, entries }` |
| … | the entries, one after the other, at the offsets the index gives |

In a **protected** file (flag `0x01` set), everything after the protection block is the body
above, encrypted as one piece. Once decrypted, it is read exactly like an unprotected file's
body.

## Envelope encryption

A protected file's body is encrypted once, with a random 256-bit **content key**. That key is
then *wrapped* (encrypted) once for each way the file can be opened. Each wrapping is a
**slot** in the protection block. Any one slot is enough to recover the content key, and with
it the body.

### The protection block

```json
{
  "cipher": "AES-256-GCM",
  "iv": "<base64, 12 bytes>",
  "slots": [ ...one or more slots... ]
}
```

- `cipher`: always `"AES-256-GCM"`.
- `iv`: the 96-bit IV the body was encrypted with.
- `slots`: the ways to open the file. A reader skips any slot whose `type` it doesn't know.
  New slot types can be added without changing the format.

All binary values are standard base64 (RFC 4648, with padding).

### The body

- Plaintext: the body, as for an unprotected file (index length + index + entries).
- Algorithm: AES-256-GCM, with the content key and `iv`, and a 128-bit tag appended to the
  ciphertext (as WebCrypto produces it).
- Additional authenticated data: **every byte of the file before the body**, that is the
  magic, version, flags, protection length and protection block. Changing any of them (a
  slot, the version, the flags) makes decryption fail, so an altered header is caught too.

Decryption failing with a content key that was unwrapped correctly means the file was
altered or damaged.

### Password slot

```json
{
  "type": "password",
  "kdf": "PBKDF2-SHA256",
  "iterations": 600000,
  "salt": "<base64, 16 bytes>",
  "iv": "<base64, 12 bytes>",
  "wrappedKey": "<base64, 48 bytes>"
}
```

To open it:

1. Normalize the password to Unicode NFC, then encode it as UTF-8.
2. Derive a 256-bit key with PBKDF2-HMAC-SHA256, using `salt` and `iterations`.
3. Decrypt `wrappedKey` with AES-256-GCM, using the derived key and `iv`, with no additional
   data. The result is the 32-byte content key.
4. If decryption fails (the tag doesn't match), the password is wrong.

Everything happens on the device. The password and the key derived from it are never sent
anywhere and never stored. Spellcast writes 600,000 iterations, and refuses to derive with
more than 6,000,000, so a crafted file can't hang the reader.

A password that's lost can't be recovered, by anyone. That's why Spellcast asks for it twice
and warns about this before it protects a file.

### Access-key slot

```json
{
  "type": "key",
  "keyId": "<the access key's id>",
  "iv": "<base64, 12 bytes>",
  "wrappedKey": "<base64, 48 bytes>"
}
```

The content key is wrapped with AES-256-GCM, using the access key itself (32 bytes) and `iv`,
with no additional data. `keyId` tells which of the caster's keys it is.

Not written by Spellcast yet. The container writes and reads this slot already
(`src/utils/spellProtection.ts`, with tests), and the download and import are wired to it
through `src/services/accessKeys.ts`, which returns no keys until the caster's account keeps
them (meanwhile the download shows the access-key option disabled). Once it returns them,
the download offers each key, and an import opens a file with any
key it has a slot for, wherever the caster has their account.

## Opening a protected file

1. Read the header. If the PROTECTED flag is set, parse the protection block.
2. For each access-key slot whose `keyId` matches a key at hand, try to unwrap the content
   key with it.
3. Otherwise, ask for the password, and try each password slot.
4. With the content key, decrypt the body (using the header bytes as additional data), then
   read it as an unprotected file's body.
