<?php
/**
 * Send & Sign — demo request form handler (Hostinger PHP).
 *
 * Receives the /contact form (fetch or plain POST), validates it, and emails the
 * request to the sales inbox with Reply-To set to the visitor.
 *
 * Hostinger only delivers PHP mail() when the From address is a mailbox that
 * exists on this domain, so FROM_ADDRESS must be a real Hostinger mailbox.
 */

declare(strict_types=1);

const TO_ADDRESS   = 'floris@sendandsign.online';
const FROM_ADDRESS = 'floris@sendandsign.online';
const FROM_NAME    = 'Send & Sign website';
const MIN_SECONDS  = 3;    // faster than this = almost certainly a bot
const RATE_LIMIT   = 5;    // submissions per IP ...
const RATE_WINDOW  = 3600; // ... per hour

$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function respond(bool $ok, string $error = '', int $status = 200): void
{
    global $wantsJson;
    http_response_code($status);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error]);
    } else {
        // No-JS fallback: back to the contact page with a status flag
        header('Location: /contact?' . ($ok ? 'sent=1' : 'error=1'), true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(false, 'Method not allowed.', 405);
}

// Only accept posts from our own pages
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !preg_match('#^https://(www\.)?sendandsign\.online$#', $origin)) {
    respond(false, 'Invalid origin.', 403);
}

// Spam traps: hidden honeypot must be empty, and the form must not be submitted instantly.
// Bots get a fake success so they don't retry.
if (trim((string)($_POST['website'] ?? '')) !== '') {
    respond(true);
}
$started = (int)($_POST['started'] ?? 0);
if ($started > 0 && (time() - intdiv($started, 1000)) < MIN_SECONDS) {
    respond(true);
}

// Simple per-IP rate limit (file in the server temp dir)
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile = sys_get_temp_dir() . '/sas-contact-' . hash('sha256', $ip);
$hits = [];
if (is_file($rlFile)) {
    $hits = array_filter(
        array_map('intval', explode(',', (string)file_get_contents($rlFile))),
        fn($t) => $t > time() - RATE_WINDOW
    );
}
if (count($hits) >= RATE_LIMIT) {
    respond(false, 'Too many requests. Please try again later, or email ' . TO_ADDRESS . '.', 429);
}

/** Single-line field: trimmed, length-capped, no line breaks (prevents header injection). */
function field(string $key, int $max = 200): string
{
    $v = trim((string)($_POST[$key] ?? ''));
    $v = preg_replace('/[\r\n\t]+/', ' ', $v) ?? '';
    return mb_substr($v, 0, $max);
}

$data = [
    'Name'                    => field('name', 120),
    'Work email'              => field('email', 254),
    'Company'                 => field('company', 160),
    'Country'                 => field('country', 60),
    'State or territory'      => field('state', 60),
    'Microsoft 365 users'     => field('tenant_size', 40),
    'Documents per month'     => field('monthly_volume', 40),
    'Interested in Claude'    => field('claude_studio', 10),
    'Interested in'           => field('intent', 40),
];
$message = mb_substr(trim((string)($_POST['message'] ?? '')), 0, 4000);

foreach (['Name', 'Work email', 'Company', 'Country', 'State or territory',
          'Microsoft 365 users', 'Documents per month', 'Interested in Claude'] as $req) {
    if ($data[$req] === '') {
        respond(false, 'Please fill in all required fields.', 422);
    }
}
$email = filter_var($data['Work email'], FILTER_VALIDATE_EMAIL);
if ($email === false) {
    respond(false, 'Please enter a valid email address.', 422);
}

$intentLabels = [
    'demo' => 'A demo', 'pilot' => 'Starting a 14-day pilot',
    'claude' => 'Tier 3 (Transform with Claude)', 'custom' => 'Custom branding / volume',
    'dedicated' => 'Custom Implementation (own Azure)', 'enterprise' => 'Enterprise roadmap',
];
$data['Interested in'] = $intentLabels[$data['Interested in']] ?? ($data['Interested in'] ?: 'A demo');
$data['Interested in Claude'] = $data['Interested in Claude'] === 'yes' ? 'Yes — interactive proposals' : 'No — PDF signing only';

// Build the email
$subject = 'Demo request: ' . $data['Company'] . ' (' . $data['Name'] . ')';
$lines = ["New demo request from sendandsign.online/contact", ''];
foreach ($data as $label => $value) {
    $lines[] = str_pad($label . ':', 24) . $value;
}
$lines[] = '';
$lines[] = 'Message:';
$lines[] = $message !== '' ? $message : '(none)';
$lines[] = '';
$lines[] = '—';
$lines[] = 'Submitted ' . gmdate('Y-m-d H:i') . ' UTC from ' . $ip;
$body = implode("\r\n", $lines);

$encode = fn(string $s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
$replyName = str_replace(['"', '\\'], '', $data['Name']);
$headers = [
    'From: ' . $encode(FROM_NAME) . ' <' . FROM_ADDRESS . '>',
    'Reply-To: ' . $encode($replyName) . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: SendAndSign-Website',
];

$sent = mail(TO_ADDRESS, $encode($subject), $body, implode("\r\n", $headers), '-f' . FROM_ADDRESS);

if (!$sent) {
    error_log('contact-submit: mail() failed for ' . $email);
    respond(false, 'Sorry, your request could not be sent. Please email ' . TO_ADDRESS . ' directly.', 500);
}

$hits[] = time();
@file_put_contents($rlFile, implode(',', $hits), LOCK_EX);
respond(true);
