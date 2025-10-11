// api/index.js
// Vercel serverless proxy to forward requests to Google Apps Script and supply proper CORS headers.
// Expects an environment variable APPS_SCRIPT_URL with the full Apps Script web app URL.

export default async function handler(req, res) {
  const targetUrl = process.env.APPS_SCRIPT_URL;
  if (!targetUrl) {
    return res.status(500).json({ error: 'Variável APPS_SCRIPT_URL não configurada.' });
  }

  // Handle preflight (CORS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
    };

    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(response.status).send(text);
  } catch (err) {
    console.error('Erro ao conectar ao Apps Script:', err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(502).json({ error: 'Falha ao conectar ao Apps Script.' });
  }
}
