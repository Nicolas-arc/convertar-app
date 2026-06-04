// ═══════════════════════════════════════════════════
//  ConvertAR — Backend Server
//  Node.js + Express + Supabase
//  Deploy en Railway: railway.app
// ═══════════════════════════════════════════════════

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');

// Polyfill WebSocket para Node < 22 (requerido por @supabase/supabase-js v2)
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = require('ws');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Supabase client — acepta múltiples nombres de variable por compatibilidad
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY
               || process.env.SUPABASE_SERVICE_ROLE_KEY
               || process.env.SUPABASE_KEY
               || process.env.CLAVE_DE_SERVICIO_SUPABASE;

console.log(`Node.js ${process.version}`);
console.log('SUPABASE_URL:', SUPA_URL ? '✅ presente' : '❌ falta');
console.log('SUPABASE_KEY:', SUPA_KEY ? '✅ presente' : '❌ falta');

let supabase;
try {
  if (!SUPA_URL || !SUPA_KEY) throw new Error(`Faltan credenciales: URL=${!!SUPA_URL} KEY=${!!SUPA_KEY}`);
  supabase = createClient(SUPA_URL, SUPA_KEY);
  console.log('Supabase ✅ inicializado');
} catch (e) {
  console.error('Supabase ❌ error:', e.message);
}

// ── Health check ─────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    ok: true,
    app: 'ConvertAR',
    version: '1.0.0',
    node: process.version,
    supabase: !!supabase
  });
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

// ── CDN propio — scripts de ConvertAR ─────────────────
// GET /static/badge-transfer.js, /static/badge-cuotas.js, etc.
// GTM carga cada script con: <script src="URL/static/ARCHIVO.js" async></script>
app.use('/static', express.static(path.join(__dirname, 'static'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300');
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

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
  if (!supabase) return res.status(503).json({ error: 'Supabase no inicializado — verificar SUPABASE_URL y SUPABASE_SERVICE_KEY en Railway' });

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

// ── TN CONNECTION TEST ───────────────────────────
app.get('/api/tn/test', async (req, res) => {
  const secret = req.query.secret || req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'No autorizado' });
  const token   = process.env.TN_TOKEN    || '';
  const storeId = process.env.TN_STORE_ID || '';
  const tokenPreview = token ? token.slice(0,8) + '...' + token.slice(-4) : 'NO CONFIGURADO';
  if (!token || !storeId) return res.json({ ok: false, tokenPreview, storeId: storeId || 'NO CONFIGURADO', error: 'Variables no configuradas' });
  try {
    const r = await fetch(`https://api.tiendanube.com/v1/${storeId}/store`, {
      headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'ConvertAR (nicolas@pintoshome.com)' }
    });
    const body = await r.text();
    res.json({ ok: r.ok, status: r.status, tokenPreview, storeId, response: body.slice(0,200) });
  } catch(e) {
    res.json({ ok: false, tokenPreview, storeId, error: e.message });
  }
});

// ── TIENDANUBE API PROXY ──────────────────────────

// GET /api/tn/products?page=1&q=busqueda — lista paginada para el panel
app.get('/api/tn/products', async (req, res) => {
  const secret = req.query.secret || req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'No autorizado' });

  const TN_TOKEN    = process.env.TN_TOKEN;
  const TN_STORE_ID = process.env.TN_STORE_ID;
  if (!TN_TOKEN || !TN_STORE_ID) return res.status(503).json({ error: 'TN_TOKEN o TN_STORE_ID no configurados en Railway' });

  const page  = parseInt(req.query.page) || 1;
  const q     = (req.query.q || '').trim();
  const TN_BASE = `https://api.tiendanube.com/v1/${TN_STORE_ID}`;
  const TN_HEADERS = {
    'Authentication': `bearer ${TN_TOKEN}`,
    'User-Agent': 'ConvertAR (nicolas@pintoshome.com)'
  };

  try {
    let url = `${TN_BASE}/products?per_page=24&page=${page}&fields=id,name,handle,variants,images`;
    if (q) url += `&q=${encodeURIComponent(q)}`;

    const r = await fetch(url, { headers: TN_HEADERS });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: `TN API error ${r.status}`, detail: txt.slice(0, 200) });
    }
    const list = await r.json();

    const products = (list || []).map(p => {
      const variant = (p.variants || [])[0] || {};
      const price   = variant.promotional_price || variant.price || 0;
      const img     = (p.images || [])[0];
      const imgUrl  = img ? (img.src || '') : '';
      const name    = p.name ? (p.name.es || p.name.pt || Object.values(p.name)[0] || '') : '';
      return { id: p.id, name, handle: p.handle, price, img: imgUrl };
    });

    // Total pages via Link header
    const link  = r.headers.get('link') || '';
    const hasNext = link.includes('rel="next"');

    res.json({ products, page, hasNext });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tn/product?q=URL_o_ID_o_nombre
// Busca un producto en TN y devuelve datos limpios para el generador
app.get('/api/tn/product', async (req, res) => {
  const secret = req.query.secret || req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Falta el parámetro q' });

  const TN_TOKEN    = process.env.TN_TOKEN;
  const TN_STORE_ID = process.env.TN_STORE_ID;
  const TN_BASE     = `https://api.tiendanube.com/v1/${TN_STORE_ID}`;
  const TN_HEADERS  = {
    'Authentication': `bearer ${TN_TOKEN}`,
    'User-Agent': 'ConvertAR (nicolas@pintoshome.com)',
    'Content-Type': 'application/json'
  };

  try {
    let productId = null;

    // Detectar si es un ID numérico directo
    if (/^\d+$/.test(q)) {
      productId = q;
    }
    // Detectar si es una URL con ID numérico (ej: /admin/products/edit/101373538)
    else {
      const matchId = q.match(/\/(\d{7,})/);
      if (matchId) {
        productId = matchId[1];
      }
    }

    let product;

    if (productId) {
      // Buscar por ID directo
      const r = await fetch(`${TN_BASE}/products/${productId}`, { headers: TN_HEADERS });
      if (!r.ok) return res.status(404).json({ error: 'Producto no encontrado' });
      product = await r.json();
    } else {
      // Buscar por handle (slug de URL) o nombre
      const handle = q.split('/').pop().split('?')[0].toLowerCase().trim();
      const r = await fetch(`${TN_BASE}/products?handle=${encodeURIComponent(handle)}&per_page=1`, { headers: TN_HEADERS });
      const list = await r.json();
      if (!list || !list[0]) {
        // Intento por nombre
        const r2 = await fetch(`${TN_BASE}/products?q=${encodeURIComponent(q)}&per_page=1`, { headers: TN_HEADERS });
        const list2 = await r2.json();
        if (!list2 || !list2[0]) return res.status(404).json({ error: 'Producto no encontrado' });
        productId = list2[0].id;
        const r3 = await fetch(`${TN_BASE}/products/${productId}`, { headers: TN_HEADERS });
        product = await r3.json();
      } else {
        productId = list[0].id;
        const r3 = await fetch(`${TN_BASE}/products/${productId}`, { headers: TN_HEADERS });
        product = await r3.json();
      }
    }

    // Obtener imágenes
    const imgRes  = await fetch(`${TN_BASE}/products/${product.id}/images`, { headers: TN_HEADERS });
    const images  = imgRes.ok ? await imgRes.json() : [];

    // Extraer variante principal (la más barata visible)
    const variants = (product.variants || []).filter(v => v.visible !== false);
    const mainVariant = variants[0] || {};

    const precio      = mainVariant.promotional_price || mainVariant.price || '';
    const precioAntes = mainVariant.promotional_price ? mainVariant.price : (mainVariant.compare_at_price !== mainVariant.price ? mainVariant.compare_at_price : null);

    // Limpiar HTML de la descripción
    const desc = (product.description?.es || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 600);

    res.json({
      product_id:   String(product.id),
      variant_id:   String(mainVariant.id || ''),
      nombre:        product.name?.es || '',
      descripcion:   desc,
      precio:        precio ? Number(precio).toLocaleString('es-AR') : '',
      precio_antes:  precioAntes ? Number(precioAntes).toLocaleString('es-AR') : '',
      stock:         mainVariant.stock || 0,
      variants:      variants.map(v => ({
        id:      String(v.id),
        label:   v.values?.[0]?.es || 'Default',
        precio:  v.promotional_price || v.price,
        stock:   v.stock
      })),
      imagenes:      images.slice(0, 4).map(img => img.src || img.url || '').filter(Boolean)
    });

  } catch (err) {
    console.error('TN API error:', err);
    res.status(500).json({ error: 'Error al conectar con Tiendanube' });
  }
});

// ── LANDINGS — generador ──────────────────────────
// GET /landings/new?secret=X
app.get('/landings/new', (req, res) => {
  const secret = req.query.secret || req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).send('No autorizado');
  }
  res.sendFile(path.join(__dirname, 'landing-generator.html'));
});

// POST /api/landings — guardar landing
app.post('/api/landings', async (req, res) => {
  const { secret, slug, html, nombre, shop_id } = req.body;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  if (!slug || !html) {
    return res.status(400).json({ error: 'slug y html son requeridos' });
  }
  const { error } = await supabase.from('landings').upsert({
    slug, html, nombre, shop_id,
    updated_at: new Date().toISOString()
  }, { onConflict: 'slug' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, url: `/l/${slug}` });
});

// GET /api/landings — listar landings
app.get('/api/landings', async (req, res) => {
  const secret = req.query.secret || req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const { data, error } = await supabase
    .from('landings')
    .select('slug, nombre, shop_id, updated_at')
    .order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/landings/:slug — eliminar landing
app.delete('/api/landings/:slug', async (req, res) => {
  const secret = req.query.secret || req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const { error } = await supabase.from('landings').delete().eq('slug', req.params.slug);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// GET /l/:slug — servir landing pública
app.get('/l/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('landings')
    .select('html')
    .eq('slug', req.params.slug)
    .single();
  if (error || !data) return res.status(404).send('Landing no encontrada');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.send(data.html);
});

// ── RECENT ORDERS — social proof popup ───────────────
// GET /api/recent-orders   (público, cacheable 2 min)
app.get('/api/recent-orders', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=120');

  const TN_TOKEN    = process.env.TN_TOKEN;
  const TN_STORE_ID = process.env.TN_STORE_ID;

  if (!TN_TOKEN || !TN_STORE_ID) {
    return res.status(503).json({ error: 'TN credentials not configured' });
  }

  const TN_HEADERS = {
    'Authentication': `bearer ${TN_TOKEN}`,
    'User-Agent': 'ConvertAR (nicolas@pintoshome.com)',
    'Content-Type': 'application/json'
  };

  try {
    const r = await fetch(
      `https://api.tiendanube.com/v1/${TN_STORE_ID}/orders?per_page=20&payment_status=paid`,
      { headers: TN_HEADERS }
    );

    if (!r.ok) {
      const body = await r.text();
      console.error('TN orders error:', r.status, body);
      return res.status(r.status).json({ error: `TN API error: ${r.status}` });
    }

    const orders = await r.json();
    const now = Date.now();

    const result = (Array.isArray(orders) ? orders : []).map(order => {
      const customer  = order.customer || {};
      const firstName = (customer.name || '').split(' ')[0] || 'Cliente';
      const city      = (customer.default_address && customer.default_address.city) || '';

      const prod        = (order.products || [])[0] || {};
      const productName = typeof prod.name === 'object'
        ? (prod.name.es || prod.name.en || Object.values(prod.name).find(v => v) || '')
        : (prod.name || '');
      const productImg  = (prod.image && (prod.image.src || prod.image.url)) || null;

      const createdAt  = new Date(order.created_at).getTime();
      const minutesAgo = Math.max(1, Math.round((now - createdAt) / 60000));

      return {
        nombre:   firstName,
        ciudad:   city,
        producto: productName,
        imagen:   productImg,
        min:      minutesAgo
      };
    });

    res.json(result);
  } catch (err) {
    console.error('recent-orders error:', err);
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

// ── PROMOS — popup de promociones flotante ─────────────
// GET /api/promos/:shop_id  (público, cacheable 5 min)
// POST /api/promos/:shop_id (requiere ADMIN_SECRET)
const DEFAULT_PROMOS = [
  { icon: '💳', titulo: '6 cuotas sin interés',         detalle: 'Con todas las tarjetas' },
  { icon: '🏦', titulo: '10% OFF con transferencia',    detalle: 'Mejor precio al momento de pagar' },
  { icon: '🚚', titulo: 'Envío gratis',                 detalle: 'En compras desde $69.999' },
  { icon: '🎁', titulo: 'Armá tu combo',                detalle: 'Black Out + Voile + Cuadros con descuento especial' }
];

app.get('/api/promos/:shop_id', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (!supabase) return res.json(DEFAULT_PROMOS);
  const { data, error } = await supabase
    .from('shops').select('config').eq('id', req.params.shop_id).single();
  const promos = (!error && data?.config?.promos) ? data.config.promos : DEFAULT_PROMOS;
  res.json(promos);
});

app.post('/api/promos/:shop_id', async (req, res) => {
  const { promos, secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'No autorizado' });
  if (!Array.isArray(promos))              return res.status(400).json({ error: 'promos debe ser un array' });
  if (!supabase)                           return res.status(503).json({ error: 'DB no disponible' });
  const { data: cur } = await supabase.from('shops').select('config').eq('id', req.params.shop_id).single();
  const config = { ...(cur?.config || {}), promos };
  const { error } = await supabase.from('shops').upsert(
    { id: req.params.shop_id, name: req.params.shop_id, url: 'https://pintoshogar.com.ar', config, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ConvertAR backend corriendo en puerto ${PORT}`);
});
