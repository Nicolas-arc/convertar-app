// ═══════════════════════════════════════════════════
//  ConvertAR — Backend Server
//  Node.js + Express + Supabase
//  Deploy en Railway: railway.app
// ═══════════════════════════════════════════════════

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client (vars vienen de Railway environment)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Health check ─────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ ok: true, app: 'ConvertAR', version: '1.0.0' });
});

// ── Panel de administración ───────────────────────────
// GET /panel?secret=TU_SECRET
app.get('/panel', (req, res) => {
  const secret = req.query.secret || req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ConvertAR</title>'
      + '<style>body{font-family:system-ui;background:#0e0e0e;color:#e8e8e8;display:flex;'
      + 'align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;}'
      + 'input{background:#161616;border:1px solid #333;color:white;padding:10px 16px;'
      + 'border-radius:8px;font-size:14px;width:260px;}'
      + 'button{background:#d4a85a;color:#0e0e0e;border:none;padding:10px 24px;'
      + 'border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;}</style></head>'
      + '<body><h2 style="color:#d4a85a">ConvertAR</h2>'
      + '<input type="password" id="k" placeholder="Clave de acceso">'
      + '<button onclick="window.location=\'/panel?secret=\'+document.getElementById(\'k\').value">Entrar</button>'
      + '</body></html>';
    return res.status(401).send(html);
  }
  res.sendFile(path.join(__dirname, 'panel.html'));
});

// ── Servir snippet.js como archivo estático ───────────
app.get('/snippet.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.sendFile(path.join(__dirname, 'snippet.js'));
});

// ── Manifest PWA ──────────────────────────────────────
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

// ── TRACKING — recibe eventos del snippet JS ──────────
// POST /track
// Body: { shop_id, product_id, product_name, event, session_id }
app.post('/track', async (req, res) => {
  const { shop_id, product_id, product_name, event, session_id } = req.body;

  if (!shop_id || !event) {
    return res.status(400).json({ error: 'shop_id y event son requeridos' });
  }

  const { error } = await supabase.from('events').insert({
    shop_id,
    product_id: product_id || null,
    product_name: product_name || null,
    event_type: event,
    session_id: session_id || null,
    created_at: new Date().toISOString()
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── CONFIG — devuelve la config de una tienda ─────────
// GET /config/:shop_id
app.get('/config/:shop_id', async (req, res) => {
  const { data, error } = await supabase
    .from('shops')
    .select('config')
    .eq('id', req.params.shop_id)
    .single();

  if (error) return res.status(404).json({ error: 'Tienda no encontrada' });
  res.json(data.config);
});

// ── ANALYTICS — funnel por tienda ────────────────────
// GET /analytics/:shop_id?days=7
app.get('/analytics/:shop_id', async (req, res) => {
  const { shop_id } = req.params;
  const days = parseInt(req.query.days) || 7;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('shop_id', shop_id)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Funnel global
  const views     = data.filter(e => e.event_type === 'productView').length;
  const carts     = data.filter(e => e.event_type === 'addToCart').length;
  const purchases = data.filter(e => e.event_type === 'purchase').length;

  // Por producto
  const byProduct = {};
  data.forEach(e => {
    const pid = e.product_id || 'unknown';
    if (!byProduct[pid]) {
      byProduct[pid] = {
        id: pid,
        name: e.product_name || 'Producto',
        views: 0, carts: 0, purchases: 0
      };
    }
    if (e.event_type === 'productView')  byProduct[pid].views++;
    if (e.event_type === 'addToCart')    byProduct[pid].carts++;
    if (e.event_type === 'purchase')     byProduct[pid].purchases++;
  });

  const products = Object.values(byProduct)
    .map(p => ({
      ...p,
      conv: p.views > 0 ? (p.purchases / p.views * 100).toFixed(1) : '0.0'
    }))
    .sort((a, b) => b.purchases - a.purchases);

  // Ventas por día
  const byDay = {};
  data.filter(e => e.event_type === 'purchase').forEach(e => {
    const day = e.created_at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });

  res.json({
    period_days: days,
    summary: {
      views,
      carts,
      purchases,
      conversion: views > 0 ? (purchases / views * 100).toFixed(2) : '0.00',
      cart_rate:  views > 0 ? (carts    / views * 100).toFixed(2) : '0.00'
    },
    products,
    sales_by_day: byDay
  });
});

// ── GUARDAR CONFIG ────────────────────────────────────
// POST /config/:shop_id
// Body: { config: {...}, secret: 'TOKEN' }
app.post('/config/:shop_id', async (req, res) => {
  const { config, secret } = req.body;

  // Validación simple por token (reemplazar con auth real)
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { error } = await supabase
    .from('shops')
    .update({ config, updated_at: new Date().toISOString() })
    .eq('id', req.params.shop_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── REGISTRAR TIENDA ──────────────────────────────────
// POST /shops
// Body: { name, url, email }
app.post('/shops', async (req, res) => {
  const { name, url, email } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name y url son requeridos' });

  const id = url
    .replace(/https?:\/\//i, '')
    .replace(/\/$/, '')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();

  const defaultConfig = {
    features: {
      envio_badge:    true,
      precio_tachado: true,
      tags:           false,
      countdown:      false,
      video_slider:   false,
      desc_premium:   false,
      faq:            false,
      sticky_bar:     false,
      reviews:        false
    },
    envio: {
      tipo: 'gratis',
      texto: 'Envío gratis a todo el país'
    },
    tags: {
      // "ID_PRODUCTO": ["mas_vendido", "hot_days"]
    },
    countdown: {
      enabled:  false,
      end_date: null,
      texto:    'Oferta termina en'
    },
    faq: [
      {
        q: '¿Los productos vienen listos para usar/instalar?',
        a: 'Sí, todos nuestros productos incluyen todo lo necesario para su instalación.'
      },
      {
        q: '¿Qué pasa si el producto llega dañado?',
        a: 'Todos los envíos están asegurados. Si llega con algún daño, escribinos por WhatsApp con foto y lo reponemos sin costo.'
      },
      {
        q: '¿En cuántos días recibo mi pedido?',
        a: 'GBA: 2-4 días hábiles. Interior del país: 5-10 días hábiles.'
      }
    ],
    reviews: []
  };

  const { data, error } = await supabase
    .from('shops')
    .insert({ id, name, url, email, config: defaultConfig, plan: 'starter' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ shop_id: id, message: 'Tienda registrada OK', data });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ConvertAR backend corriendo en puerto ${PORT}`);
});
