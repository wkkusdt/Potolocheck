<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$name    = trim($_POST['name']    ?? '');
$phone   = trim($_POST['phone']   ?? '');
$message = trim($_POST['message'] ?? '');

if (empty($name) || empty($phone)) {
    http_response_code(400);
    echo json_encode(['error' => 'Name and phone are required']);
    exit;
}

if (mb_strlen($name) > 100 || mb_strlen($phone) > 30) {
    http_response_code(400);
    echo json_encode(['error' => 'Field too long']);
    exit;
}

// Загружаем API-ключ из файла конфига
$config = @parse_ini_file(__DIR__ . '/.env.ini');
$resendApiKey = $config['RESEND_API_KEY'] ?? '';

if (empty($resendApiKey)) {
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error']);
    exit;
}

$safeName    = htmlspecialchars($name,    ENT_QUOTES | ENT_HTML5, 'UTF-8');
$safePhone   = htmlspecialchars($phone,   ENT_QUOTES | ENT_HTML5, 'UTF-8');
$safeMessage = htmlspecialchars($message, ENT_QUOTES | ENT_HTML5, 'UTF-8');

$html = "
<h2>Новая заявка с сайта ПотолоЧек</h2>
<p><strong>Имя:</strong> {$safeName}</p>
<p><strong>Телефон:</strong> {$safePhone}</p>
" . (!empty($message) ? "<p><strong>Комментарий:</strong> {$safeMessage}</p>" : "");

$ch = curl_init('https://api.resend.com/emails');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'from'    => 'PotoloCheck <onboarding@resend.dev>',
    'to'      => ['Potolochek63@gmail.com'],
    'subject' => "Новая заявка от {$safeName}",
    'html'    => $html
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $resendApiKey,
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email']);
}
