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
