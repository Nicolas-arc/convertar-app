-- ═══════════════════════════════════════════════════
--  ConvertAR — Schema SQL para Supabase
--  Pegá esto en Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════

-- Tabla de tiendas
CREATE TABLE IF NOT EXISTS shops (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  email       TEXT,
  plan        TEXT DEFAULT 'starter',
  config      JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de eventos (tracking)
CREATE TABLE IF NOT EXISTS events (
  id            BIGSERIAL PRIMARY KEY,
  shop_id       TEXT REFERENCES shops(id) ON DELETE CASCADE,
  product_id    TEXT,
  product_name  TEXT,
  event_type    TEXT NOT NULL, -- productView | addToCart | purchase
  session_id    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance en las queries de analytics
CREATE INDEX IF NOT EXISTS idx_events_shop_created  ON events(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_shop_product  ON events(shop_id, product_id);
CREATE INDEX IF NOT EXISTS idx_events_type          ON events(shop_id, event_type);

-- Insertar Pintos Home como primera tienda
INSERT INTO shops (id, name, url, email, plan, config) VALUES (
  'pintoshogar',
  'Pintos Home',
  'pintoshogar.com.ar',
  'info@pintoshogar.com.ar',
  'pro',
  '{
    "features": {
      "envio_badge": true,
      "precio_tachado": true,
      "tags": true,
      "countdown": false,
      "video_slider": false,
      "desc_premium": false,
      "faq": true,
      "sticky_bar": false,
      "reviews": false
    },
    "envio": {
      "tipo": "gratis",
      "texto": "Envío gratis a todo el país"
    },
    "tags": {},
    "countdown": {
      "enabled": false,
      "end_date": null,
      "texto": "Oferta termina en"
    },
    "faq": [
      { "q": "¿Los productos vienen listos para instalar?", "a": "Sí, todos incluyen todo lo necesario para su instalación o colgado." },
      { "q": "¿Qué pasa si el producto llega dañado?", "a": "Todos los envíos están asegurados. Escribinos por WhatsApp con foto y lo reponemos sin costo." },
      { "q": "¿En cuántos días recibo mi pedido?", "a": "GBA: 2-4 días hábiles. Interior del país: 5-10 días hábiles." },
      { "q": "¿Puedo personalizar colores o diseño?", "a": "Sí, trabajamos pedidos personalizados. Escribinos por WhatsApp con tu idea." }
    ],
    "reviews": []
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Tabla de landings generadas
CREATE TABLE IF NOT EXISTS landings (
  slug        TEXT PRIMARY KEY,
  nombre      TEXT,
  shop_id     TEXT,
  html        TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Vista útil: conversión por producto (últimos 30 días)
CREATE OR REPLACE VIEW product_conversion AS
SELECT
  shop_id,
  product_id,
  product_name,
  COUNT(*) FILTER (WHERE event_type = 'productView')  AS views,
  COUNT(*) FILTER (WHERE event_type = 'addToCart')    AS carts,
  COUNT(*) FILTER (WHERE event_type = 'purchase')     AS purchases,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'purchase')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'productView'), 0) * 100, 2
  ) AS conversion_pct
FROM events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY shop_id, product_id, product_name
ORDER BY purchases DESC;
