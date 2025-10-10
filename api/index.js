export default async function handler(req, res) {
  const targetUrl = process.env.APPS_SCRIPT_URL;

  if (!targetUrl) {
    return res.status(500).json({ error: 'Variável APPS_SCRIPT_URL não configurada.' });
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: ['GET', 'HEAD'].includes(req.method) ? null : JSON.stringify(req.body),
    });

    const text = await response.text();

    res.status(response.status).send(text);
  } catch (error) {
    console.error('Erro ao conectar ao Apps Script:', error);
    res.status(502).json({ error: 'Falha ao conectar ao Apps Script.' });
  }
}
