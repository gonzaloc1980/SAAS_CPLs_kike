const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const puppeteer = require('puppeteer');

const HOTMART_LOGIN_URL =
  'https://sso.hotmart.com/login?service=https%3A%2F%2Fsso.hotmart.com%2Foauth2.0%2FcallbackAuthorize%3Fclient_id%3D8cef361b-94f8-4679-bd92-9d1cb496452d%26scope%3Dopenid%2Bprofile%2Bauthorities%2Bemail%2Buser%2Baddress%26redirect_uri%3Dhttps%253A%252F%252Fapp.hotmart.com%252Fauth%252Flogin%26response_type%3Dcode%26response_mode%3Dquery%26state%3Db7b09e6c920c4d9fbb54bb816a0856b1%26client_name%3DCasOAuthClient';

async function loginHotmart() {
  const email = process.env.HOTMART_EMAIL;
  const password = process.env.HOTMART_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Las variables de entorno HOTMART_EMAIL y HOTMART_PASSWORD son requeridas. ' +
      'Copia scripts/.env.example a scripts/.env y completa las credenciales.'
    );
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('[Login] Navegando a la página de login de Hotmart...');
  await page.goto(HOTMART_LOGIN_URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // --- Campo Email (CAS SSO usa #username) ---
  await page.waitForSelector('#username, input[name="username"], input[type="email"], input[id*="email"]', {
    timeout: 15000,
  });

  const emailField = await page.$('#username, input[name="username"], input[type="email"], input[id*="email"]');
  await emailField.click({ clickCount: 3 });
  await emailField.type(email, { delay: 60 });
  console.log('[Login] Email ingresado');

  // --- Campo Contraseña ---
  const passwordField = await page.$('#password, input[name="password"], input[type="password"]');
  if (passwordField) {
    await passwordField.click({ clickCount: 3 });
    await passwordField.type(password, { delay: 60 });
    console.log('[Login] Contraseña ingresada');
  }

  // --- Click en botón "Entrar" usando los selectores exactos del HTML ---
  await page.waitForSelector('#submit-button, [data-test-id="login-submit"]', { timeout: 10000 });
  await page.click('#submit-button, [data-test-id="login-submit"]');
  console.log('[Login] Clic en botón Entrar');

  // Esperar navegación post-login
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

  const currentUrl = page.url();
  console.log('[Login] URL después del login:', currentUrl);

  const success = currentUrl.includes('app.hotmart.com') && !currentUrl.includes('sso.hotmart.com');
  if (success) {
    console.log('[Login] ✅ Login exitoso');
  } else {
    console.log('[Login] ⚠️  Login posiblemente fallido. URL:', currentUrl);
  }

  return { browser, page, currentUrl, success };
}

// Standalone
if (require.main === module) {
  loginHotmart()
    .then(({ browser }) => {
      console.log('Script finalizado. Cerrando navegador en 5 segundos...');
      setTimeout(() => browser.close(), 5000);
    })
    .catch((err) => {
      console.error('Error durante el login:', err.message);
      process.exit(1);
    });
}

module.exports = { loginHotmart };
