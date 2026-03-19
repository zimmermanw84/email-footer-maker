# Email Footer Maker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Node.js web app that generates copy-pastable HTML and plain-text email footers by scraping brand colors, logo, and fonts from a company website.

**Architecture:** A Node.js Express server serves a single `index.html` frontend and exposes a `POST /scrape` endpoint. Scraping logic lives in a separate `scraper.js` module (pure functions) for testability. The frontend is vanilla HTML/CSS/JS with no build step. Requires Node 18+ (uses built-in `fetch`).

**Tech Stack:** Node.js 18+, Express 4, Cheerio 1, Jest 29

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Project metadata, scripts, dependencies |
| `.gitignore` | Ignore `node_modules/` |
| `scraper.js` | `extractBrandData(html, baseUrl)` — pure HTML parsing; `scrapeUrl(url)` — fetches + parses |
| `server.js` | Express server: `GET /` serves `index.html`, `POST /scrape` calls `scrapeUrl` |
| `index.html` | SPA: form, scrape call, footer preview panels, copy buttons |
| `tests/scraper.test.js` | Jest unit tests for brand data extraction logic |

---

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```
node_modules/
.superpowers/
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "email-footer-maker",
  "version": "1.0.0",
  "description": "Generate branded email footers from a company website",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "jest"
  },
  "dependencies": {
    "cheerio": "^1.0.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 4: Verify Jest works**

```bash
npx jest --version
```

Expected: prints Jest version (29.x.x).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: project setup with express, cheerio, jest"
```

---

### Task 2: Scraper Module (TDD)

**Files:**
- Create: `tests/scraper.test.js`
- Create: `scraper.js`

- [ ] **Step 1: Create `tests/scraper.test.js` with failing tests**

```js
const { extractBrandData } = require('../scraper');

describe('extractBrandData', () => {
  test('extracts primary color from theme-color meta tag', () => {
    const html = `<html><head><meta name="theme-color" content="#e63946"></head></html>`;
    const result = extractBrandData(html, 'https://example.com');
    expect(result.primaryColor).toBe('#e63946');
  });

  test('extracts primary color from CSS custom property when no theme-color', () => {
    const html = `<html><head><style>:root { --primary: #ff6b35; }</style></head></html>`;
    const result = extractBrandData(html, 'https://example.com');
    expect(result.primaryColor).toBe('#ff6b35');
  });

  test('falls back to default color when nothing found', () => {
    const html = `<html><head></head><body></body></html>`;
    const result = extractBrandData(html, 'https://example.com');
    expect(result.primaryColor).toBe('#1a1a1a');
  });

  test('extracts logo from og:image', () => {
    const html = `<html><head><meta property="og:image" content="https://example.com/logo.png"></head></html>`;
    const result = extractBrandData(html, 'https://example.com');
    expect(result.logo).toBe('https://example.com/logo.png');
  });

  test('extracts logo from apple-touch-icon when no og:image', () => {
    const html = `<html><head><link rel="apple-touch-icon" href="/apple-icon.png"></head></html>`;
    const result = extractBrandData(html, 'https://example.com');
    expect(result.logo).toBe('https://example.com/apple-icon.png');
  });

  test('returns null logo when nothing found', () => {
    const html = `<html><head></head></html>`;
    const result = extractBrandData(html, 'https://example.com');
    expect(result.logo).toBeNull();
  });

  test('extracts font family from Google Fonts link', () => {
    const html = `<html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet"></head></html>`;
    const result = extractBrandData(html, 'https://example.com');
    expect(result.fontFamily).toBe('Inter, system-ui, sans-serif');
  });

  test('falls back to system font when nothing found', () => {
    const html = `<html><head></head></html>`;
    const result = extractBrandData(html, 'https://example.com');
    expect(result.fontFamily).toBe('system-ui, sans-serif');
  });

  test('extracts company name from og:site_name', () => {
    const html = `<html><head><meta property="og:site_name" content="Acme Corp"></head></html>`;
    const result = extractBrandData(html, 'https://acme.com');
    expect(result.companyName).toBe('Acme Corp');
  });

  test('extracts company name from title tag, stripping tagline after pipe', () => {
    const html = `<html><head><title>Acme Corp | We Build Things</title></head></html>`;
    const result = extractBrandData(html, 'https://acme.com');
    expect(result.companyName).toBe('Acme Corp');
  });

  test('falls back to capitalized domain name', () => {
    const html = `<html><head></head></html>`;
    const result = extractBrandData(html, 'https://acmecorp.com');
    expect(result.companyName).toBe('Acmecorp');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/scraper.test.js
```

Expected: All tests FAIL with `Cannot find module '../scraper'`

- [ ] **Step 3: Create `scraper.js`**

```js
const cheerio = require('cheerio');

function extractBrandData(html, baseUrl) {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  return {
    primaryColor: extractColor($),
    logo: extractLogo($, base),
    fontFamily: extractFont($),
    companyName: extractCompanyName($, base),
  };
}

function extractColor($) {
  const themeColor = $('meta[name="theme-color"]').attr('content');
  if (themeColor && /^#[0-9a-f]{3,6}$/i.test(themeColor.trim())) {
    return themeColor.trim();
  }
  const styleContent = $('style').text();
  const cssVarMatch = styleContent.match(/--(?:primary|brand|accent|color)[^:]*:\s*(#[0-9a-f]{3,6})/i);
  if (cssVarMatch) return cssVarMatch[1];
  return '#1a1a1a';
}

function extractLogo($, base) {
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) return resolveUrl(ogImage, base);

  const appleIcon = $('link[rel="apple-touch-icon"]').attr('href');
  if (appleIcon) return resolveUrl(appleIcon, base);

  const icons = $('link[rel~="icon"]').toArray();
  const preferred = icons.find(el => {
    const href = $(el).attr('href') || '';
    return href.endsWith('.svg') || href.endsWith('.png');
  });
  if (preferred) return resolveUrl($(preferred).attr('href'), base);

  return null;
}

function extractFont($) {
  const fontsLink = $('link[href*="fonts.googleapis.com"]').attr('href');
  if (fontsLink) {
    const match = fontsLink.match(/family=([^:&]+)/);
    if (match) {
      const name = decodeURIComponent(match[1]).replace(/\+/g, ' ');
      return `${name}, system-ui, sans-serif`;
    }
  }
  return 'system-ui, sans-serif';
}

function extractCompanyName($, base) {
  const siteName = $('meta[property="og:site_name"]').attr('content');
  if (siteName) return siteName.trim();

  const title = $('title').text().trim();
  if (title) {
    const stripped = title.split(/\s*[|–-]\s*/)[0].trim();
    if (stripped) return stripped;
  }

  const domain = base.hostname.replace(/^www\./, '').split('.')[0];
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

function resolveUrl(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

async function scrapeUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  return extractBrandData(html, url);
}

module.exports = { extractBrandData, scrapeUrl };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/scraper.test.js
```

Expected: All 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper.js tests/scraper.test.js
git commit -m "feat: scraper module with brand data extraction (TDD)"
```

---

### Task 3: Express Server

**Files:**
- Create: `server.js`

- [ ] **Step 1: Create `server.js`**

```js
const express = require('express');
const path = require('path');
const { scrapeUrl } = require('./scraper');

const app = express();
const PORT = 3000;

app.use(express.json());
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const data = await scrapeUrl(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Email Footer Maker running at http://localhost:${PORT}`));
```

- [ ] **Step 2: Smoke test the `/scrape` endpoint**

In one terminal:

```bash
node server.js
```

Expected: `Email Footer Maker running at http://localhost:3000`

In a second terminal:

```bash
curl -s -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' | node -e "process.stdin|>JSON.parse|>console.log" 2>/dev/null || \
curl -s -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

Expected: JSON with keys `primaryColor`, `logo`, `fontFamily`, `companyName`.

Stop server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: express server with GET / and POST /scrape"
```

---

### Task 4: Frontend

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Footer Maker</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f3f4f6; color: #111; min-height: 100vh; padding: 32px 16px; }
    .container { max-width: 680px; margin: 0 auto; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
    .card { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    label { display: block; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 4px; }
    input { width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; outline: none; transition: border-color .15s; }
    input:focus { border-color: #6366f1; }
    button.primary { width: 100%; padding: 10px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s; }
    button.primary:hover { background: #4338ca; }
    button.primary:disabled { background: #a5b4fc; cursor: not-allowed; }
    button.copy { padding: 5px 12px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 5px; font-size: 12px; cursor: pointer; transition: background .15s; }
    button.copy:hover { background: #e5e7eb; }
    .status { padding: 10px 14px; border-radius: 6px; font-size: 12px; margin-bottom: 16px; display: none; }
    .status.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; display: block; }
    .status.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; display: block; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .section-label { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .5px; }
    #html-preview { padding: 14px; background: #fafafa; border: 1px solid #e5e7eb; border-radius: 6px; }
    #text-preview { font-family: monospace; font-size: 12px; color: #374151; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 5px; padding: 10px; line-height: 1.6; white-space: pre; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Email Footer Maker</h1>
    <p class="subtitle">Fill in your details — we'll scrape your company site for brand colors and logo.</p>

    <div class="card">
      <div class="grid">
        <div>
          <label for="url">Company Website URL</label>
          <input id="url" type="url" placeholder="https://acme.com">
        </div>
        <div>
          <label for="name">Full Name</label>
          <input id="name" type="text" placeholder="Alex Johnson">
        </div>
        <div>
          <label for="title">Title</label>
          <input id="title" type="text" placeholder="Senior Designer">
        </div>
        <div>
          <label for="phone">Phone Number</label>
          <input id="phone" type="text" placeholder="(555) 123-4567">
        </div>
      </div>
      <button class="primary" id="generate-btn" onclick="generate()">✨ Generate Footer</button>
    </div>

    <div class="status" id="status"></div>

    <div class="card hidden" id="html-card">
      <div class="section-header">
        <span class="section-label">HTML Footer Preview</span>
        <button class="copy" onclick="copyHtml(this)">Copy HTML</button>
      </div>
      <div id="html-preview"></div>
    </div>

    <div class="card hidden" id="text-card">
      <div class="section-header">
        <span class="section-label">Plain Text Footer</span>
        <button class="copy" onclick="copyText(this)">Copy Text</button>
      </div>
      <div id="text-preview"></div>
    </div>
  </div>

  <script>
    let generatedHtml = '';
    let generatedText = '';

    async function generate() {
      const url = document.getElementById('url').value.trim();
      const name = document.getElementById('name').value.trim();
      const title = document.getElementById('title').value.trim();
      const phone = document.getElementById('phone').value.trim();

      if (!url || !name || !title || !phone) {
        showStatus('error', 'Please fill in all fields.');
        return;
      }

      const btn = document.getElementById('generate-btn');
      btn.disabled = true;
      btn.textContent = 'Scraping…';
      hideResults();

      let brand = { primaryColor: '#1a1a1a', logo: null, fontFamily: 'system-ui, sans-serif', companyName: '' };

      try {
        const res = await fetch('/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        brand = await res.json();
        const domain = new URL(url).hostname.replace(/^www\./, '');
        showStatus('success', `✓ Scraped ${domain} — color ${brand.primaryColor}, font "${brand.fontFamily.split(',')[0]}"${brand.logo ? ', logo found' : ', no logo'}`);
      } catch (err) {
        showStatus('error', `⚠ Could not scrape site (${err.message}) — using defaults.`);
      }

      const domain = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();
      generatedHtml = buildHtmlFooter({ name, title, phone, url, domain, brand });
      generatedText = buildTextFooter({ name, title, phone, url, domain, brand });

      document.getElementById('html-preview').innerHTML = generatedHtml;
      document.getElementById('text-preview').textContent = generatedText;
      document.getElementById('html-card').classList.remove('hidden');
      document.getElementById('text-card').classList.remove('hidden');

      btn.disabled = false;
      btn.textContent = '✨ Generate Footer';
    }

    function buildHtmlFooter({ name, title, phone, url, domain, brand }) {
      const { primaryColor, logo, fontFamily, companyName } = brand;
      const logoHtml = logo
        ? `<img src="${logo}" width="40" height="40" style="border-radius:6px;object-fit:contain;flex-shrink:0;" alt="${companyName} logo">`
        : '';
      return `<div style="border-top:3px solid ${primaryColor};padding-top:12px;font-family:${fontFamily};">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
    ${logoHtml}
    <div>
      <div style="font-weight:700;font-size:14px;color:#111;">${name}</div>
      <div style="font-size:12px;color:#555;">${title}</div>
    </div>
  </div>
  <div style="border-top:1px solid #e5e7eb;padding-top:8px;font-size:11px;color:#888;">
    🏢 ${companyName} &nbsp;·&nbsp; 📞 ${phone} &nbsp;·&nbsp; <a href="${url}" style="color:${primaryColor};text-decoration:none;">🌐 ${domain}</a>
  </div>
</div>`;
    }

    function buildTextFooter({ name, title, phone, url, domain, brand }) {
      return `--\n${name} | ${title}\n${brand.companyName}\n${phone} | ${domain}`;
    }

    async function copyHtml(btn) {
      try {
        await navigator.clipboard.writeText(generatedHtml);
        flashCopy(btn, 'Copied!');
      } catch {
        fallbackCopy(generatedHtml);
      }
    }

    async function copyText(btn) {
      try {
        await navigator.clipboard.writeText(generatedText);
        flashCopy(btn, 'Copied!');
      } catch {
        fallbackCopy(generatedText);
      }
    }

    function flashCopy(btn, msg) {
      const orig = btn.textContent;
      btn.textContent = msg;
      setTimeout(() => btn.textContent = orig, 1500);
    }

    function fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    function showStatus(type, msg) {
      const el = document.getElementById('status');
      el.className = `status ${type}`;
      el.textContent = msg;
    }

    function hideResults() {
      document.getElementById('html-card').classList.add('hidden');
      document.getElementById('text-card').classList.add('hidden');
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: Start the server and open the app**

```bash
node server.js
```

Open http://localhost:3000. Expected: form renders with four fields and "Generate Footer" button.

- [ ] **Step 3: End-to-end smoke test**

Fill in the form:
- URL: `https://stripe.com` (or any live site)
- Name: `Alex Johnson`
- Title: `Senior Designer`
- Phone: `(555) 123-4567`

Click "Generate Footer". Expected:
- Status bar shows scrape result (color, font, logo presence)
- HTML preview renders the two-row footer with brand accent bar and logo
- Plain text preview shows `--\nAlex Johnson | Senior Designer\n...`
- "Copy HTML" button copies the raw HTML string to clipboard
- "Copy Text" button copies the plain text to clipboard

Stop the server with Ctrl+C.

- [ ] **Step 4: Run full test suite**

```bash
npx jest
```

Expected: All 11 tests PASS, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: frontend SPA with footer preview and copy buttons"
```
