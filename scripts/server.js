const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { loginHotmart } = require('./hotmart-login');
const { scrapeVentas } = require('./hotmart-ventas');

const app = express();
const PORT = process.env.PORT || 3001;

// Cliente Supabase con service role key para inserts server-side (bypasa RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000'] }));
app.use(express.json());

let browserSession = null;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', session: !!browserSession });
});

// ----- Solo login -----
app.post('/run-hotmart-login', async (_req, res) => {
  try {
    if (browserSession) {
      await browserSession.browser.close().catch(() => {});
      browserSession = null;
    }

    console.log('[Server] Iniciando login en Hotmart...');
    const result = await loginHotmart();
    browserSession = result;

    res.json({
      success: true,
      message: 'Login completado exitosamente',
      url: result.currentUrl,
    });
  } catch (err) {
    console.error('[Server] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----- Login + scraping de Mis ventas + guardar en DB -----
app.post('/run-hotmart-scrape', async (_req, res) => {
  let browser = null;
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'Faltan variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en scripts/.env. ' +
        'Consigue el Service Role Key en: Supabase Dashboard → Project Settings → API → service_role'
      );
    }

    console.log('[Server] Iniciando scraping completo de Hotmart...');

    // 1. Login
    const loginResult = await loginHotmart();
    browser = loginResult.browser;
    const page = loginResult.page;

    if (!loginResult.success) {
      throw new Error('El login falló. Verifica las credenciales en scripts/.env');
    }

    // 2. Scrapear Mis ventas
    const ventas = await scrapeVentas(page);
    console.log(`[Server] Ventas encontradas: ${ventas.length}`);

    if (ventas.length === 0) {
      await browser.close();
      return res.json({
        success: true,
        message: 'Login exitoso pero no se encontraron ventas. Revisa ventas-debug.png y ventas-debug.html en scripts/',
        inserted: 0,
        skipped: 0,
        total: 0,
      });
    }

    // 3. Guardar en Supabase (upsert para evitar duplicados por transaction_code)
    let inserted = 0;
    let skipped = 0;
    const errors = [];

    for (const venta of ventas) {
      const record = {
        transaction_code: venta.transaction_code || null,
        buyer_name: venta.buyer_name || null,
        buyer_email: venta.buyer_email || null,
        product_name: venta.product_name || null,
        purchase_date: venta.purchase_date || null,
        fecha_compra_raw: venta.fecha_compra_raw || null,
        status: venta.status || null,
        value_raw: venta.value_raw || null,
        raw_data: venta.raw_data || null,
        scraped_at: new Date().toISOString(),
      };

      if (record.transaction_code) {
        // Upsert por transaction_code para no duplicar
        const { error } = await supabase
          .from('hotmart_ventas')
          .upsert(record, { onConflict: 'transaction_code', ignoreDuplicates: false });

        if (error) {
          errors.push(error.message);
          skipped++;
        } else {
          inserted++;
        }
      } else {
        // Sin código de transacción: insertar siempre (no tenemos clave única)
        const { error } = await supabase.from('hotmart_ventas').insert(record);
        if (error) {
          errors.push(error.message);
          skipped++;
        } else {
          inserted++;
        }
      }
    }

    await browser.close();

    console.log(`[Server] ✅ Guardadas: ${inserted}, Saltadas/Error: ${skipped}`);

    res.json({
      success: true,
      message: `Scraping completado. ${inserted} ventas guardadas en la base de datos.`,
      inserted,
      skipped,
      total: ventas.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    });
  } catch (err) {
    console.error('[Server] Error en scraping:', err.message);
    if (browser) await browser.close().catch(() => {});
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/close-session', async (_req, res) => {
  if (browserSession) {
    await browserSession.browser.close().catch(() => {});
    browserSession = null;
    res.json({ success: true, message: 'Sesión cerrada' });
  } else {
    res.json({ success: true, message: 'No había sesión activa' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor de scripts Hotmart corriendo en http://localhost:${PORT}`);
  console.log('Endpoints disponibles:');
  console.log(`  GET  /health`);
  console.log(`  POST /run-hotmart-login      → Solo login`);
  console.log(`  POST /run-hotmart-scrape     → Login + Mis ventas → Supabase`);
  console.log(`  POST /close-session\n`);
});
