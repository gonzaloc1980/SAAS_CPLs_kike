const path = require('path');
const fs = require('fs');

/**
 * Navega a "Mis ventas" y scrapea todas las ventas con paginación.
 * @param {import('puppeteer').Page} page - Página de Puppeteer ya logueada
 * @returns {Promise<Array>} Array de objetos con los datos de cada venta
 */
async function scrapeVentas(page) {
  console.log('[Ventas] Esperando que cargue el dashboard...');
  await wait(3000);

  // ---- 1. Navegar a "Mis ventas" ----
  console.log('[Ventas] Buscando enlace "Mis ventas"...');

  // Intentar click en el link del sidebar con el span exacto que indicó el usuario
  const clicked = await page.evaluate(() => {
    // Buscar cualquier nodo de texto que diga "Mis ventas"
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.textContent.trim() === 'Mis ventas') {
        // Subir hasta encontrar un elemento clicable (a, button, li)
        let el = node.parentElement;
        for (let i = 0; i < 5 && el; i++) {
          if (['A', 'BUTTON', 'LI'].includes(el.tagName)) {
            el.click();
            return { found: true, tag: el.tagName, href: el.href || '' };
          }
          el = el.parentElement;
        }
        // Si no encontró elemento clicable, hacer click en el padre inmediato
        node.parentElement.click();
        return { found: true, tag: 'SPAN', href: '' };
      }
    }
    return { found: false };
  });

  if (!clicked.found) {
    // Fallback: ir directamente a la URL de ventas
    console.log('[Ventas] Enlace no encontrado en el DOM, intentando URL directa...');
    await page.goto('https://app.hotmart.com/sales/history', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
  } else {
    console.log(`[Ventas] Click en "${clicked.tag}" ${clicked.href || ''}`);
    // Esperar posible navegación SPA
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
      wait(5000), // máximo 5s si es SPA sin navegación real
    ]).catch(() => {});
  }

  await wait(3000);
  console.log('[Ventas] URL actual:', page.url());

  // ---- 2. Tomar screenshot de diagnóstico ----
  const screenshotPath = path.resolve(__dirname, 'ventas-debug.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('[Ventas] Screenshot guardado en:', screenshotPath);

  // ---- 3. Scraping con paginación ----
  const allSales = [];
  let pageNum = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`[Ventas] Scrapeando página ${pageNum}...`);
    await wait(2000);

    const { sales, debug } = await page.evaluate(() => {
      const results = [];

      // --- Estrategia 1: tabla HTML clásica ---
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const headers = Array.from(table.querySelectorAll('thead th, thead td'))
          .map(th => th.textContent.trim());

        const rows = table.querySelectorAll('tbody tr');
        if (rows.length === 0) continue;

        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length === 0) return;
          const obj = { _source: 'table' };
          cells.forEach((cell, i) => {
            const header = headers[i] || `col_${i}`;
            obj[header] = cell.textContent.trim();
          });
          results.push(obj);
        });

        if (results.length > 0) return { sales: results, debug: null };
      }

      // --- Estrategia 2: elementos de lista / cards con clase "sale", "transaction", "venda" ---
      const cardSelectors = [
        '[class*="transaction-row"]',
        '[class*="sale-row"]',
        '[class*="venda"]',
        '[data-test*="sale"]',
        '[data-test*="transaction"]',
      ];

      for (const sel of cardSelectors) {
        const cards = document.querySelectorAll(sel);
        if (cards.length > 0) {
          cards.forEach(card => {
            results.push({ _source: sel, _text: card.textContent.replace(/\s+/g, ' ').trim() });
          });
          return { sales: results, debug: null };
        }
      }

      // --- Estrategia 3: cualquier div/span con fecha en formato DD/MM/YYYY ---
      const datePattern = /\d{2}\/\d{2}\/\d{4}/;
      const allText = document.querySelectorAll('td, [class*="date"], [class*="data"], [class*="fecha"]');
      const datesFound = [];
      allText.forEach(el => {
        const txt = el.textContent.trim();
        if (datePattern.test(txt)) {
          datesFound.push({ _source: 'date-search', fecha_compra_raw: txt, _parent: el.closest('tr, [class*="row"]')?.textContent?.replace(/\s+/g, ' ').trim() || '' });
        }
      });
      if (datesFound.length > 0) return { sales: datesFound, debug: null };

      // --- Fallback: debug del DOM ---
      return {
        sales: [],
        debug: {
          url: location.href,
          title: document.title,
          bodySnippet: document.body.innerText.substring(0, 1000),
          tableCount: document.querySelectorAll('table').length,
        },
      };
    });

    if (debug) {
      console.log('[Ventas] ⚠️  No se encontró tabla. Debug info:', JSON.stringify(debug, null, 2));
      // Guardar HTML para diagnóstico
      const html = await page.content();
      fs.writeFileSync(path.resolve(__dirname, 'ventas-debug.html'), html.substring(0, 50000));
      console.log('[Ventas] HTML de diagnóstico guardado en ventas-debug.html');
      break;
    }

    console.log(`[Ventas] Encontradas ${sales.length} ventas en página ${pageNum}`);
    allSales.push(...sales);

    // ---- Paginación: buscar botón "Siguiente" / "Próximo" / ">" ----
    const nextBtn = await page.evaluate(() => {
      const candidates = [
        document.querySelector('[aria-label="Next page"]'),
        document.querySelector('[aria-label="Próxima página"]'),
        document.querySelector('[aria-label="Siguiente página"]'),
        document.querySelector('button[class*="next"]:not([disabled])'),
        document.querySelector('a[class*="next"]:not([class*="disabled"])'),
        // Buscar por texto
        ...Array.from(document.querySelectorAll('button, a')).filter(el => {
          const t = el.textContent.trim();
          return (t === '>' || t === '›' || t === 'Próximo' || t === 'Siguiente') && !el.disabled;
        }),
      ].filter(Boolean);

      if (candidates.length > 0) {
        candidates[0].click();
        return true;
      }
      return false;
    });

    if (nextBtn) {
      pageNum++;
      await wait(2500);
    } else {
      hasMore = false;
    }
  }

  console.log(`[Ventas] ✅ Total ventas scrapeadas: ${allSales.length}`);
  return normalizarVentas(allSales);
}

/**
 * Normaliza los datos scrapeados para extraer los campos clave.
 */
function normalizarVentas(rawSales) {
  const DATE_REGEX = /\d{2}\/\d{2}\/\d{4}/;

  return rawSales.map(sale => {
    const normalized = { raw_data: sale };

    // Buscar fecha de compra en todos los campos
    for (const [key, value] of Object.entries(sale)) {
      const val = String(value || '');
      if (DATE_REGEX.test(val) && (
        key.toLowerCase().includes('fecha') ||
        key.toLowerCase().includes('data') ||
        key.toLowerCase().includes('date') ||
        key.toLowerCase().includes('compra') ||
        key === '_text' ||
        key.startsWith('col_')
      )) {
        const match = val.match(DATE_REGEX);
        if (match) {
          normalized.fecha_compra_raw = match[0];
          // Convertir DD/MM/YYYY a ISO date
          const [dd, mm, yyyy] = match[0].split('/');
          normalized.purchase_date = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`).toISOString();
        }
      }

      // Detectar email del comprador
      if (/^[\w.+-]+@[\w-]+\.[a-z]{2,}$/i.test(val)) {
        normalized.buyer_email = val;
      }

      // Detectar nombre (campos con "comprador", "nombre", "nome")
      if (key.toLowerCase().includes('comprador') || key.toLowerCase().includes('nome') || key.toLowerCase().includes('nombre')) {
        normalized.buyer_name = val;
      }

      // Detectar producto
      if (key.toLowerCase().includes('produto') || key.toLowerCase().includes('producto') || key.toLowerCase().includes('product')) {
        normalized.product_name = val;
      }

      // Detectar código de transacción
      if (key.toLowerCase().includes('código') || key.toLowerCase().includes('codigo') || key.toLowerCase().includes('transac')) {
        normalized.transaction_code = val;
      }

      // Detectar estado
      if (key.toLowerCase().includes('status') || key.toLowerCase().includes('situação') || key.toLowerCase().includes('estado')) {
        normalized.status = val;
      }

      // Detectar valor
      if (key.toLowerCase().includes('valor') || key.toLowerCase().includes('value') || key.toLowerCase().includes('monto')) {
        normalized.value_raw = val;
      }
    }

    return normalized;
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scrapeVentas };
