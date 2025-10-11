// api/index.js  (Vercel Serverless - ESM default)
export default async function handler(req, res) {
  const targetUrl = process.env.APPS_SCRIPT_URL;
  if (!targetUrl) {
    return res.status(500).json({ error: 'Variável APPS_SCRIPT_URL não configurada.' });
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();

    // Tenta converter para JSON antes de retornar
    try {
      const json = JSON.parse(text);
      return res.status(response.status).json(json);
    } catch (e) {
      // se não for JSON, encaminha o texto
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('Erro ao conectar ao Apps Script:', error);
    res.status(502).json({ error: 'Falha ao conectar ao Apps Script.' });
  }
}
