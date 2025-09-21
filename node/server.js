import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import crypto from 'node:crypto'

const app = express()
app.use(cookieParser())
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

const {
  FRAY_BASE_URL = 'https://api.fray.live',
  CLIENT_ID = '',
  CLIENT_SECRET = '',
  REDIRECT_URI = 'http://localhost:5173/callback',
  PORT = 5173,
  INTENTS = 'username avatar'
} = process.env

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('[warn] CLIENT_ID/CLIENT_SECRET missing in .env')
}

const mem = {
  byState: new Map(),   // state -> { codeVerifier }
  bySid: new Map()      // sid -> { access_token, refresh_token, expires_in, token_type }
}

// Convert Buffer to URL-safe base64 (no padding)
const base64url = (buf) => buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
// Create random URL-safe string
const randomString = (len = 64) => base64url(crypto.randomBytes(len)).slice(0, len)
// SHA-256 hash (Buffer) for PKCE S256 challenge
const sha256 = (input) => crypto.createHash('sha256').update(input).digest()

// Issue or reuse a cookie-based demo session id
const getSid = (req, res) => {
  let sid = req.cookies.sid
  if (!sid) {
    sid = randomString(32)
    res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax' })
  }
  return sid
}

// Home page: simple status + actions
app.get('/', async (req, res) => {
  const sid = getSid(req, res)
  const sessionData = mem.bySid.get(sid)
  const loggedIn = !!(sessionData && sessionData.access_token)
  let meBlock = ''
  if (loggedIn) {
    try {
      const profileResponse = await fetch(`${FRAY_BASE_URL}/me`, { headers: { Authorization: `Bearer ${sessionData.access_token}` } })
      const profileJson = await profileResponse.json().catch(() => ({}))
      meBlock = `<pre>${escapeHtml(JSON.stringify(profileJson, null, 2))}</pre>`
    } catch { }
  }
  res.type('html').send(`<!doctype html>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Fray OAuth Node Example</title>
  <style>
    :root { --bg:#0b0f14; --card:#0f141a; --border:#1f2937; --text:#e5e7eb; --muted:#94a3b8; --primary:#6366f1; --danger:#ef4444; }
    * { box-sizing: border-box }
    body { margin:0; background:var(--bg); color:var(--text); font-family: system-ui, -apple-system, "Segoe UI", Roboto, Inter, sans-serif }
    .wrap { max-width: 860px; margin: 40px auto; padding: 0 16px }
    header { margin-bottom: 10px }
    h1 { margin:0; font-size: 26px; font-weight: 800 }
    .subtitle { margin: 4px 0 0 0; color: var(--muted); font-size: 14px }
    .card { background: var(--card); border:1px solid var(--border); border-radius:12px; padding:16px 18px; margin:16px 0; box-shadow: 0 8px 24px rgba(0,0,0,.25) }
    .row { display:flex; align-items:center; gap:8px; flex-wrap:wrap }
    .label { color: var(--muted) }
    .buttons { display:flex; gap:10px; flex-wrap:wrap; margin-top: 10px }
    .btn { appearance:none; border:1px solid var(--border); background:transparent; color:var(--text); padding:0 14px; min-height:40px; font-size:14px; line-height:1; border-radius:10px; cursor:pointer; transition: .15s ease filter, .15s ease transform, .15s ease box-shadow; display:inline-flex; align-items:center; gap:8px; text-decoration:none }
    .btn:hover { filter: brightness(1.1) }
    .btn.primary { background: var(--primary); color:#fff; border-color: transparent }
    .btn.danger { background: var(--danger); color:#fff; border-color: transparent }
    .btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(99,102,241,.5) }
    .inline { display:inline }
    h2 { margin: 0 0 10px 0; font-size: 18px }
    pre, code { background:#0b1220; border:1px solid var(--border); border-radius:8px; padding:8px }
    pre { overflow:auto; max-height: 520px }
    .status.ok { color:#22c55e; font-weight:600 }
    .status.warn { color:#f59e0b; font-weight:600 }
    footer { margin: 20px 0; color: var(--muted); font-size: 12px }
  </style>
  <body>
    <div class="wrap">
      <header>
        <h1>Fray OAuth Example</h1>
        <p class="subtitle">Authorization Code Flow with PKCE</p>
      </header>
      <section class="card">
        <div class="row"><span class="label">Intents:</span> <code>${escapeHtml(INTENTS)}</code></div>
        <div class="buttons">
          <a href="/login" class="btn" aria-label="Login with Fray">Login with Fray</a>
          <form method="post" action="/refresh" class="inline"><button type="submit" class="btn">Refresh Token</button></form>
          <form method="post" action="/revoke" class="inline"><button type="submit" class="btn danger">Revoke Tokens</button></form>
        </div>
      </section>
      <section class="card">
        <h2>Status</h2>
        <p class="${loggedIn ? 'status ok' : 'status warn'}">${loggedIn ? 'Logged in' : 'Not logged in'}</p>
        ${meBlock || '<div class="label">No profile loaded.</div>'}
      </section>
      <footer>FRAY_BASE_URL: <code>${escapeHtml(FRAY_BASE_URL)}</code></footer>
    </div>
  </body>`)
})

// OAuth Step 1: redirect to /oauth/authorize with PKCE
app.get('/login', (req, res) => {
  const codeVerifier = randomString(64)
  const codeChallenge = base64url(sha256(codeVerifier))
  const state = randomString(24)
  mem.byState.set(state, { codeVerifier })
  const url = new URL('/oauth/authorize', FRAY_BASE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('intents', INTENTS)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  res.redirect(url.toString())
})

// OAuth Step 2: exchange code (+verifier) for tokens
app.get('/callback', async (req, res) => {
  const { code: authCode = '', state: oauthState = '' } = req.query || {}
  const stateData = mem.byState.get(String(oauthState))
  if (!authCode || !stateData) return res.status(400).send('Invalid state or code')
  mem.byState.delete(String(oauthState))

  try {
    const tokenResponse = await fetch(`${FRAY_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: String(authCode),
        redirect_uri: REDIRECT_URI,
        code_verifier: stateData.codeVerifier
      })
    })
    const tokenJson = await tokenResponse.json().catch(() => ({}))
    if (!tokenResponse.ok) return res.status(400).send(`<pre>${escapeHtml(JSON.stringify(tokenJson, null, 2))}</pre>`)
    const sid = getSid(req, res) // persist tokens in tiny session
    mem.bySid.set(sid, {
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token || null,
      token_type: tokenJson.token_type || 'Bearer',
      expires_in: tokenJson.expires_in || 0
    })
    res.redirect('/')
  } catch (e) {
    res.status(500).send(escapeHtml(String(e?.message || e)))
  }
})

// Token refresh using refresh_token
app.post('/refresh', async (req, res) => {
  const sid = getSid(req, res)
  const sessionData = mem.bySid.get(sid)
  if (!sessionData?.refresh_token) return res.status(400).send('No refresh_token')
  try {
    const refreshResponse = await fetch(`${FRAY_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: sessionData.refresh_token
      })
    })
    const refreshJson = await refreshResponse.json().catch(() => ({}))
    if (!refreshResponse.ok) return res.status(400).send(`<pre>${escapeHtml(JSON.stringify(refreshJson, null, 2))}</pre>`)
    mem.bySid.set(sid, { // update access token; refresh may rotate
      access_token: refreshJson.access_token,
      refresh_token: refreshJson.refresh_token || sessionData.refresh_token,
      token_type: refreshJson.token_type || 'Bearer',
      expires_in: refreshJson.expires_in || 0
    })
    res.redirect('/')
  } catch (e) { res.status(500).send(escapeHtml(String(e?.message || e))) }
})

// Revoke tokens (prefers refresh token; falls back to access token)
app.post('/revoke', async (req, res) => {
  const sid = getSid(req, res)
  const sessionData = mem.bySid.get(sid)
  const tokenToRevoke = sessionData?.refresh_token || sessionData?.access_token
  if (!tokenToRevoke) return res.redirect('/')
  try {
    await fetch(`${FRAY_BASE_URL}/oauth/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, token: tokenToRevoke })
    }).catch(() => { })
  } finally {
    mem.bySid.delete(sid)
    res.redirect('/')
  }
})

app.listen(Number(PORT), () => {
  console.log(`[fray-oauth-node] listening on http://localhost:${PORT}`)
})

function escapeHtml(s) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return String(s).replace(/[&<>"']/g, (c) => map[c])
}


