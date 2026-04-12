# Design Document: reg-ru-deployment

## Overview

Фича подготавливает лендинг «ПотолоЧек» к деплою на shared-хостинг рег.ру (Apache + PHP). Задача сводится к шести изменениям:

1. Создать `.htaccess` — маршрутизация, редиректы, заголовки безопасности, кэширование, gzip, запрет доступа к `.ini`.
2. Создать `.user.ini` — переопределение настроек PHP.
3. Обновить `index.html` — заменить относительные пути на root-relative.
4. Обновить `agreement.html` — то же самое.
5. Обновить `contact.php` — добавить `htmlspecialchars()` и валидацию длины полей.
6. Обновить `.gitignore` — добавить `.user.ini`, `dist/`, `build/`.

Никакой сборки, никаких зависимостей — только конфигурационные файлы и точечные правки существующего кода.

---

## Architecture

```
Public_Root (public_html/ или www/)
├── .htaccess          ← новый файл (Apache config)
├── .user.ini          ← новый файл (PHP config, не в git)
├── index.html         ← обновлён (root-relative пути)
├── agreement.html     ← обновлён (root-relative пути)
├── contact.php        ← обновлён (sanitization + length validation)
├── script.js          ← без изменений (уже использует /contact.php)
├── styles.css         ← без изменений
└── src/
    ├── 1.jpg … 8.jpg  ← без изменений
```

Поток HTTP-запроса:

```
Browser → Apache (.htaccess rules)
              ├── HTTP → 301 HTTPS redirect
              ├── /agreement → rewrite → agreement.html (200)
              ├── /agreement.html → 301 → /agreement
              ├── /*.ini → 403 Forbidden
              ├── /static assets → Cache-Control headers
              └── unknown path → fallback index.html (200)

Browser → POST /contact.php
              ├── method check (non-POST → 405)
              ├── length validation (fail → 400, no API call)
              ├── htmlspecialchars() sanitization
              └── Resend API curl
                    ├── 200 → {"success": true}
                    └── non-200 → {"error": "..."} 500
```

---

## Components and Interfaces

### `.htaccess`

Единственный файл конфигурации Apache. Содержит:

- `RewriteEngine On`
- HTTPS redirect (проверка `%{HTTPS} off`)
- Redirect `/agreement.html` → `/agreement` (301)
- Rewrite `/agreement` → `agreement.html` (внутренний, без изменения URL)
- Запрет доступа к `*.ini` (`FilesMatch`, `Require all denied`)
- Security headers через `<IfModule mod_headers.c>`
- Cache-Control по расширениям через `<FilesMatch>`
- gzip через `<IfModule mod_deflate.c>`
- `DirectoryIndex index.html`
- Fallback: `RewriteCond %{REQUEST_FILENAME} !-f`, `RewriteRule ^ index.html [L]`

### `.user.ini`

PHP-конфигурация уровня директории (поддерживается рег.ру):

```ini
display_errors = Off
log_errors = On
post_max_size = 8M
upload_max_filesize = 8M
default_charset = UTF-8
```

### `contact.php` — изменения

Добавляются две группы изменений:

**Валидация длины** (после существующей проверки на empty):
```php
if (mb_strlen($name) > 100 || mb_strlen($phone) > 30) {
    http_response_code(400);
    echo json_encode(['error' => 'Field too long']);
    exit;
}
```

**Санитизация перед вставкой в HTML**:
```php
$safeName    = htmlspecialchars($name,    ENT_QUOTES | ENT_HTML5, 'UTF-8');
$safePhone   = htmlspecialchars($phone,   ENT_QUOTES | ENT_HTML5, 'UTF-8');
$safeMessage = htmlspecialchars($message, ENT_QUOTES | ENT_HTML5, 'UTF-8');
```
Переменные `$safeName`, `$safePhone`, `$safeMessage` используются в `$html`.

### `index.html` — изменения

| Было | Станет |
|------|--------|
| `href="./styles.css"` | `href="/styles.css"` |
| `src="./script.js"` | `src="/script.js"` |
| `src="./src/N.jpg"` | `src="/src/N.jpg"` |

### `agreement.html` — изменения

| Было | Станет |
|------|--------|
| `href="./styles.css"` | `href="/styles.css"` |
| `src="./script.js"` | `src="/script.js"` |

### `.gitignore` — изменения

Добавить строки:
```
.user.ini
dist/
build/
```

---

## Data Models

Проект не использует базу данных. Единственная «модель данных» — POST-payload формы заявки:

```
name    : string, 1–100 символов, обязательное
phone   : string, 1–30 символов, обязательное
message : string, необязательное (длина не ограничена требованиями)
```

Ответ `contact.php`:

```
Success : { "success": true }           HTTP 200
Error   : { "error": "<message>" }      HTTP 400 | 405 | 500
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Большинство требований этой фичи — конфигурационные (`.htaccess`, `.user.ini`) или статические (пути в HTML). Они проверяются интеграционными и smoke-тестами. Однако логика `contact.php` содержит нетривиальные ветвления, которые хорошо покрываются property-based тестами: валидация входных данных, обработка ошибок API, санитизация.

### Property 1: Успешный ответ при валидных данных

*For any* непустой строки `name` длиной от 1 до 100 символов и непустой строки `phone` длиной от 1 до 30 символов, при условии что Resend API возвращает HTTP 200, `contact.php` SHALL вернуть JSON `{"success": true}` с HTTP 200.

**Validates: Requirements 4.6**

### Property 2: Ошибка 500 при сбое Resend API

*For any* валидных `name` и `phone`, если Resend API возвращает любой HTTP-статус, отличный от 200, `contact.php` SHALL вернуть JSON `{"error": "Failed to send email"}` с HTTP 500.

**Validates: Requirements 4.7**

### Property 3: Метод не POST → 405

*For any* HTTP-метода, отличного от POST (GET, PUT, DELETE, PATCH, HEAD, OPTIONS и т.д.), `contact.php` SHALL вернуть JSON `{"error": "Method not allowed"}` с HTTP 405.

**Validates: Requirements 4.8**

### Property 4: Content-Type всегда application/json

*For any* входящего запроса (любой метод, любые данные), `contact.php` SHALL установить заголовок `Content-Type: application/json` до любого вывода.

**Validates: Requirements 4.9**

### Property 5: Санитизация HTML-спецсимволов

*For any* строки `name`, `phone` или `message`, содержащей HTML-спецсимволы (`<`, `>`, `&`, `"`, `'`), тело письма, передаваемое в Resend API, SHALL содержать HTML-encoded версии этих символов (через `htmlspecialchars()`), а не сырые символы.

**Validates: Requirements 5.1**

### Property 6: Валидация длины полей

*For any* строки `name` длиной > 100 символов или строки `phone` длиной > 30 символов, а также для пустых значений этих полей, `contact.php` SHALL вернуть HTTP 400 с JSON-ошибкой и SHALL NOT выполнить запрос к Resend API.

**Validates: Requirements 5.2, 5.3, 5.4**

---

## Error Handling

| Сценарий | Поведение |
|----------|-----------|
| Метод не POST | HTTP 405, `{"error": "Method not allowed"}` |
| `name` или `phone` пустые | HTTP 400, `{"error": "Name and phone are required"}` |
| `name` > 100 или `phone` > 30 символов | HTTP 400, `{"error": "Field too long"}` |
| Resend API вернул не 200 | HTTP 500, `{"error": "Failed to send email"}` |
| curl-ошибка (сеть недоступна) | HTTP 500, `{"error": "Failed to send email"}` (httpCode = 0) |
| Запрос к `*.ini` файлу | HTTP 403 (Apache, `.htaccess`) |
| Запрос по HTTP (не HTTPS) | HTTP 301 redirect на HTTPS |
| Запрос к несуществующему URL | HTTP 200, отдаётся `index.html` |

---

## Testing Strategy

### Подход

Фича состоит преимущественно из конфигурационных файлов и точечных правок. Тестирование делится на три уровня:

**1. Smoke-тесты (статический анализ файлов)**

Проверяют наличие и содержимое конфигурационных файлов без запуска сервера:

- `.htaccess` содержит все необходимые директивы (`DirectoryIndex`, `RewriteEngine`, security headers, gzip, cache rules, `.ini` deny)
- `.user.ini` содержит все пять директив
- `index.html` не содержит `./styles.css`, `./script.js`, `./src/` — содержит `/styles.css`, `/script.js`, `/src/`
- `agreement.html` аналогично
- `script.js` содержит `fetch("/contact.php"`
- `.gitignore` содержит `.user.ini`, `dist/`, `build/`

**2. Интеграционные тесты (HTTP-запросы к задеплоенному сайту)**

Выполняются после деплоя на staging или production:

- `GET /agreement` → 200, тело содержит контент agreement.html
- `GET /agreement.html` → 301 → `/agreement`
- `GET /nonexistent-path` → 200, тело содержит контент index.html
- `GET http://...` → 301 → `https://...`
- `GET /styles.css` → заголовок `Cache-Control: public, max-age=31536000`
- `GET /index.html` → заголовок `Cache-Control: no-cache, must-revalidate`
- Любой ответ → заголовки `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- `GET /.user.ini` → 403

**3. Property-based тесты (логика contact.php)**

Используется библиотека [PHPUnit](https://phpunit.de/) + [eris](https://github.com/giorgiosironi/eris) (PHP property-based testing) или аналог. Минимум 100 итераций на каждый тест.

Каждый тест изолирует `contact.php` через мок curl-функций (переопределение в тестовом namespace).

| Тест | Property | Итераций |
|------|----------|----------|
| Валидные данные + Resend 200 → success | Property 1 | 100+ |
| Валидные данные + Resend non-200 → 500 | Property 2 | 100+ |
| Не-POST метод → 405 | Property 3 | 100+ |
| Любой запрос → Content-Type: application/json | Property 4 | 100+ |
| Спецсимволы в полях → htmlspecialchars в теле письма | Property 5 | 100+ |
| Длина name > 100 или phone > 30 → 400, нет API-вызова | Property 6 | 100+ |

Тег каждого теста: `Feature: reg-ru-deployment, Property N: <property_text>`

**Примечание по PBT**: property-based тесты применимы только к `contact.php`. Конфигурационные файлы (`.htaccess`, `.user.ini`) и HTML-файлы тестируются smoke/integration тестами, так как их корректность не зависит от вариации входных данных.
