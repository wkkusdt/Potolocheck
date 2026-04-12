# Requirements Document

## Introduction

Проект «ПотолоЧек» — лендинг компании по установке натяжных потолков в Самарской области. Сайт состоит из статических файлов (HTML, CSS, JS) и одного PHP-скрипта для обработки формы заявки. Цель фичи — подготовить и адаптировать структуру проекта для корректного деплоя на shared-хостинг рег.ру (reg.ru): правильная организация файлов, конфигурация сервера через `.htaccess`, настройка PHP-окружения, обеспечение безопасности и корректной маршрутизации URL.

## Glossary

- **Deployment_Package** — набор файлов, готовых к загрузке на хостинг рег.ру через FTP/SFTP или файловый менеджер панели управления.
- **Public_Root** — корневая директория сайта на хостинге рег.ру (`public_html/` или `www/`), из которой сервер отдаёт файлы.
- **Htaccess** — файл конфигурации Apache `.htaccess`, управляющий правилами маршрутизации, редиректами и заголовками безопасности.
- **Contact_Form** — PHP-скрипт `contact.php`, принимающий POST-запросы от формы заявки и отправляющий email через Resend API.
- **Static_Assets** — файлы `styles.css`, `script.js` и изображения в папке `src/`.
- **Node_Modules** — директория зависимостей Node.js, не предназначенная для загрузки на хостинг.
- **Resend_API** — внешний сервис отправки email, используемый в `contact.php`.
- **PHP_INI** — файл `php.ini` или `.user.ini` для переопределения настроек PHP на уровне директории.

---

## Requirements

### Requirement 1: Структура файлов для деплоя

**User Story:** As a developer, I want a clean deployment file structure, so that only necessary files are uploaded to the hosting and the site works correctly from the public root.

#### Acceptance Criteria

1. THE Deployment_Package SHALL include only the following files: `index.html`, `agreement.html`, `contact.php`, `script.js`, `styles.css`, and the `src/` directory with images.
2. THE Deployment_Package SHALL NOT include `node_modules/`, `package.json`, `package-lock.json`, `.gitignore`, `.git/`, `.vscode/`, and `.kiro/` directories.
3. WHEN the Deployment_Package is uploaded to Public_Root, THE Static_Assets SHALL be accessible at their respective URLs without additional configuration.
4. THE Deployment_Package SHALL include a `.htaccess` file placed in Public_Root.

---

### Requirement 2: Конфигурация .htaccess — маршрутизация и URL

**User Story:** As a developer, I want correct URL routing configured via .htaccess, so that clean URLs like `/agreement` work without `.html` extension and the site behaves consistently.

#### Acceptance Criteria

1. WHEN a request is made to `/agreement`, THE Htaccess SHALL internally rewrite the request to `agreement.html` without changing the URL in the browser.
2. WHEN a request is made to `/agreement.html` directly, THE Htaccess SHALL redirect the browser to `/agreement` with HTTP 301 status.
3. WHEN a request is made to a non-existent URL, THE Htaccess SHALL serve `index.html` as the fallback response with HTTP 200 status.
4. WHEN a request is made over HTTP (non-HTTPS), THE Htaccess SHALL redirect the browser to the HTTPS version of the same URL with HTTP 301 status.
5. THE Htaccess SHALL set `DirectoryIndex` to `index.html` as the default document.

---

### Requirement 3: Конфигурация .htaccess — заголовки безопасности и производительность

**User Story:** As a developer, I want security headers and caching rules configured, so that the site is protected from common attacks and static assets are cached by browsers.

#### Acceptance Criteria

1. THE Htaccess SHALL set the `X-Content-Type-Options: nosniff` response header for all requests.
2. THE Htaccess SHALL set the `X-Frame-Options: SAMEORIGIN` response header for all requests.
3. THE Htaccess SHALL set the `Referrer-Policy: strict-origin-when-cross-origin` response header for all requests.
4. WHEN a request is made for files with extensions `.jpg`, `.css`, or `.js`, THE Htaccess SHALL set the `Cache-Control` header to `public, max-age=31536000` (1 year).
5. WHEN a request is made for files with extension `.html`, THE Htaccess SHALL set the `Cache-Control` header to `no-cache, must-revalidate`.
6. WHERE the Apache `mod_deflate` module is available, THE Htaccess SHALL enable gzip compression for `text/html`, `text/css`, `application/javascript`, and `image/svg+xml` MIME types.

---

### Requirement 4: Настройка PHP-окружения

**User Story:** As a developer, I want PHP configured correctly for the hosting environment, so that contact.php works reliably and securely on reg.ru shared hosting.

#### Acceptance Criteria

1. THE Deployment_Package SHALL include a `.user.ini` file in Public_Root with PHP configuration overrides.
2. THE PHP_INI SHALL set `display_errors = Off` to prevent error output to the browser.
3. THE PHP_INI SHALL set `log_errors = On` to enable error logging.
4. THE PHP_INI SHALL set `post_max_size = 8M` and `upload_max_filesize = 8M`.
5. THE PHP_INI SHALL set `default_charset = UTF-8`.
6. WHEN `contact.php` receives a POST request with valid `name` and `phone` fields, THE Contact_Form SHALL send an HTTP request to the Resend API and return a JSON response `{"success": true}` with HTTP 200 status.
7. IF the Resend API returns a non-200 HTTP status, THEN THE Contact_Form SHALL return a JSON response `{"error": "Failed to send email"}` with HTTP 500 status.
8. IF `contact.php` receives a request with an HTTP method other than POST, THEN THE Contact_Form SHALL return a JSON response `{"error": "Method not allowed"}` with HTTP 405 status.
9. THE Contact_Form SHALL set the `Content-Type: application/json` response header before any output.

---

### Requirement 5: Безопасность Contact_Form

**User Story:** As a developer, I want the contact form PHP script to be hardened against common attacks, so that the hosting account and user data are protected.

#### Acceptance Criteria

1. WHEN `contact.php` processes input fields `name`, `phone`, and `message`, THE Contact_Form SHALL sanitize each field using `htmlspecialchars()` before including it in the email HTML body.
2. THE Contact_Form SHALL validate that the `name` field is not empty and does not exceed 100 characters.
3. THE Contact_Form SHALL validate that the `phone` field is not empty and does not exceed 30 characters.
4. IF any validation check fails, THEN THE Contact_Form SHALL return HTTP 400 with a JSON error response and SHALL NOT send a request to the Resend API.
5. THE Htaccess SHALL deny direct HTTP access to any file with a `.ini` extension to prevent exposure of PHP configuration.

---

### Requirement 6: Корректность ссылок и путей в HTML-файлах

**User Story:** As a developer, I want all internal links and asset paths to work correctly on the hosting, so that navigation and resources load without errors.

#### Acceptance Criteria

1. THE `index.html` SHALL reference `styles.css` and `script.js` using root-relative paths (`/styles.css`, `/script.js`) instead of relative paths (`./styles.css`, `./script.js`).
2. THE `index.html` SHALL reference all images in `src/` using root-relative paths (e.g., `/src/1.jpg`).
3. THE `agreement.html` SHALL reference `styles.css` and `script.js` using root-relative paths.
4. THE `script.js` SHALL send the contact form POST request to `/contact.php` (root-relative path).
5. WHEN a user navigates to `/agreement` from the footer link in `index.html`, THE browser SHALL display `agreement.html` content without a 404 error.

---

### Requirement 7: Файл .gitignore и исключение артефактов деплоя

**User Story:** As a developer, I want a .gitignore that excludes deployment artifacts, so that sensitive config files and build outputs are not committed to the repository.

#### Acceptance Criteria

1. THE `.gitignore` SHALL include an entry to exclude `.user.ini` from version control.
2. THE `.gitignore` SHALL include an entry to exclude any future `dist/` or `build/` output directories.
3. THE `.gitignore` SHALL retain existing entries for `node_modules/` and other already-ignored paths.
