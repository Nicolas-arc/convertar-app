// ═══════════════════════════════════════════════════
//  ConvertAR — Backend Server
//  Node.js + Express + Supabase
//  Deploy en Railway: railway.app
// ═══════════════════════════════════════════════════

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');
const fs   = require('fs');
const http = require('http');

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

// ── Subdominio cortinas → redirigir raíz a /cortinas ──
app.use((req, res, next) => {
  if (req.hostname === 'cortinas.pintoshogar.com.ar' && req.path === '/') {
    return res.redirect(301, '/cortinas');
  }
  next();
});

// ── OCA SOAP cotizador ────────────────────────────────
function cotizarOCA(cpOrigen, cpDestino, pesoKg, volumenCm3) {
  return new Promise((resolve, reject) => {
    const soap = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Tarifar_Envio_Estimado xmlns="http://www.oca.com.ar/oep_oca/operaciones"><PesoTotal>${pesoKg}</PesoTotal><VolumenTotal>${volumenCm3}</VolumenTotal><CodigoPostalOrigen>${cpOrigen}</CodigoPostalOrigen><CodigoPostalDestino>${cpDestino}</CodigoPostalDestino><CantidadPaquetes>1</CantidadPaquetes></Tarifar_Envio_Estimado></soap:Body></soap:Envelope>`;
    const options = {
      hostname: 'webservice.oca.com.ar',
      path: '/oep_oca.asmx',
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '"http://www.oca.com.ar/oep_oca/operaciones/Tarifar_Envio_Estimado"',
        'Content-Length': Buffer.byteLength(soap),
      },
      timeout: 6000,
    };
    const req = http.request(options, (response) => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        const match = data.match(/<Precio>([\d.,]+)<\/Precio>/);
        if (match) {
          resolve(parseFloat(match[1].replace(',', '.')));
        } else {
          reject(new Error('Sin precio en respuesta OCA'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('OCA timeout')); });
    req.write(soap);
    req.end();
  });
}

// ── Calculador de envío por CP ─────────────────────────
// GET /api/envio?cp=1234&total=95000&panios=2
app.get('/api/envio', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const cpStr = (req.query.cp || '').replace(/\D/g, '').slice(0, 4);
  const total = parseFloat(req.query.total) || 0;
  const panios = Math.max(1, parseInt(req.query.panios) || 1);

  if (total >= 100000) {
    return res.json({ gratis: true, mensaje: 'Envío GRATIS a todo el país 🎉' });
  }
  if (!cpStr || cpStr.length < 4) {
    return res.json({ error: true, mensaje: 'Ingresá un CP de 4 dígitos.' });
  }

  const faltaParaGratis = Math.max(0, 100000 - total);
  const cpOrigen = process.env.OCA_CP_ORIGEN || '1754';
  // 1 paño blackout ≈ 0.35 kg, volumen ≈ 15000 cm³ (60x25x10 cm enrollada)
  const pesoKg = (panios * 0.35).toFixed(2);
  const volumenCm3 = panios * 15000;

  try {
    const precio = await cotizarOCA(cpOrigen, cpStr, pesoKg, volumenCm3);
    return res.json({
      gratis: false,
      costo: Math.round(precio),
      zona: 'OCA',
      mensaje: `Envío OCA a tu CP: $${Math.round(precio).toLocaleString('es-AR')}`,
      faltaParaGratis,
    });
  } catch (e) {
    // Fallback a tabla de zonas si OCA no responde
    const cp = parseInt(cpStr);
    let zona, costo;
    if (cp >= 1000 && cp <= 1499)        { zona = 'CABA';               costo = 4500; }
    else if (cp >= 1500 && cp <= 2999)   { zona = 'GBA / Bs.As.';       costo = 5800; }
    else if (cp >= 3000 && cp <= 5999)   { zona = 'Centro del país';     costo = 7500; }
    else if (cp >= 6000 && cp <= 8999)   { zona = 'Interior';            costo = 9200; }
    else if (cp >= 9000)                 { zona = 'Patagonia / NOA';     costo = 11500; }
    else { return res.json({ error: true, mensaje: 'CP no reconocido. Consultanos por WhatsApp.' }); }
    return res.json({
      gratis: false, zona, costo,
      mensaje: `Envío OCA a ${zona}: $${costo.toLocaleString('es-AR')} (estimado)`,
      faltaParaGratis,
    });
  }
});

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

// ── CALCULADORA DE CORTINAS ────────────────────────────
// GET /api/catalogo-cortinas  → lee catálogo real de TN, cachea 30 min
// GET /calculadora            → landing page interactiva

let _catalogoCache = null;
let _catalogoCacheTime = 0;
const _catalogoVersion = '4'; // incrementar para invalidar cache
const CATALOGO_TTL = 30 * 60 * 1000;

function parsearNombre(name) {
  if (typeof name === 'object') return name.es || name.en || Object.values(name).find(v => v) || '';
  return name || '';
}

function extraerAlto(nombre) {
  const low = nombre.toLowerCase();
  // "210cm" o "210 cm"
  const cm = low.match(/(\d{3})\s*cm/);          if (cm) return parseInt(cm[1]);
  // "210 x130" — paño NNN x ancho
  const paño = low.match(/pa[ñn]o\s+(\d{3})\s*x/); if (paño) return parseInt(paño[1]);
  // "210 x" genérico (tres dígitos antes de x)
  const x = low.match(/\b(\d{3})\s*x\s*\d/);       if (x)    return parseInt(x[1]);
  // "3m" o "2.5m"
  const m = low.match(/\b(\d+(?:[.,]\d+)?)\s*m\b/); if (m)    return Math.round(parseFloat(m[1].replace(',','.')) * 100);
  return 0;
}

function procesarCatalogo(products) {
  const cortinas = [], voile = [], cuadros = [];

  products.forEach(p => {
    const nombre  = parsearNombre(p.name);
    const low     = nombre.toLowerCase();
    /* En TN el precio real está en variants[0].price, p.price suele ser null o "0.00" */
    const variant = (p.variants && p.variants[0]) || {};
    const precio  = parseFloat(variant.price || p.price || 0);
    const precioPromo = parseFloat(variant.promotional_price || p.promotional_price || 0);
    /* Precio transferencia: precio promocional si existe, sino -10% */
    const precioTransf = precioPromo > 0 ? precioPromo : Math.round(precio * 0.9);
    const handle  = p.handle || '';
    const imagen  = (p.images && p.images[0]) ? (p.images[0].src || p.images[0].url || null) : null;
    const url     = `https://www.pintoshogar.com.ar/${handle}`;
    /* Mapa color → variant_id para pasar el color seleccionado al carrito */
    const variantes = {};
    if (p.variants) {
      p.variants.forEach(v => {
        const colorName = Array.isArray(v.values) ? v.values[0] : null;
        if (colorName && v.id) variantes[colorName] = String(v.id);
      });
    }
    const base    = { id: p.id, variant_id: String(variant.id || ''), variantes, nombre, precio, precioTransf, handle, imagen, url };

    if (/cuadro/i.test(low) && !/combo/i.test(low)) {
      if (/x6/i.test(low)) cuadros.push({ ...base, tipo: 'x6' });
      else if (/x3/i.test(low)) cuadros.push({ ...base, tipo: 'x3' });
      return;
    }
    if (/voile/i.test(low) && !/combo/i.test(low)) { voile.push(base); return; }
    if (/black.?out|blackout/i.test(low) && !/combo|voile|cuadro/i.test(low)) {
      const alto = extraerAlto(nombre);
      if (alto >= 150) cortinas.push({ ...base, alto });
    }
  });

  cortinas.sort((a, b) => a.alto - b.alto);

  /* Rango: la cortina cubre si su alto >= alto de la ventana */
  const RANGOS = [
    { label: '210cm', min: 150, max: 210 },
    { label: '220cm', min: 211, max: 220 },
    { label: '240cm', min: 221, max: 240 },
    { label: '260cm', min: 241, max: 260 },
    { label: '280cm', min: 261, max: 280 },
    { label: '300cm', min: 281, max: 320 },
  ];
  const cortinasPorRango = {};
  RANGOS.forEach(r => {
    const altoLabel = parseInt(r.label);
    const match = cortinas.filter(c => c.alto >= r.min && c.alto <= r.max);
    if (!match.length) return;
    // Preferir coincidencia exacta con el label del rango (ej: 210, 220, 240…)
    const exacto = match.find(c => c.alto === altoLabel);
    // Si no hay exacto, tomar el de mayor alto del rango (el que más cubre)
    cortinasPorRango[r.label] = exacto || match[match.length - 1];
  });

  voile.sort((a, b) => a.precio - b.precio);
  cuadros.sort((a, b) => a.precio - b.precio);

  return {
    cortinas: cortinasPorRango,
    voile:      voile[0] || null,
    cuadros_x3: cuadros.find(c => c.tipo === 'x3') || null,
    cuadros_x6: cuadros.find(c => c.tipo === 'x6') || null,
    _updated: new Date().toISOString()
  };
}

app.get('/api/catalogo-cortinas', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=1800');

  if (_catalogoCache && Date.now() - _catalogoCacheTime < CATALOGO_TTL) return res.json(_catalogoCache);

  const TN_TOKEN = process.env.TN_TOKEN, TN_STORE_ID = process.env.TN_STORE_ID;
  if (!TN_TOKEN || !TN_STORE_ID) return res.status(503).json({ error: 'TN no configurado' });

  try {
    const headers = { 'Authentication': `bearer ${TN_TOKEN}`, 'User-Agent': 'ConvertAR (nicolas@pintoshome.com)' };
    const r = await fetch(`https://api.tiendanube.com/v1/${TN_STORE_ID}/products?per_page=200&published=true`, { headers });
    if (!r.ok) throw new Error(`TN ${r.status}`);
    const products = await r.json();
    _catalogoCache = procesarCatalogo(products);
    _catalogoCacheTime = Date.now();
    res.json(_catalogoCache);
  } catch (err) {
    console.error('catalogo-cortinas error:', err);
    if (_catalogoCache) return res.json(_catalogoCache);
    res.status(500).json({ error: 'Error al leer catálogo' });
  }
});

app.get('/calculadora', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>¿Cuántas cortinas necesitás? · Pintos Home</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f4f1;color:#111;min-height:100vh}
  /* HEADER */
  .ph-header{background:#111;color:#fff;text-align:center;padding:22px 16px 20px}
  .ph-header-logo{font-size:20px;font-weight:800;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px}
  .ph-header-sub{font-size:12px;color:rgba(255,255,255,.45);letter-spacing:1px;text-transform:uppercase}
  /* HERO */
  .ph-hero{background:linear-gradient(135deg,#1a1a1a,#2d2d2d);color:#fff;text-align:center;padding:32px 20px 28px}
  .ph-hero h1{font-size:clamp(22px,4vw,34px);font-weight:800;line-height:1.2;margin-bottom:10px}
  .ph-hero p{font-size:13px;color:rgba(255,255,255,.5);line-height:1.6;max-width:380px;margin:0 auto}
  /* CARD */
  .ph-card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);padding:24px 20px;max-width:480px;margin:24px auto;width:calc(100% - 32px)}
  .ph-section-title{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#aaa;margin-bottom:14px}
  /* INPUTS */
  .ph-inputs{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px}
  .ph-input-wrap{display:flex;flex-direction:column;gap:5px}
  .ph-input-wrap label{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.8px}
  .ph-input-group{position:relative;display:flex;align-items:center}
  .ph-input-group input{width:100%;padding:14px 44px 14px 14px;border:2px solid #e8e8e6;border-radius:10px;font-size:22px;font-weight:700;color:#111;background:#fafafa;-webkit-appearance:none;appearance:none;outline:none;transition:border-color .2s}
  .ph-input-group input:focus{border-color:#111;background:#fff}
  .ph-input-group .unit{position:absolute;right:12px;font-size:12px;font-weight:700;color:#bbb}
  .ph-input-hint{font-size:10px;color:#ccc;margin-top:2px}
  /* RESULTADO */
  #ph-resultado{margin-top:20px;display:none}
  .ph-result-main{background:#f8f7f4;border-radius:12px;padding:16px;margin-bottom:12px;border-left:3px solid #111}
  .ph-result-title{font-size:13px;font-weight:700;color:#111;margin-bottom:8px}
  .ph-result-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
  .ph-result-label{font-size:12px;color:#666}
  .ph-result-value{font-size:13px;font-weight:700;color:#111}
  .ph-result-price{font-size:20px;font-weight:800;color:#111}
  .ph-result-transf{font-size:11px;color:#2d7a2d;font-weight:700;margin-top:2px}
  /* ADDONS */
  .ph-addons{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
  .ph-addon{display:flex;align-items:center;gap:12px;padding:12px 14px;border:2px solid #efefed;border-radius:10px;cursor:pointer;transition:border-color .15s,background .15s;user-select:none}
  .ph-addon.active{border-color:#111;background:#fafafa}
  .ph-addon-check{width:20px;height:20px;border-radius:50%;border:2px solid #ddd;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s;font-size:11px;color:#fff}
  .ph-addon.active .ph-addon-check{background:#111;border-color:#111}
  .ph-addon-info{flex:1}
  .ph-addon-name{font-size:13px;font-weight:700;color:#111}
  .ph-addon-desc{font-size:11px;color:#888;margin-top:1px}
  .ph-addon-price{font-size:13px;font-weight:700;color:#111;text-align:right}
  .ph-addon-transf{font-size:10px;color:#2d7a2d;font-weight:600}
  /* TOTAL */
  .ph-total{background:#111;color:#fff;border-radius:12px;padding:16px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
  .ph-total-label{font-size:12px;color:rgba(255,255,255,.6)}
  .ph-total-amount{font-size:24px;font-weight:800}
  .ph-total-transf{font-size:11px;color:#7ecf7e;font-weight:700;margin-top:2px;text-align:right}
  /* CTAS */
  .ph-ctas{display:flex;flex-direction:column;gap:8px}
  .ph-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;transition:transform .15s,box-shadow .15s;cursor:pointer;border:none}
  .ph-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,.15)}
  .ph-btn-primary{background:#111;color:#fff}
  .ph-btn-wa{background:#25d366;color:#fff}
  .ph-btn-secondary{background:#f0ede8;color:#111;border:1.5px solid #e0dbd0}
  /* IMAGEN */
  .ph-prod-img{width:64px;height:64px;border-radius:8px;object-fit:cover;flex-shrink:0}
  /* FOOTER */
  .ph-footer{text-align:center;padding:24px 16px;font-size:11px;color:#bbb}
  .ph-spinner{text-align:center;padding:20px;color:#aaa;font-size:13px}
  @media(max-width:360px){.ph-inputs{grid-template-columns:1fr}}
</style>
</head>
<body>

<div class="ph-header">
  <div class="ph-header-logo">PINTOS HOME</div>
  <div class="ph-header-sub">Calculadora de cortinas</div>
</div>

<div class="ph-hero">
  <h1>¿Cuántas cortinas<br>necesitás?</h1>
  <p>Ingresá las medidas de tu ventana y te decimos exactamente qué productos necesitás y cuánto sale.</p>
</div>

<div class="ph-card">
  <div class="ph-section-title">Medidas de tu ventana</div>
  <div class="ph-inputs">
    <div class="ph-input-wrap">
      <label>Alto</label>
      <div class="ph-input-group">
        <input type="number" id="alto" placeholder="210" min="100" max="320" inputmode="numeric">
        <span class="unit">cm</span>
      </div>
      <span class="ph-input-hint">Ej: 210, 240, 260</span>
    </div>
    <div class="ph-input-wrap">
      <label>Ancho</label>
      <div class="ph-input-group">
        <input type="number" id="ancho" placeholder="260" min="50" max="800" inputmode="numeric">
        <span class="unit">cm</span>
      </div>
      <span class="ph-input-hint">Ej: 130, 260, 390</span>
    </div>
  </div>

  <div id="ph-resultado">
    <div id="ph-spinner" class="ph-spinner">Calculando...</div>
    <div id="ph-contenido" style="display:none">

      <div class="ph-result-main" id="ph-cortina-card">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <img id="ph-prod-img" class="ph-prod-img" src="" alt="" style="display:none">
          <div style="flex:1">
            <div class="ph-result-title" id="ph-prod-nombre">—</div>
            <div class="ph-result-row">
              <span class="ph-result-label">Paños necesarios</span>
              <span class="ph-result-value" id="ph-panos">—</span>
            </div>
            <div class="ph-result-row">
              <span class="ph-result-label">Precio por paño</span>
              <span class="ph-result-value" id="ph-precio-unidad">—</span>
            </div>
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e8e8e6">
              <div class="ph-result-price" id="ph-subtotal-cortinas">—</div>
              <div class="ph-result-transf" id="ph-subtotal-transf">—</div>
            </div>
          </div>
        </div>
      </div>

      <div class="ph-section-title" style="margin-top:16px">Completá tu combo (opcional)</div>
      <div class="ph-addons" id="ph-addons"></div>

      <div class="ph-total">
        <div>
          <div class="ph-total-label">Total estimado</div>
          <div class="ph-total-amount" id="ph-total">$0</div>
        </div>
        <div style="text-align:right">
          <div class="ph-total-label">Con transferencia</div>
          <div class="ph-total-transf" id="ph-total-transf">$0</div>
        </div>
      </div>

      <div class="ph-ctas" id="ph-ctas"></div>

    </div>
  </div>
</div>

<div class="ph-footer">
  Cada paño mide 130cm de ancho · Los precios pueden variar · <a href="https://www.pintoshogar.com.ar" style="color:#aaa">Ver tienda completa</a>
</div>

<script>
var API = 'https://convertar-app-production.up.railway.app';
var WA  = '5492235551148';
var catalogo = null;

function ars(n){ return '$' + Math.round(n).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.'); }

/* Cargar catálogo */
fetch(API + '/api/catalogo-cortinas')
  .then(function(r){ return r.json(); })
  .then(function(data){ catalogo = data; })
  .catch(function(){ catalogo = {}; });

/* Inputs */
document.getElementById('alto').addEventListener('input', calcular);
document.getElementById('ancho').addEventListener('input', calcular);

var _addonsActivos = {};

function calcular() {
  var alto  = parseInt(document.getElementById('alto').value) || 0;
  var ancho = parseInt(document.getElementById('ancho').value) || 0;
  if (alto < 100 || ancho < 50) { document.getElementById('ph-resultado').style.display = 'none'; return; }

  document.getElementById('ph-resultado').style.display = 'block';
  if (!catalogo) { document.getElementById('ph-spinner').style.display='block'; document.getElementById('ph-contenido').style.display='none'; return; }
  document.getElementById('ph-spinner').style.display='none';
  document.getElementById('ph-contenido').style.display='block';

  /* Encontrar cortina: la que mide >= alto del cliente */
  var rangos = [
    { max:210, key:'210cm' }, { max:220, key:'220cm' },
    { max:240, key:'240cm' }, { max:260, key:'260cm' },
    { max:280, key:'280cm' }, { max:320, key:'300cm' }
  ];
  var key = null;
  for (var i=0;i<rangos.length;i++) { if (alto <= rangos[i].max) { key = rangos[i].key; break; } }
  if (!key) key = '300cm';

  var cortina = catalogo.cortinas && catalogo.cortinas[key];
  if (!cortina) {
    document.getElementById('ph-prod-nombre').textContent = 'No encontramos una cortina para esa medida';
    return;
  }

  var panos = Math.ceil(ancho / 130);
  var subtotal = cortina.precio * panos;
  var subtotalT = cortina.precioTransf * panos;

  /* Imagen */
  var img = document.getElementById('ph-prod-img');
  if (cortina.imagen) { img.src = cortina.imagen; img.style.display='block'; }
  else { img.style.display='none'; }

  document.getElementById('ph-prod-nombre').textContent = cortina.nombre;
  /* Tip: explica por qué esa medida */
  var tipEl = document.getElementById('ph-medida-tip');
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.id='ph-medida-tip'; tipEl.style.cssText='font-size:11px;color:#888;margin-top:4px'; document.getElementById('ph-prod-nombre').after(tipEl); }
  tipEl.textContent = 'Tu ventana mide ' + alto + 'cm · Te recomendamos esta medida para que cubra bien';
  document.getElementById('ph-panos').textContent = panos + (panos===1?' paño':' paños');
  document.getElementById('ph-precio-unidad').textContent = ars(cortina.precio) + ' c/u';
  document.getElementById('ph-subtotal-cortinas').textContent = ars(subtotal);
  document.getElementById('ph-subtotal-transf').textContent = 'Con transferencia: ' + ars(subtotalT);

  /* Addons */
  var addonsList = [];
  if (catalogo.voile) addonsList.push({ key:'voile', emoji:'🌿', nombre:'Voile', desc: panos+' paño'+(panos>1?'s':''), obj: catalogo.voile, qty: panos });
  if (catalogo.cuadros_x3) addonsList.push({ key:'x3', emoji:'🖼️', nombre:'Set x3 Cuadros', desc:'40x35 · Envío gratis', obj: catalogo.cuadros_x3, qty:1 });
  if (catalogo.cuadros_x6) addonsList.push({ key:'x6', emoji:'🖼️', nombre:'Set x6 Cuadros', desc:'30x20 · Envío gratis', obj: catalogo.cuadros_x6, qty:1 });

  var addonsEl = document.getElementById('ph-addons');
  addonsEl.innerHTML = '';
  addonsList.forEach(function(a) {
    var total = a.obj.precio * a.qty;
    var totalT = a.obj.precioTransf * a.qty;
    var div = document.createElement('div');
    div.className = 'ph-addon' + (_addonsActivos[a.key] ? ' active' : '');
    div.dataset.key = a.key;
    div.innerHTML =
      '<div class="ph-addon-check">' + (_addonsActivos[a.key]?'✓':'') + '</div>' +
      '<div class="ph-addon-info">' +
        '<div class="ph-addon-name">' + a.emoji + ' ' + a.nombre + '</div>' +
        '<div class="ph-addon-desc">' + a.desc + '</div>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<div class="ph-addon-price">' + ars(total) + '</div>' +
        '<div class="ph-addon-transf">' + ars(totalT) + ' transf.</div>' +
      '</div>';
    div.addEventListener('click', function() {
      _addonsActivos[a.key] = !_addonsActivos[a.key];
      calcular();
    });
    addonsEl.appendChild(div);
  });

  /* Total */
  var totalBase = subtotal, totalT2 = subtotalT;
  addonsList.forEach(function(a) {
    if (_addonsActivos[a.key]) {
      totalBase += a.obj.precio * a.qty;
      totalT2   += a.obj.precioTransf * a.qty;
    }
  });
  document.getElementById('ph-total').textContent = ars(totalBase);
  document.getElementById('ph-total-transf').textContent = ars(totalT2);

  /* CTAs */
  var ctasEl = document.getElementById('ph-ctas');
  ctasEl.innerHTML = '';

  var btnProd = document.createElement('a');
  btnProd.className = 'ph-btn ph-btn-primary';
  btnProd.href = cortina.url;
  btnProd.target = '_blank';
  btnProd.innerHTML = '🛒 Ver cortina en la tienda';
  ctasEl.appendChild(btnProd);

  var msg = encodeURIComponent('Hola! Necesito ' + panos + ' paño(s) de cortina ' + alto + 'cm x ancho total ' + ancho + 'cm. ¿Me podés ayudar?');
  var btnWA = document.createElement('a');
  btnWA.className = 'ph-btn ph-btn-wa';
  btnWA.href = 'https://wa.me/' + WA + '?text=' + msg;
  btnWA.target = '_blank';
  btnWA.innerHTML = '💬 Consultar por WhatsApp';
  ctasEl.appendChild(btnWA);
}
</script>
</body>
</html>`);
});

// ── LANDING DE CORTINAS BLACKOUT ─────────────────────
// GET /cortinas — landing de conversión, inyecta WA_CORTINAS desde env
app.get('/cortinas', (req, res) => {
  const filePath = path.join(__dirname, 'cortinas.html');
  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) { res.status(500).send('Error cargando landing'); return; }
    const waNum = process.env.WA_CORTINAS || '5491158881880';
    const out = html.replace('__WA_NUM__', waNum);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(out);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ConvertAR backend corriendo en puerto ${PORT}`);
});
