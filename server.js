// server.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // v2 compatible
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN;
if(!HF_TOKEN){
  console.warn('⚠️ HF_TOKEN not set in environment. /api/query will fail without it.');
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname)); // serve index.html + chess.js statically

// Helper: normalize HF router endpoint
const HF_ENDPOINT = 'https://router.huggingface.co/v1/chat/completions';

app.post('/api/query', async (req, res) => {
  try {
    if(!HF_TOKEN) return res.status(500).json({ error: 'HF_TOKEN not configured on server.' });

    const body = req.body || {};
    // Basic safety: don't allow massive tokens
    if(body.max_tokens && body.max_tokens > 1000) body.max_tokens = 1000;

    // Build payload to HF router - pass through
    const payload = {
      model: body.model || 'openai/gpt-oss-120b:together',
      messages: body.messages || [],
      max_tokens: body.max_tokens || 300,
      temperature: typeof body.temperature !== 'undefined' ? body.temperature : 0.3
    };

    const r = await fetch(HF_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    const result = await r.json();

    // Try to extract text content from common fields
    let replyText = '';
    try {
      if(result && result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
        replyText = result.choices[0].message.content;
      } else if (result && result.output && result.output[0] && result.output[0].content) {
        replyText = result.output[0].content;
      } else {
        replyText = JSON.stringify(result);
      }
    } catch(e){
      replyText = JSON.stringify(result);
    }

    // return both raw result and the best-effort replyText
    return res.json({ ok: true, result, replyText });
  } catch(err){
    console.error('API /api/query error', err);
    res.status(500).json({ error: 'Server error', details: err.message || err });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}/index.html`);
});
