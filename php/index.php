<?php
// Fray OAuth PHP Example
// Gut lesbares, kommentiertes Minimalbeispiel für Authorization Code Flow mit PKCE.
<?php
session_start();
$cfg = require __DIR__ . '/config.php';
$loggedIn = isset($_SESSION['tokens']['access_token']);
$user = null;
if ($loggedIn) {
  $ch = curl_init(rtrim($cfg['FRAY_BASE_URL'], '/') . '/me');
  curl_setopt_array($ch, [
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $_SESSION['tokens']['access_token']],
    CURLOPT_RETURNTRANSFER => true,
  ]);
  $resp = curl_exec($ch);
  $user = json_decode($resp ?: 'null', true);
  curl_close($ch);
}
?>
<!doctype html>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Fray OAuth PHP Example</title>
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
      <h1>Fray OAuth PHP Example</h1>
      <p class="subtitle">Authorization Code Flow with PKCE</p>
    </header>
    <section class="card">
      <div class="row"><span class="label">Intents:</span> <code><?= htmlspecialchars($cfg['INTENTS']) ?></code></div>
      <div class="buttons">
        <a href="login.php" class="btn" aria-label="Login with Fray">Login with Fray</a>
        <form method="post" action="refresh.php" style="display:inline"><button type="submit" class="btn">Refresh Token</button></form>
        <form method="post" action="revoke.php" style="display:inline"><button type="submit" class="btn danger">Revoke Tokens</button></form>
      </div>
    </section>
    <section class="card">
      <h2>Status</h2>
      <p class="<?= $loggedIn ? 'status ok' : 'status warn' ?>"><?= $loggedIn ? 'Logged in' : 'Not logged in' ?></p>
      <?php if ($user): ?>
        <pre><?= htmlspecialchars(json_encode($user, JSON_PRETTY_PRINT)) ?></pre>
      <?php else: ?>
        <div class="label">No profile loaded.</div>
      <?php endif; ?>
    </section>
    <footer>FRAY_BASE_URL: <code><?= htmlspecialchars($cfg['FRAY_BASE_URL']) ?></code></footer>
  </div>
</body>


