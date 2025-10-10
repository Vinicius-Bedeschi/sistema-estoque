// Vercel serverless proxy to Google Apps Script
// - Reads APPS_SCRIPT_URL from environment variable APPS_SCRIPT_URL (recommended)
// - Adds CORS headers so browser can call /api directly
// - Forwards request body (JSON) to the Apps Script endpoint and returns the response

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz7ac8uTSFJYr41xd0WCwVUeGqPsJ2eq_YGsbLTv5VQj_LjmOYdvfcJiq-hHXRH1eoCEA/exec';

export default async function handler(req, res) {
  // Allow all origins for development. In production, change '*' to your front-end origin.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Forward the exact JSON body received to the Apps Script endpoint
    const payload = req.body;

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    // Try to parse JSON; if parse fails, return raw text
    try {
      const json = JSON.parse(text);
      return res.status(response.status).json(json);
    } catch (e) {
      return res.status(response.status).send(text);
    }
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
