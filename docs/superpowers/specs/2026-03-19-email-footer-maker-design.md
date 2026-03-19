# Email Footer Maker — Design Spec

**Date:** 2026-03-19

## Overview

A personal-use local web tool that generates copy-pastable email footers from user-provided contact details and brand information scraped from the company's website. Outputs both a styled HTML footer and a plain text footer.

## Inputs

| Field | Description |
|---|---|
| Company Website URL | Used for brand scraping; also displayed as a link in the footer |
| Full Name | Person's display name |
| Title | Job title |
| Phone Number | Contact phone |

Company name is derived from the scraped website (e.g., `og:site_name` or domain name).

## Output

Two formats generated simultaneously:

**HTML footer** — Two-row layout:
- Row 1: Logo image + Name + Title
- Row 2 (separated by a thin horizontal rule): Company · Phone · Website link
- Brand accent: colored top border using the scraped primary color
- Logo rendered as an `<img>` tag pointing to the scraped logo URL

**Plain text footer:**
```
--
Name | Title
Company
Phone | Website
```

Both outputs are displayed in live preview panels with a "Copy" button each.

## Architecture

Two files. No build step.

### `server.js`

Node.js + Express server. Start with `node server.js`, runs on `http://localhost:3000`.

**Routes:**
- `GET /` — serves `index.html`
- `POST /scrape` — accepts `{ url: string }`, returns `{ primaryColor, logo, fontFamily, companyName }`

**Dependencies:** `express`, `node-fetch`, `cheerio`

### `index.html`

Single-page app. Vanilla HTML/CSS/JS — no framework, no build step.

- Form with four fields + Generate button
- Calls `POST /scrape` on submit
- Renders HTML footer preview and plain text preview
- Two "Copy" buttons using `navigator.clipboard.writeText()`
- Status bar shows scrape success/failure

## Scraping Strategy

Executed server-side (avoids CORS). Graceful degradation at each step:

**Primary color:**
1. `<meta name="theme-color" content="...">`
2. First CSS custom property matching `/--(?:primary|brand|accent|color)/`
3. Fall back to `#1a1a1a`

**Logo:**
1. `<meta property="og:image">`
2. `<link rel="apple-touch-icon">`
3. `<link rel="icon">` (prefer `.svg` or `.png` over `.ico`)
4. No logo (footer renders without image)

**Font family:**
1. Google Fonts `<link>` href — extract family name
2. CSS `font-family` on `body` element
3. Fall back to `system-ui, sans-serif`

**Company name:**
1. `<meta property="og:site_name">`
2. `<title>` tag (strip taglines after `|`, `–`, `-`)
3. Fall back to domain name (e.g., `acme.com` → `Acme`)

## Footer HTML Template

The `<img>` tag is only included when a logo URL was found during scraping. When `logo` is `null`, omit it entirely — the name/title div renders flush to the left.

The emoji characters (🏢, 📞, 🌐) are intentional — they are part of the footer design and will appear literally in pasted email footers.

The scraped `fontFamily` is applied as a CSS `font-family` value but is not loaded via a `<link>` tag in the generated footer snippet. Email clients that don't have the font installed will fall back to their default sans-serif — this is acceptable for a personal tool.

```html
<div style="border-top: 3px solid {primaryColor}; padding-top: 12px; font-family: {fontFamily};">
  <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
    <!-- Only include img tag when logo is not null -->
    <img src="{logo}" width="40" height="40" style="border-radius:6px;" alt="{companyName} logo">
    <div>
      <div style="font-weight:700; font-size:14px; color:#111;">{name}</div>
      <div style="font-size:12px; color:#555;">{title}</div>
    </div>
  </div>
  <div style="border-top:1px solid #e5e7eb; padding-top:8px; font-size:11px; color:#888;">
    🏢 {companyName} &nbsp;·&nbsp; 📞 {phone} &nbsp;·&nbsp;
    <a href="{url}" style="color:{primaryColor};">🌐 {domain}</a>
  </div>
</div>
```

## Error Handling

- Scrape failure (network error, non-200 response): show error in status bar, allow user to proceed with defaults
- Partial scrape (some fields missing): use fallbacks silently, no error shown
- Copy failure (clipboard API unavailable): fall back to selecting the text in a `<textarea>`

## File Structure

```
email-footer-maker/
├── server.js
├── index.html
└── package.json
```

## Running the Tool

```bash
npm install
node server.js
# Open http://localhost:3000
```
