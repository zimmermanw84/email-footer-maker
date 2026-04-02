# Image Upload Mode — Design Spec

**Date:** 2026-04-01

## Overview

Add an "Upload Image" mode as an alternative to the existing "Website URL" mode. When the user uploads an image (their company logo), the app extracts the dominant brand color from it client-side using the Canvas API and uses the image directly as the logo in the generated footer. No new server routes or npm dependencies.

## UI

A tab toggle sits above the current URL input:

```
[ Website URL ]  [ Upload Image ]
```

Switching tabs swaps only the input beneath it:
- **Website URL tab**: existing URL text field (current behavior, unchanged)
- **Upload Image tab**: file picker (`<input type="file" accept="image/*">`)

The name, title, and phone fields remain visible and unchanged in both modes.

In image mode, the company name field displays a helper note: "Enter your company name — we can't scrape it from an image." The field is required; Generate is blocked if it's empty.

## Data Flow (Image Mode)

1. User selects an image file and fills in name, title, phone, and company name
2. On Generate click, client validates: file selected, company name non-empty
3. `FileReader.readAsDataURL()` converts the file to a base64 `data:` string
4. Image is drawn to an off-screen `<canvas>` at its natural dimensions
5. `ctx.getImageData()` samples all pixels; colors are bucketed by hex value
6. Near-white pixels (`r > 230 && g > 230 && b > 230`) and near-black pixels (`r < 25 && g < 25 && b < 25`) are excluded
7. Most frequent remaining bucket is returned as the primary color hex string
8. If no qualifying color found, fall back to `#1a1a1a`
9. Result object passed to the footer template:
   ```js
   { primaryColor, logo: dataUrl, fontFamily: 'system-ui, sans-serif', companyName }
   ```
   — same shape as the scraper response, so the footer template is unchanged

The footer HTML will embed the logo as a base64 data URL, making it self-contained when pasted into an email client.

## Error Handling

| Condition | Behavior |
|---|---|
| Generate clicked with no file selected | Validation error: "Please upload an image" |
| Selected file is not an image (wrong MIME type) | Validation error: "Please upload a valid image file" |
| Company name empty in image mode | Block Generate, highlight field with error |
| Canvas extraction finds no qualifying color | Silent fallback to `#1a1a1a` |

## What Does Not Change

- Website URL mode: completely unchanged
- `server.js`: no new routes
- `scraper.js`: untouched
- Footer HTML template: untouched — both modes produce the same data shape

## File Changes

Only `index.html` is modified.

## Out of Scope

- Extracting company name from the image (no OCR or vision API)
- Font family detection from image
- Uploading the image to the server
- Multi-image support
