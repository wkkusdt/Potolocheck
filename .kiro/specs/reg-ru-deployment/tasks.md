# Implementation Plan: reg-ru-deployment

## Overview

Подготовка лендинга «ПотолоЧек» к деплою на shared-хостинг рег.ру: создание конфигурационных файлов, точечные правки HTML и PHP, обновление `.gitignore`.

## Tasks

- [x] 1. Создать `.htaccess`
  - Создать файл `.htaccess` в корне проекта
  - Добавить `RewriteEngine On` и `DirectoryIndex index.html`
  - Добавить HTTPS-редирект: `%{HTTPS} off` → 301 на `https://`
  - Добавить редирект `/agreement.html` → `/agreement` (301)
  - Добавить внутренний rewrite `/agreement` → `agreement.html` (без изменения URL)
  - Добавить fallback: `RewriteCond %{REQUEST_FILENAME} !-f` + `RewriteRule ^ index.html [L]`
  - Добавить запрет доступа к `*.ini` через `<FilesMatch "\.ini$">` + `Require all denied`
  - Добавить security headers через `<IfModule mod_headers.c>`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`
  - Добавить `Cache-Control: public, max-age=31536000` для `.jpg`, `.css`, `.js`
  - Добавить `Cache-Control: no-cache, must-revalidate` для `.html`
  - Добавить gzip через `<IfModule mod_deflate.c>` для `text/html`, `text/css`, `application/javascript`, `image/svg+xml`
  - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.5_

- [x] 2. Создать `.user.ini`
  - Создать файл `.user.ini` в корне проекта
  - Добавить: `display_errors = Off`, `log_errors = On`, `post_max_size = 8M`, `upload_max_filesize = 8M`, `default_charset = UTF-8`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Обновить `index.html` — root-relative пути
  - Заменить `href="./styles.css"` → `href="/styles.css"`
  - Заменить `src="./script.js"` → `src="/script.js"`
  - Заменить все `src="./src/N.jpg"` → `src="/src/N.jpg"` (8 изображений: 1.jpg–8.jpg)
  - _Requirements: 6.1, 6.2_

- [x] 4. Обновить `agreement.html` — root-relative пути
  - Заменить `href="./styles.css"` → `href="/styles.css"`
  - Заменить `src="./script.js"` → `src="/script.js"`
  - _Requirements: 6.3_

- [x] 5. Обновить `contact.php` — валидация и санитизация
  - [x] 5.1 Добавить валидацию длины полей после существующей проверки на empty
    - Добавить проверку `mb_strlen($name) > 100 || mb_strlen($phone) > 30`
    - При провале: `http_response_code(400)`, `json_encode(['error' => 'Field too long'])`, `exit`
    - _Requirements: 5.2, 5.3, 5.4_
  - [x] 5.2 Добавить санитизацию через `htmlspecialchars()`
    - Объявить `$safeName = htmlspecialchars($name, ENT_QUOTES | ENT_HTML5, 'UTF-8')`
    - Объявить `$safePhone = htmlspecialchars($phone, ENT_QUOTES | ENT_HTML5, 'UTF-8')`
    - Объявить `$safeMessage = htmlspecialchars($message, ENT_QUOTES | ENT_HTML5, 'UTF-8')`
    - Заменить `{$name}`, `{$phone}`, `{$message}` в `$html` на `{$safeName}`, `{$safePhone}`, `{$safeMessage}`
    - _Requirements: 5.1_
  - [ ]* 5.3 Написать property-тест: Property 6 — валидация длины полей
    - **Property 6: Длина name > 100 или phone > 30 → HTTP 400, нет вызова Resend API**
    - Использовать PHPUnit + eris (или аналог), мокировать curl-функции через namespace override
    - Минимум 100 итераций; генерировать строки длиной > 100 для name и > 30 для phone
    - **Validates: Requirements 5.2, 5.3, 5.4**
  - [ ]* 5.4 Написать property-тест: Property 5 — санитизация HTML-спецсимволов
    - **Property 5: Спецсимволы в полях → htmlspecialchars в теле письма**
    - Генерировать строки с `<`, `>`, `&`, `"`, `'`; проверять, что в payload Resend API нет сырых символов
    - **Validates: Requirements 5.1**
  - [ ]* 5.5 Написать property-тесты: Properties 1–4 — базовое поведение contact.php
    - **Property 1:** Валидные данные + Resend 200 → `{"success": true}` HTTP 200
    - **Property 2:** Валидные данные + Resend non-200 → `{"error": "Failed to send email"}` HTTP 500
    - **Property 3:** Не-POST метод → `{"error": "Method not allowed"}` HTTP 405
    - **Property 4:** Любой запрос → заголовок `Content-Type: application/json`
    - **Validates: Requirements 4.6, 4.7, 4.8, 4.9**

- [x] 6. Обновить `.gitignore`
  - Добавить строку `.user.ini`
  - Добавить строку `dist/`
  - Добавить строку `build/`
  - Сохранить существующие записи (`node_modules/`, `.vscode/`, `.DS_Store`)
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 7. Checkpoint — финальная проверка
  - Убедиться, что все файлы созданы/обновлены корректно
  - Убедиться, что `.user.ini` присутствует в `.gitignore`
  - Убедиться, что в `index.html` и `agreement.html` нет путей с `./`
  - Убедиться, что `contact.php` содержит валидацию длины и `htmlspecialchars()`
  - Убедиться, что все тесты проходят, задать вопросы при необходимости

## Notes

- Задачи с `*` опциональны и могут быть пропущены для быстрого MVP
- Property-тесты (5.3–5.5) требуют PHPUnit + eris или аналогичной PBT-библиотеки для PHP
- `.user.ini` не должен попасть в git — это обеспечивается задачей 6
- Порядок выполнения: 1 → 2 → 3 → 4 → 5 → 6 → 7
