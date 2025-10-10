// api/index.js
export default async function handler(req, res) {
  const targetUrl = process.env.APPS_SCRIPT_URL;
  if (!targetUrl) {
    return res.status(500).json({ error: 'Variável APPS_SCRIPT_URL não configurada.' });
  }

  // CORS (seguro para seu próprio domínio; permite também acessos diretos)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {})
    };

    const r = await fetch(targetUrl, fetchOptions);
    const text = await r.text();
    const contentType = r.headers.get('content-type') || '';

    // encaminhar status
    res.status(r.status);

    // se for JSON, parse e retornar JSON; senão retorno texto cru
    if (contentType.includes('application/json')) {
      try {
        return res.json(JSON.parse(text));
      } catch (e) {
        return res.send(text);
      }
    } else {
      return res.send(text);
    }
  } catch (err) {
    console.error('Erro ao conectar ao Apps Script:', err);
    return res.status(502).json({ error: 'Falha ao conectar ao Apps Script.', detail: err.message });
  }
}
