# Access keys

A caster's access keys protect the `.spell` files they download without a password: a file
protected with one opens wherever the caster has their account. How a key protects a file
is in [spell-protection.md](spell-protection.md) (the access-key slot).

The account keeps the keys. Each key is 256 random bits, made by the server, kept encrypted
with a server key, and handed only to its owner. This is the app's protection, not
end-to-end: the server can technically read them.

## Status

Off. The client is wired, but `ACCESS_KEYS_ENABLED` (`src/config/consts.ts`) stays `false`
until the API below exists. While it's off:

- Settings → Permissions shows the Access keys section disabled, marked as coming.
- The download's access-key option shows disabled.
- Nothing asks the API for keys, and a `.spell` is protected only with a password.

To turn them on, set `ACCESS_KEYS_ENABLED` to `true`. Nothing else changes.

## The API the client expects

Every route acts on the session's caster (`credentials: 'include'`), and only on their own
keys. A key that isn't theirs is a 404, the same as one that doesn't exist. A key is never
logged.

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/user/access-keys` | | `200` `[{ id, name, createdAt }]`, never the key itself |
| `POST` | `/user/access-keys` | `{ name }` | `201` `{ id, name, createdAt }`, the server makes the key |
| `GET` | `/user/access-keys/:id` | | `200` `{ id, key }`, `key` being the 32 bytes in standard base64 |
| `DELETE` | `/user/access-keys/:id` | | `204` |

- `id`: a string, the same one the `.spell` access-key slot keeps as `keyId`.
- `createdAt`: an ISO 8601 date.
- An error is any non-2xx status; the client shows a generic error for it.

Deleting a key can't be undone. A `.spell` protected only with that key can't be opened
anymore by anyone; one that also has a password still opens with it. The client asks for
confirmation first.

The client side is `src/services/accessKeys.ts` (the calls), `src/app/features/AccessKeys`
(the section in Permissions), and the download and import hooks, which use the keys.
