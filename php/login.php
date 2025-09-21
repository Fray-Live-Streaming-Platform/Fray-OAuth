<?php
session_start();
$config = require __DIR__ . '/config.php';

function base64url($input) { return rtrim(strtr(base64_encode($input), '+/', '-_'), '='); }
$pkceVerifier = base64url(random_bytes(64));
$pkceChallenge = base64url(hash('sha256', $pkceVerifier, true));
$oauthState = substr(base64url(random_bytes(24)), 0, 24);

$_SESSION['oauth'] = ['code_verifier' => $pkceVerifier, 'state' => $oauthState];

$query = http_build_query([
  'response_type' => 'code',
  'client_id' => $config['CLIENT_ID'],
  'redirect_uri' => $config['REDIRECT_URI'],
  'intents' => $config['INTENTS'],
  'state' => $oauthState,
  'code_challenge' => $pkceChallenge,
  'code_challenge_method' => 'S256',
]);
header('Location: ' . rtrim($config['FRAY_BASE_URL'], '/') . '/oauth/authorize?' . $query);
exit;


