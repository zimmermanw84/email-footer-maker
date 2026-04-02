# Image Upload Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tab toggle to `index.html` that lets users upload a logo image instead of providing a website URL, extracting the dominant brand color client-side via the Canvas API.

**Architecture:** All changes are confined to `index.html`. A new `activeMode` variable (`'url'` | `'image'`) controls which input is shown and which branch `generate()` takes. A new `extractColorFromImage(file)` async function handles Canvas-based color extraction. Both modes produce the same brand object shape, so `buildHtmlFooter` and `buildTextFooter` are unchanged.

**Tech Stack:** Vanilla HTML/CSS/JS, Canvas API (`HTMLCanvasElement.getContext('2d')`), `FileReader` API. No new npm packages.

---

### Task 1: Add tab toggle HTML and CSS

**Files:**
- Modify: `index.html` (CSS block and form card HTML)

- [ ] **Step 1: Add tab styles to the `<style>` block**

Insert after the `.hidden { display: none; }` rule:

```css
.tabs { display: flex; gap: 0; margin-bottom: 12px; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
.tab-btn { flex: 1; padding: 7px 0; font-size: 12px; font-weight: 600; background: white; border: none; cursor: pointer; color: #6b7280; transition: background .15s, color .15s; }
.tab-btn.active { background: #4f46e5; color: white; }
.tab-btn:first-child { border-right: 1px solid #d1d5db; }
.helper-note { font-size: 11px; color: #9ca3af; margin-top: 4px; }
input.error { border-color: #f87171; }
```

- [ ] **Step 2: Replace the URL input div with a togglable input area**

Replace this block inside `.card`:
```html
      <div class="grid">
        <div>
          <label for="url">Company Website URL</label>
          <input id="url" type="url" placeholder="https://acme.com">
        </div>
```

With:
```html
      <div class="tabs">
        <button class="tab-btn active" id="tab-url" onclick="setMode('url')">Website URL</button>
        <button class="tab-btn" id="tab-image" onclick="setMode('image')">Upload Image</button>
      </div>
      <div class="grid">
        <div>
          <div id="url-input-wrap">
            <label for="url">Company Website URL</label>
            <input id="url" type="url" placeholder="https://acme.com">
          </div>
          <div id="image-input-wrap" class="hidden">
            <label for="image-file">Logo Image</label>
            <input id="image-file" type="file" accept="image/*">
            <p class="helper-note">Enter your company name below — we can't scrape it from an image.</p>
          </div>
        </div>
```

- [ ] **Step 3: Update the subtitle text**

Replace:
```html
    <p class="subtitle">Fill in your details — we'll scrape your company site for brand colors and logo.</p>
```
With:
```html
    <p class="subtitle">Fill in your details — provide a website URL or upload your logo directly.</p>
```

- [ ] **Step 4: Verify visually**

Open `http://localhost:3000` (run `node server.js` first). You should see two tab buttons above the grid. Clicking them doesn't do anything yet (JS comes next). The file input is hidden. No existing functionality should be broken.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add tab toggle HTML and CSS for image upload mode"
```

---

### Task 2: Add tab-switching JS

**Files:**
- Modify: `index.html` (`<script>` block)

- [ ] **Step 1: Add `activeMode` state and `setMode` function**

Insert at the top of the `<script>` block, before `let generatedHtml = '';`:

```js
let activeMode = 'url'; // 'url' | 'image'

function setMode(mode) {
  activeMode = mode;
  document.getElementById('url-input-wrap').classList.toggle('hidden', mode !== 'url');
  document.getElementById('image-input-wrap').classList.toggle('hidden', mode !== 'image');
  document.getElementById('tab-url').classList.toggle('active', mode === 'url');
  document.getElementById('tab-image').classList.toggle('active', mode === 'image');
  // Clear errors when switching
  document.getElementById('url').classList.remove('error');
  document.getElementById('image-file').classList.remove('error');
  document.getElementById('name').classList.remove('error');
  hideResults();
  document.getElementById('status').className = 'status';
}
```

- [ ] **Step 2: Verify tab switching works**

Reload `http://localhost:3000`. Clicking "Upload Image" should hide the URL input and show the file picker + helper note. Clicking "Website URL" should switch back. The active tab should be highlighted in indigo.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: implement tab switching between URL and image modes"
```

---

### Task 3: Implement `extractColorFromImage`

**Files:**
- Modify: `index.html` (`<script>` block)

- [ ] **Step 1: Add the color extraction function**

Insert after the `setMode` function:

```js
function extractColorFromImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Sample at most 100x100 to keep it fast
        const scale = Math.min(1, 100 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const counts = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue; // skip transparent
          if (r > 230 && g > 230 && b > 230) continue; // skip near-white
          if (r < 25 && g < 25 && b < 25) continue; // skip near-black
          // Quantize to reduce noise
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          const key = `${qr},${qg},${qb}`;
          counts[key] = (counts[key] || 0) + 1;
        }

        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        if (!top) { resolve('#1a1a1a'); return; }
        const [r, g, b] = top[0].split(',').map(Number);
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
        resolve(hex);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 2: Manually verify the function in the browser console**

With the server running and a logo image handy, open DevTools console on `http://localhost:3000` and run:

```js
const input = document.getElementById('image-file');
// Switch to image tab, select a file, then in console:
extractColorFromImage(input.files[0]).then(c => console.log(c));
```

Expected: a hex color string like `#3b82f6`. For a pure white image it should return `#1a1a1a`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add client-side dominant color extraction via Canvas API"
```

---

### Task 4: Update `generate()` to handle image mode

**Files:**
- Modify: `index.html` (`<script>` block — `generate` function)

- [ ] **Step 1: Replace the `generate` function**

Replace the entire existing `generate` function with:

```js
async function generate() {
  const name = document.getElementById('name').value.trim();
  const title = document.getElementById('title').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (activeMode === 'url') {
    await generateFromUrl(name, title, phone);
  } else {
    await generateFromImage(name, title, phone);
  }
}

async function generateFromUrl(name, title, phone) {
  const url = document.getElementById('url').value.trim();
  const urlInput = document.getElementById('url');

  if (!url) { urlInput.classList.add('error'); showStatus('error', 'Please fill in all fields.'); return; }
  if (!name || !title || !phone) { showStatus('error', 'Please fill in all fields.'); return; }
  urlInput.classList.remove('error');

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

async function generateFromImage(name, title, phone) {
  const fileInput = document.getElementById('image-file');
  const file = fileInput.files[0];

  // Validate
  if (!file) { fileInput.classList.add('error'); showStatus('error', 'Please upload an image.'); return; }
  if (!file.type.startsWith('image/')) { fileInput.classList.add('error'); showStatus('error', 'Please upload a valid image file.'); return; }
  const cnInput = document.getElementById('company-name');
  const cn = cnInput.value.trim();
  if (!cn) { cnInput.classList.add('error'); showStatus('error', 'Please enter your company name.'); return; }
  if (!name || !title || !phone) { showStatus('error', 'Please fill in all fields.'); return; }

  fileInput.classList.remove('error');
  cnInput.classList.remove('error');

  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.textContent = 'Extracting…';
  hideResults();

  const reader = new FileReader();
  const logoDataUrl = await new Promise(resolve => {
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });

  const primaryColor = await extractColorFromImage(file);

  const brand = {
    primaryColor,
    logo: logoDataUrl,
    fontFamily: 'system-ui, sans-serif',
    companyName: cn,
  };

  showStatus('success', `✓ Extracted color ${primaryColor} from image.`);

  // Image mode has no URL. Pass empty url so the anchor href is harmless ('#' effectively).
  // Pass company name as domain so the plain text footer reads: "phone | CompanyName".
  const url = '';
  const domain = cn;
  generatedHtml = buildHtmlFooter({ name, title, phone, url, domain, brand });
  generatedText = buildTextFooter({ name, title, phone, url, domain, brand });

  document.getElementById('html-preview').innerHTML = generatedHtml;
  document.getElementById('text-preview').textContent = generatedText;
  document.getElementById('html-card').classList.remove('hidden');
  document.getElementById('text-card').classList.remove('hidden');

  btn.disabled = false;
  btn.textContent = '✨ Generate Footer';
}
```

- [ ] **Step 2: Add Company Name field to image mode**

The image mode needs a company name field. Looking at the current HTML, `name` is the person's name. Company name in URL mode comes from scraping. In image mode we need the user to enter it.

Add a `company-name` input to the image input wrap. Replace the image-input-wrap HTML from Task 1 with:

```html
          <div id="image-input-wrap" class="hidden">
            <label for="image-file">Logo Image</label>
            <input id="image-file" type="file" accept="image/*">
          </div>
```

And add a new grid cell for company name that only shows in image mode. Insert after the closing `</div>` of the name field div and before the title field div:

```html
        <div id="company-name-wrap" class="hidden">
          <label for="company-name">Company Name</label>
          <input id="company-name" type="text" placeholder="Acme Inc.">
        </div>
```

Update `setMode` to also toggle company-name-wrap and remove the helper-note from image-input-wrap (it's now redundant since the field is visible):

```js
function setMode(mode) {
  activeMode = mode;
  document.getElementById('url-input-wrap').classList.toggle('hidden', mode !== 'url');
  document.getElementById('image-input-wrap').classList.toggle('hidden', mode !== 'image');
  document.getElementById('company-name-wrap').classList.toggle('hidden', mode !== 'image');
  document.getElementById('tab-url').classList.toggle('active', mode === 'url');
  document.getElementById('tab-image').classList.toggle('active', mode === 'image');
  document.getElementById('url').classList.remove('error');
  document.getElementById('image-file').classList.remove('error');
  document.getElementById('name').classList.remove('error');
  hideResults();
  document.getElementById('status').className = 'status';
}
```

- [ ] **Step 3: Verify URL mode still works**

Reload. In URL mode, enter a real URL (e.g. `https://stripe.com`), fill in name/title/phone, click Generate. Footer should appear as before. No regression.

- [ ] **Step 4: Verify image mode works**

Switch to "Upload Image" tab. The Company Name field should appear. Upload a logo PNG/JPG. Fill in name, title, phone, company name. Click Generate. Expected:
- Status bar: `✓ Extracted color #xxxxxx from image.`
- HTML footer appears with the uploaded image as logo and extracted accent color
- Plain text footer shows company name (no URL link)
- Copy buttons work

- [ ] **Step 5: Verify error states**

- Click Generate in image mode with no file → "Please upload an image."
- Upload a `.txt` file renamed to test → "Please upload a valid image file."
- Upload a valid image but leave Company Name blank → "Please enter your company name."

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: implement image upload mode with client-side color extraction"
```

---

### Task 5: Push and verify

- [ ] **Step 1: Push to GitHub**

```bash
git push
```

- [ ] **Step 2: Smoke test final state**

Open `http://localhost:3000`. Test both modes end to end one more time. Confirm both "Copy HTML" and "Copy Text" buttons work in image mode.
