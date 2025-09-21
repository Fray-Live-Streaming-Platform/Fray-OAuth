<?php
session_start();
$config = require __DIR__ . '/config.php';
$currentRefreshToken = $_SESSION['tokens']['refresh_token'] ?? null;
if (!$currentRefreshToken) { header('Location: /index.php'); exit; }

$refreshRequestJson = json_encode([
  'grant_type' => 'refresh_token',
  'client_id' => $config['CLIENT_ID'],
  'client_secret' => $config['CLIENT_SECRET'],
  'refresh_token' => $currentRefreshToken,
], JSON_UNESCAPED_SLASHES);

$curl = curl_init(rtrim($config['FRAY_BASE_URL'], '/') . '/oauth/token');
curl_setopt_array($curl, [
  CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $refreshRequestJson,
  CURLOPT_RETURNTRANSFER => true,
]);
$responseBody = curl_exec($curl);
$httpStatus = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);
$tokenResponse = json_decode($responseBody ?: 'null', true) ?: [];

if ($httpStatus === 200 && !empty($tokenResponse['access_token'])) {
  $_SESSION['tokens']['access_token'] = $tokenResponse['access_token'];
  if (!empty($tokenResponse['refresh_token'])) $_SESSION['tokens']['refresh_token'] = $tokenResponse['refresh_token'];
}
header('Location: /index.php');
exit;


