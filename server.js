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
