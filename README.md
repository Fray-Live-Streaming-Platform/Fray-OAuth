# Fray OAuth Examples (Node.js & PHP)

Minimal end-to-end samples for integrating with the Fray OAuth 2.0 Authorization Code Flow with PKCE and intents.

## What you'll learn
- Create a confidential OAuth client in your Fray account
- Build the authorize URL (with PKCE and intents)
- Handle the callback and exchange the code for tokens
- Refresh an access token and revoke tokens

## Prerequisites
- Fray account and OAuth client (`client_id`, `client_secret`)
- HTTPS Redirect URI(s) configured on your client
- Fray API base URL (e.g. `https://api.fray.live`)
- Node.js ≥ 18 for the Node example; PHP ≥ 8.0 for the PHP example

## Intents (permissions)
Fray uses intents instead of traditional OAuth scopes. Pass them space-separated in the `intents` query param of the authorize URL.

Important:
- Intents are required. If omitted or empty, the authorization will be rejected.
- The user profile endpoint returns only the fields explicitly granted by intents. The field `id` is always included.

Supported intents and returned fields (GET `/me`):
| Intent                | Returns field(s)         | Description                                                      |
|----------------------|---------------------------|------------------------------------------------------------------|
| `username`           | `username`                | Reads your public username                                       |
| `avatar`             | `channel_avatar_url`      | Reads the URL of your channel avatar                             |
| `follower_count`     | `follower_count`          | Reads the number of followers                                    |
| `stream_title`       | `stream_title`            | Reads your current stream title                                  |
| `stream_category_id` | `stream_category_id`      | Reads your current streaming category id                         |
| `stream_subcategory_id` | `stream_subcategory_id`| Reads your current subcategory/game id                           |
| `stream_tags`        | `stream_tags`             | Reads your configured stream tags                                |
| `rtmps_key`          | —                         | Grants access to read RTMPS key via dedicated server endpoints   |

Example response for `intents = "username avatar"` when calling GET `/me` (anonymized):
```json
{
  "id": "aaaaaaaaaaaaaaaaaaaaaaaa",
  "username": "example_user",
  "channel_avatar_url": "https://cdn.fray.live/avatars/example.webp"
}
```

## Provider endpoints
- Authorization: `GET /oauth/authorize`
  - required: `response_type=code`, `client_id`, `redirect_uri`, `intents`
  - recommended: `state`, `code_challenge`, `code_challenge_method=S256`
- Token: `POST /oauth/token`
  - grant: Authorization Code (with PKCE) or Refresh Token
  - include `client_id` and `client_secret` for confidential clients
- Revoke (RFC 7009): `POST /oauth/revoke`
  - revoke access or refresh tokens
- User profile: `GET /me` with `Authorization: Bearer <access_token>`
  - returns `id` + exactly the fields allowed by granted intents

## Confidential clients
All Fray OAuth clients are confidential. A `client_secret` is always issued and required by the token endpoint. Never expose it in the browser.

## Rate limiting
`/oauth/token` is rate‑limited. Handle `429 Too Many Requests` by backing off and retrying later.

## RTMPS key (ingest)
To read the RTMPS ingest credentials (URL + key), request the `rtmps_key` intent during authorization and use the OAuth access token to call the protected ingest endpoints.

Endpoints (Bearer access token required):
- Ensure/Create and read: `POST /me/stream/live-input`
- Read only (no create): `GET /me/stream/live-input`

When a new stream key is provisioned (creation), the response contains only the RTMPS ingest values:
```json
{
  "live_input_id": "...",
  "ingest": {
    "rtmps_url": "rtmps://...",
    "rtmps_key": "live_..."
  }
}
```

Example (Node):
```js
const r = await fetch(`${FRAY_BASE_URL}/me/stream/live-input`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' }
})
if (!r.ok) throw new Error(`HTTP ${r.status}`)
const data = await r.json()
console.log('RTMPS:', data.ingest.rtmps_url, data.ingest.rtmps_key)
```

Example (cURL):
```bash
curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "$FRAY_BASE_URL/me/stream/live-input"
```

Notes:
- The `rtmps_key` intent is required; without it you will receive an authorization error.
- Treat the RTMPS key as a secret. Do not expose it in the browser.
- Use the POST endpoint to lazily create a live input if none exists; use GET to read the current state without creating.

## Node.js example
See `node/` for an Express server demonstrating PKCE auth, callback, refresh, and revoke.

Quickstart:
1) Copy `node/.env.example` to `node/.env` and fill in values
2) In `node/`: `npm install` and `npm start`
3) Open `http://localhost:5173` and click “Login with Fray”

## PHP example
See `php/` for a plain PHP + cURL implementation (PKCE auth, callback, refresh, revoke).

Quickstart:
1) Copy `php/config.php.example.txt` to `php/config.php` and fill in values
2) In `php/`: `php -S localhost:5174`
3) Open `http://localhost:5174`


