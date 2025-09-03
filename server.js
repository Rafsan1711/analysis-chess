import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 6; 
const HF_TOKEN = process.env.HF_TOKEN;
if(!HF_TOKEN) console.warn('HF_TOKEN not set in .env');

function setCache(key,val){ cache.set(key,{ val, ts:Date.now() }); }
function getCache(key){ 
  const r = cache.get(key); 
  if(!r) return null;
  if(Date.now() - r.ts > CACHE_TTL){ cache.delete(key); return null; }
  return r.val;
}

async function fetchWithTimeout(url, opts={}, timeout=60_000){
  const controller = new AbortController();
  const id = setTimeout(()=>controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch(err){
    clearTimeout(id);
    throw err;
  }
}

app.post('/api/query', async (req,res)=>{
  try{
    const payload = req.body;
    let key = null;
    try{
      const m = payload.messages||[];
      const userMsg = m.find(x=>x.role==='user' && typeof x.content==='string');
      if(userMsg) key = userMsg.content.slice(0,200);
    }catch(e){}

    if(key){
      const cached = getCache(key);
      if(cached) return res.json({ result: cached.raw, replyText: cached.replyText, cached:true });
    }

    const hfResp = await fetchWithTimeout("https://router.huggingface.co/v1/chat/completions", {
      method:'POST',
      headers: { Authorization:`Bearer ${HF_TOKEN}`, 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    }, 60_000);

    const data = await hfResp.json();
    let replyText = '';
    if(data && data.choices && data.choices[0] && data.choices[0].message)
      replyText = data.choices[0].message.content || '';

    if(key) setCache(key,{ raw:data, replyText });

    res.json({ result:data, replyText });
  }catch(err){
    console.error('Error /api/query', err?.message||err);
    res.status(500).json({ error: err.message||String(err) });
  }
});

const port = process.env.PORT||3000;
app.listen(port, ()=>console.log('Server listening on port',port));
