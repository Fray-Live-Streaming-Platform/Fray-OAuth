<?php
session_start();
$config = require __DIR__ . '/config.php';

$authCode = $_GET['code'] ?? '';
$oauthState = $_GET['state'] ?? '';
if (!$authCode || !$oauthState || empty($_SESSION['oauth']) || $oauthState !== ($_SESSION['oauth']['state'] ?? '')) {
  http_response_code(400);
  echo 'Invalid state or code';
  exit;
}

$tokenRequestJson = json_encode([
  'grant_type' => 'authorization_code',
  'client_id' => $config['CLIENT_ID'],
  'client_secret' => $config['CLIENT_SECRET'],
  'code' => $authCode,
  'redirect_uri' => $config['REDIRECT_URI'],
  'code_verifier' => $_SESSION['oauth']['code_verifier'] ?? '',
], JSON_UNESCAPED_SLASHES);

$curl = curl_init(rtrim($config['FRAY_BASE_URL'], '/') . '/oauth/token');
curl_setopt_array($curl, [
  CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $tokenRequestJson,
  CURLOPT_RETURNTRANSFER => true,
]);
$responseBody = curl_exec($curl);
$httpStatus = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);
$tokenResponse = json_decode($responseBody ?: 'null', true) ?: [];

if ($httpStatus !== 200 || empty($tokenResponse['access_token'])) {
  http_response_code(400);
  echo '<pre>' . htmlspecialchars($responseBody ?: '') . '</pre>';
  exit;
}

$_SESSION['tokens'] = [
  'access_token' => $tokenResponse['access_token'],
  'refresh_token' => $tokenResponse['refresh_token'] ?? null,
  'token_type' => $tokenResponse['token_type'] ?? 'Bearer',
  'expires_in' => $tokenResponse['expires_in'] ?? 0,
];
unset($_SESSION['oauth']);

header('Location: /index.php');
exit;


