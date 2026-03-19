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
  if (themeColor && /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6})$/i.test(themeColor.trim())) {
    return themeColor.trim();
  }
  const styleContent = $('style').text();
  const cssVarMatch = styleContent.match(/--(?:primary|brand|accent|color)[^:]*:\s*(#(?:[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3}))/i);
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
  const bodyFont = $('body').css('font-family') || $('body').attr('style')?.match(/font-family:\s*([^;]+)/)?.[1];
  if (bodyFont) return `${bodyFont.trim()}, system-ui, sans-serif`;
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
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL must use http or https');
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  return extractBrandData(html, url);
}

module.exports = { extractBrandData, scrapeUrl };
