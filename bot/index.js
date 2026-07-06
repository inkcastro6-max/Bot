const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// ─── Rutas de datos ───────────────────────────────────────────────────────────
const DATA_PATH = path.join(__dirname, '../data/products.json');
const ORDERS_PATH = path.join(__dirname, '../data/orders.json');

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}
function loadOrders() {
  return JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8'));
}
function saveOrders(orders) {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2));
}

// ─── Estado de sesiones por usuario ──────────────────────────────────────────
const sessions = {};

function getSession(from) {
  if (!sessions[from]) {
    sessions[from] = { step: 'welcome', data: {} };
  }
  return sessions[from];
}
function resetSession(from) {
  sessions[from] = { step: 'welcome', data: {} };
}

// ─── Cliente WhatsApp ─────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '../.wwebjs_auth') }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process'
    ],
    executablePath: 'google-chrome-stable'
  }
});


client.on('qr', (qr) => {
  console.log('\n📱 Escanea este QR con WhatsApp:\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Bot de WhatsApp KLEY OFICIAL VIP conectado y listo!');
});

client.on('auth_failure', () => {
  console.error('❌ Error de autenticación. Borra la carpeta .wwebjs_auth y vuelve a escanear.');
});

// ─── Manejo de mensajes ───────────────────────────────────────────────────────
client.on('message', async (msg) => {
  const from = msg.from;

  // Ignorar mensajes de grupos
  if (from.includes('@g.us')) return;

  const data = loadData();
  const session = getSession(from);
  const text = msg.body.trim();
  const textLower = text.toLowerCase();

  // Comando de reinicio
  if (textLower === 'menu' || textLower === 'inicio' || textLower === 'hola' || textLower === 'start') {
    resetSession(from);
    session.step = 'welcome';
  }

  // ─── PASO 1: Bienvenida y nombre ─────────────────────────────────────────
  if (session.step === 'welcome') {
    await msg.reply(
      `¡Hola! 👋 Bienvenido a *${data.settings.bot_name}* 🌟\nLo mejor del momento 🚀\n\n¿Cómo te llamas? 😊`
    );
    session.step = 'get_name';
    return;
  }

  // ─── PASO 2: Guardar nombre y mostrar menú principal ─────────────────────
  if (session.step === 'get_name') {
    session.data.name = text;
    await showMainMenu(msg, session, data);
    return;
  }

  // ─── PASO 3: Menú principal ───────────────────────────────────────────────
  if (session.step === 'main_menu') {
    if (text === '1') {
      // Android
      const cat = data.categories.android;
      if (cat.maintenance) {
        await msg.reply(`🔧 *Mantenimiento*\n\n${cat.maintenance_message}\n\nEscribe *menu* para volver al inicio.`);
        return;
      }
      session.step = 'android_products';
      await showAndroidProducts(msg, session, data);
    } else if (text === '2') {
      // iPhone
      const cat = data.categories.iphone;
      if (cat.maintenance) {
        await msg.reply(`🔧 *Mantenimiento*\n\n${cat.maintenance_message}\n\nEscribe *menu* para volver al inicio.`);
        return;
      }
      session.step = 'iphone_products';
      await showIphoneProducts(msg, session, data);
    } else if (text === '3') {
      // Cuentas / Root
      const cat = data.categories.cuentas;
      if (cat.maintenance) {
        await msg.reply(`🔧 *Mantenimiento*\n\n${cat.maintenance_message}\n\nEscribe *menu* para volver al inicio.`);
        return;
      }
      session.step = 'cuentas_products';
      await showCuentasProducts(msg, session, data);
    } else {
      await msg.reply('❌ Opción no válida. Por favor elige *1*, *2* o *3*.');
    }
    return;
  }

  // ─── ANDROID: Selección de producto ──────────────────────────────────────
  if (session.step === 'android_products') {
    const products = data.categories.android.products.filter(p => p.available);
    const idx = parseInt(text) - 1;
    if (isNaN(idx) || idx < 0 || idx >= products.length) {
      await msg.reply('❌ Número no válido. Elige un número de la lista o escribe *menu* para volver.');
      return;
    }
    const product = products[idx];
    if (product.maintenance) {
      await msg.reply(`🔧 *${product.name}* está en mantenimiento en este momento.\n\nEscribe *menu* para volver al menú principal.`);
      return;
    }
    session.data.product = product;
    session.data.category = 'android';
    session.step = 'ask_device_android';
    await msg.reply(
      `✅ Seleccionaste: *${product.name}*\n\n📱 ¿Cuál es tu dispositivo?\n\n*1.* Android\n*2.* Android con Root\n\nEscribe el número de tu opción:`
    );
    return;
  }

  // ─── ANDROID: Dispositivo ─────────────────────────────────────────────────
  if (session.step === 'ask_device_android') {
    if (text === '1') {
      session.data.device = 'Android';
    } else if (text === '2') {
      session.data.device = 'Android Root';
    } else {
      await msg.reply('❌ Opción no válida. Escribe *1* para Android o *2* para Android Root.');
      return;
    }
    session.step = 'ask_country_android';
    await showCountryMenu(msg);
    return;
  }

  // ─── IPHONE: Selección de producto ───────────────────────────────────────
  if (session.step === 'iphone_products') {
    const products = data.categories.iphone.products.filter(p => p.available);
    const idx = parseInt(text) - 1;
    if (isNaN(idx) || idx < 0 || idx >= products.length) {
      await msg.reply('❌ Número no válido. Elige un número de la lista o escribe *menu* para volver.');
      return;
    }
    const product = products[idx];
    if (product.maintenance) {
      await msg.reply(`🔧 *${product.name}* está en mantenimiento en este momento.\n\nEscribe *menu* para volver al menú principal.`);
      return;
    }
    session.data.product = product;
    session.data.category = 'iphone';
    session.data.device = 'iPhone';
    session.step = 'ask_country_iphone';
    await showCountryMenu(msg);
    return;
  }

  // ─── CUENTAS: Selección de producto ──────────────────────────────────────
  if (session.step === 'cuentas_products') {
    const products = data.categories.cuentas.subcategories.root.products.filter(p => p.available);
    const idx = parseInt(text) - 1;
    if (isNaN(idx) || idx < 0 || idx >= products.length) {
      await msg.reply('❌ Número no válido. Elige un número de la lista o escribe *menu* para volver.');
      return;
    }
    const product = products[idx];
    if (product.maintenance) {
      await msg.reply(`🔧 *${product.name}* está en mantenimiento en este momento.\n\nEscribe *menu* para volver al menú principal.`);
      return;
    }
    session.data.product = product;
    session.data.category = 'cuentas';
    session.data.device = 'PC / Cuenta';
    session.step = 'ask_country_cuentas';
    await showCountryMenu(msg);
    return;
  }

  // ─── SELECCIÓN DE PAÍS (Android) ─────────────────────────────────────────
  if (session.step === 'ask_country_android') {
    await handleCountrySelection(msg, session, data, text);
    return;
  }

  // ─── SELECCIÓN DE PAÍS (iPhone) ──────────────────────────────────────────
  if (session.step === 'ask_country_iphone') {
    await handleCountrySelection(msg, session, data, text);
    return;
  }

  // ─── SELECCIÓN DE PAÍS (Cuentas) ─────────────────────────────────────────
  if (session.step === 'ask_country_cuentas') {
    await handleCountrySelection(msg, session, data, text);
    return;
  }

  // ─── SELECCIÓN DE DÍAS (solo Android) ────────────────────────────────────
  if (session.step === 'ask_days') {
    const cat = session.data.category;
    const priceGroup = session.data.priceGroup; // 'venezuela' o 'internacional'
    const prices = data.categories[cat]?.prices?.[priceGroup] || [];
    const available = prices.filter(p => p.available);

    const idx = parseInt(text) - 1;
    if (isNaN(idx) || idx < 0 || idx >= available.length) {
      await msg.reply('❌ Número no válido. Elige un número de la lista.');
      return;
    }
    const selected = available[idx];
    session.data.plan = selected;
    session.step = 'ask_payment';
    await showPaymentMethod(msg, session, data);
    return;
  }

  // ─── MÉTODO DE PAGO ───────────────────────────────────────────────────────
  if (session.step === 'ask_payment') {
    const countryKey = session.data.countryKey;
    const pm = data.payment_methods[countryKey];

    if (!pm) {
      await msg.reply('❌ Opción no válida. Escribe *menu* para reiniciar.');
      return;
    }

    // Si es internacional, hay dos opciones
    if (countryKey === 'internacional') {
      if (text === '1') {
        session.data.paymentKey = 'internacional_zelle';
      } else if (text === '2') {
        session.data.paymentKey = 'internacional_wu';
      } else {
        await msg.reply('❌ Escribe *1* para Zelle o *2* para Western Union.');
        return;
      }
    } else {
      session.data.paymentKey = countryKey;
    }

    const selectedPm = data.payment_methods[session.data.paymentKey];
    session.step = 'waiting_receipt';

    const planInfo = session.data.plan
      ? `\n💰 Plan: *${session.data.plan.label}* – $${session.data.plan.price} USD`
      : '';

    await msg.reply(
      `${selectedPm.details}\n${planInfo}\n\n📸 *Por favor, envía el comprobante de pago (captura de pantalla) para verificar tu pago.*`
    );
    return;
  }

  // ─── RECEPCIÓN DE COMPROBANTE ─────────────────────────────────────────────
  if (session.step === 'waiting_receipt') {
    if (msg.hasMedia || msg.type === 'image') {
      session.step = 'receipt_received';

      // Guardar pedido pendiente
      const orders = loadOrders();
      const order = {
        id: Date.now(),
        from: from,
        name: session.data.name || 'Cliente',
        device: session.data.device || 'N/A',
        product: session.data.product?.name || 'N/A',
        category: session.data.category || 'N/A',
        country: session.data.country || 'N/A',
        plan: session.data.plan ? `${session.data.plan.label} – $${session.data.plan.price} USD` : 'A consultar',
        paymentMethod: session.data.paymentKey || 'N/A',
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      orders.pending.push(order);
      saveOrders(orders);

      await msg.reply(
        `✅ ¡Comprobante recibido!\n\n📋 *Resumen de tu pedido:*\n👤 Nombre: ${order.name}\n📱 Dispositivo: ${order.device}\n🛒 Producto: ${order.product}\n${session.data.plan ? `💰 Plan: ${order.plan}\n` : ''}🌍 País: ${order.country}\n\n⏳ Tu pago está siendo verificado por nuestro equipo. Te confirmaremos en breve. ¡Gracias por tu compra! 🙏\n\nEscribe *menu* para volver al inicio.`
      );

      // Notificar al dueño
      const ownerNumber = data.settings.owner_number;
      if (ownerNumber && ownerNumber !== 'TUNUM') {
        try {
          const ownerChat = `${ownerNumber}@c.us`;
          await client.sendMessage(
            ownerChat,
            `🔔 *NUEVO PEDIDO PENDIENTE*\n\n👤 Cliente: ${order.name}\n📱 Número: ${from.replace('@c.us', '')}\n📱 Dispositivo: ${order.device}\n🛒 Producto: ${order.product}\n${session.data.plan ? `💰 Plan: ${order.plan}\n` : ''}🌍 País: ${order.country}\n💳 Método de pago: ${order.paymentMethod}\n\nRevisa el panel admin para confirmar.`
          );
          // Reenviar la imagen al dueño
          if (msg.hasMedia) {
            const media = await msg.downloadMedia();
            await client.sendMessage(ownerChat, media, { caption: `Comprobante de ${order.name}` });
          }
        } catch (e) {
          console.error('Error notificando al dueño:', e.message);
        }
      }

      resetSession(from);
    } else {
      await msg.reply('📸 Por favor envía una *imagen* (captura de pantalla) del comprobante de pago.');
    }
    return;
  }

  // ─── Fallback ─────────────────────────────────────────────────────────────
  await msg.reply('👋 Escribe *menu* para ver el menú principal.');
});

// ─── Funciones auxiliares ─────────────────────────────────────────────────────

async function showMainMenu(msg, session, data) {
  const name = session.data.name || 'amigo';
  session.step = 'main_menu';
  await msg.reply(
    `¡Perfecto, ${name}! 😊 ¿Qué tipo de dispositivo tienes?\n\n*1.* 📱 Android\n*2.* 🍎 iPhone\n*3.* ⭐ Cuentas Principales (Root)\n\nEscribe el número de tu opción:`
  );
}

async function showAndroidProducts(msg, session, data) {
  const products = data.categories.android.products.filter(p => p.available);
  let list = `📱 *Productos disponibles para Android:*\n\n`;
  products.forEach((p, i) => {
    const status = p.maintenance ? '🔧 (Mantenimiento)' : '✅';
    list += `*${i + 1}.* ${status} ${p.name}\n`;
  });
  list += `\nEscribe el número del producto que deseas comprar:`;
  await msg.reply(list);
}

async function showIphoneProducts(msg, session, data) {
  const products = data.categories.iphone.products.filter(p => p.available);
  let list = `🍎 *Productos disponibles para iPhone:*\n\n`;
  products.forEach((p, i) => {
    const status = p.maintenance ? '🔧 (Mantenimiento)' : '✅';
    list += `*${i + 1}.* ${status} ${p.name}\n`;
  });
  list += `\nEscribe el número del producto que deseas comprar:`;
  await msg.reply(list);
}

async function showCuentasProducts(msg, session, data) {
  const products = data.categories.cuentas.subcategories.root.products.filter(p => p.available);
  let list = `⭐ *Cuentas Principales – Root:*\n\n`;
  products.forEach((p, i) => {
    const status = p.maintenance ? '🔧 (Mantenimiento)' : '✅';
    list += `*${i + 1}.* ${status} ${p.name}\n`;
  });
  list += `\nEscribe el número del producto que deseas comprar:`;
  await msg.reply(list);
}

async function showCountryMenu(msg) {
  await msg.reply(
    `🌍 *¿De qué país eres?*\n\n*1.* 🇻🇪 Venezuela\n*2.* 🇨🇴 Colombia\n*3.* 🇵🇪 Perú\n*4.* 🇪🇨 Ecuador\n*5.* 🇧🇷 Brasil\n*6.* 🇧🇴 Bolivia\n*7.* 🇵🇾 Paraguay\n*8.* 🇩🇴 Rep. Dominicana\n*9.* 🌍 Internacional\n\nEscribe el número de tu país:`
  );
}

const countryMap = {
  '1': { key: 'venezuela', name: 'Venezuela', priceGroup: 'venezuela' },
  '2': { key: 'colombia', name: 'Colombia', priceGroup: 'internacional' },
  '3': { key: 'peru', name: 'Perú', priceGroup: 'internacional' },
  '4': { key: 'ecuador', name: 'Ecuador', priceGroup: 'internacional' },
  '5': { key: 'brasil', name: 'Brasil', priceGroup: 'internacional' },
  '6': { key: 'bolivia', name: 'Bolivia', priceGroup: 'internacional' },
  '7': { key: 'paraguay', name: 'Paraguay', priceGroup: 'internacional' },
  '8': { key: 'dominicana', name: 'Rep. Dominicana', priceGroup: 'internacional' },
  '9': { key: 'internacional', name: 'Internacional', priceGroup: 'internacional' }
};

async function handleCountrySelection(msg, session, data, text) {
  const country = countryMap[text];
  if (!country) {
    await msg.reply('❌ Número no válido. Elige un número del 1 al 9.');
    return;
  }
  session.data.country = country.name;
  session.data.countryKey = country.key;
  session.data.priceGroup = country.priceGroup;

  // Si la categoría tiene precios configurados, mostrar días
  const cat = session.data.category;
  const prices = data.categories[cat]?.prices?.[country.priceGroup] || [];
  const available = prices.filter(p => p.available);

  if (available.length > 0) {
    session.step = 'ask_days';
    let list = `📅 *Elige tu plan:*\n\n`;
    available.forEach((p, i) => {
      list += `*${i + 1}.* ${p.label} – $${p.price} USD\n`;
    });
    list += `\nEscribe el número del plan:`;
    await msg.reply(list);
  } else {
    // Sin precios configurados: ir directo al pago
    session.step = 'ask_payment';
    await showPaymentMethod(msg, session, data);
  }
}

async function showPaymentMethod(msg, session, data) {
  const countryKey = session.data.countryKey;

  if (countryKey === 'internacional') {
    await msg.reply(
      `🌍 *Métodos de pago internacionales disponibles:*\n\n*1.* 💸 Zelle\n*2.* 🏦 Western Union\n\nEscribe *1* o *2* para elegir tu método de pago:`
    );
  } else {
    const pm = data.payment_methods[countryKey];
    if (!pm) {
      await msg.reply('❌ No hay método de pago configurado para tu país. Escribe *menu* para reiniciar.');
      return;
    }
    const planInfo = session.data.plan
      ? `\n💰 Plan: *${session.data.plan.label}* – $${session.data.plan.price} USD`
      : '';
    session.step = 'waiting_receipt';
    await msg.reply(
      `${pm.details}\n${planInfo}\n\n📸 *Por favor, envía el comprobante de pago (captura de pantalla) para verificar tu pago.*`
    );
  }
}

// ─── Iniciar cliente ──────────────────────────────────────────────────────────
client.initialize();
