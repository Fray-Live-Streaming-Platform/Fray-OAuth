<?php
session_start();
$config = require __DIR__ . '/config.php';
$tokenToRevoke = $_SESSION['tokens']['refresh_token'] ?? ($_SESSION['tokens']['access_token'] ?? null);
if ($tokenToRevoke) {
  $revokeRequestJson = json_encode([
    'client_id' => $config['CLIENT_ID'],
    'client_secret' => $config['CLIENT_SECRET'],
    'token' => $tokenToRevoke,
  ], JSON_UNESCAPED_SLASHES);
  $curl = curl_init(rtrim($config['FRAY_BASE_URL'], '/') . '/oauth/revoke');
  curl_setopt_array($curl, [
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $revokeRequestJson,
    CURLOPT_RETURNTRANSFER => true,
  ]);
  curl_exec($curl);
  curl_close($curl);
}
unset($_SESSION['tokens']);
header('Location: /index.php');
exit;


