const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

// Rutas de datos
const DATA_PATH = path.join(__dirname, '../data/products.json');
const ORDERS_PATH = path.join(__dirname, '../data/orders.json');

function loadData() { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); }
function loadOrders() { return JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8')); }
function saveOrders(orders) { fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2)); }

const sessions = {};
function getSession(from) {
    if (!sessions[from]) sessions[from] = { step: 'welcome', data: {} };
    return sessions[from];
}
function resetSession(from) { sessions[from] = { step: 'welcome', data: {} }; }

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '../.wwebjs_auth') }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage'
        ]
    }
});

// VINCULACIÓN POR NÚMERO
client.on('qr', async (qr) => {
    try {
        const pairingCode = await client.requestPairingCode('573206734323'); 
        console.log('\n--------------------------------------------');
        console.log('🔑 TU CÓDIGO DE VINCULACIÓN ES:', pairingCode);
        console.log('--------------------------------------------\n');
    } catch (err) { console.error('Error al pedir código:', err); }
});

client.on('ready', () => { console.log('✅ ¡Bot KLEY OFICIAL VIP conectado!'); });

client.on('message', async (msg) => {
    if (msg.from.includes('@g.us')) return;
    const data = loadData();
    const session = getSession(msg.from);
    const text = msg.body.trim();
    const textLower = text.toLowerCase();

    if (['menu', 'inicio', 'hola', 'start'].includes(textLower)) resetSession(msg.from);

    if (session.step === 'welcome') {
        await msg.reply(`¡Hola! 👋 Bienvenido a *<LaTex>${data.settings.bot_name}* 🌟\n¿Cómo te llamas? 😊`);
        session.step = 'get_name';
        return;
    }

    if (session.step === 'get_name') {
        session.data.name = text;
        session.step = 'main_menu';
        await msg.reply(`¡Perfecto, $</LaTex>{text}! 😊 ¿Qué dispositivo tienes?\n\n*1.* 📱 Android\n*2.* 🍎 iPhone\n*3.* ⭐ Cuentas Root\n\nEscribe el número:`);
        return;
    }

    if (session.step === 'main_menu') {
        if (text === '1') { session.step = 'android_products'; await showProducts(msg, 'android', data); }
        else if (text === '2') { session.step = 'iphone_products'; await showProducts(msg, 'iphone', data); }
        else if (text === '3') { session.step = 'cuentas_products'; await showProducts(msg, 'cuentas', data); }
        else await msg.reply('❌ Elige 1, 2 o 3.');
        return;
    }

    if (['android_products', 'iphone_products', 'cuentas_products'].includes(session.step)) {
        const cat = session.step.split('_')[0];
        let products = (cat === 'cuentas') ? data.categories.cuentas.subcategories.root.products : data.categories[cat].products;
        products = products.filter(p => p.available);
        const idx = parseInt(text) - 1;
        if (isNaN(idx) || idx < 0 || idx >= products.length) return msg.reply('❌ Número no válido.');
        
        const product = products[idx];
        if (product.maintenance) return msg.reply('🔧 Producto en mantenimiento. Escribe *menu*.');
        
        session.data.product = product;
        session.data.category = cat;
        
        if (cat === 'android') {
            session.step = 'ask_device_android';
            await msg.reply(`✅ *${product.name}*\n\n¿Tienes Root?\n*1.* No\n*2.* Sí`);
        } else {
            session.data.device = (cat === 'iphone') ? 'iPhone' : 'PC/Root';
            session.step = 'ask_country';
            await showCountries(msg);
        }
        return;
    }

    if (session.step === 'ask_device_android') {
        session.data.device = (text === '2') ? 'Android Root' : 'Android';
        session.step = 'ask_country';
        await showCountries(msg);
        return;
    }

    if (session.step === 'ask_country') {
        const countries = { '1':'venezuela', '2':'colombia', '3':'peru', '4':'ecuador', '5':'brasil', '6':'bolivia', '7':'paraguay', '8':'dominicana', '9':'internacional' };
        const cKey = countries[text];
        if (!cKey) return msg.reply('❌ Elige del 1 al 9.');
        
        session.data.countryKey = cKey;
        const priceGroup = (cKey === 'venezuela') ? 'venezuela' : 'internacional';
        const prices = data.categories[session.data.category]?.prices?.[priceGroup] || [];
        
        if (prices.length > 0) {
            session.step = 'ask_days';
            let list = `📅 *Elige tu plan:*\n\n`;
            prices.forEach((p, i) => { list += `*${i+1}.* <LaTex>${p.label} – $</LaTex>${p.price} USD\n`; });
            await msg.reply(list);
        } else {
            session.step = 'waiting_receipt';
            await showPayment(msg, session, data);
        }
        return;
    }

    if (session.step === 'ask_days') {
        const priceGroup = (session.data.countryKey === 'venezuela') ? 'venezuela' : 'internacional';
        const prices = data.categories[session.data.category].prices[priceGroup];
        const selected = prices[parseInt(text)-1];
        if (!selected) return msg.reply('❌ Elige un número de la lista.');
        session.data.plan = selected;
        session.step = 'waiting_receipt';
        await showPayment(msg, session, data);
        return;
    }

    if (session.step === 'waiting_receipt') {
        if (msg.hasMedia) {
            const orders = loadOrders();
            const order = { id: Date.now(), name: session.data.name, product: session.data.product.name, status: 'pending' };
            orders.pending.push(order);
            saveOrders(orders);
            await msg.reply('✅ ¡Comprobante recibido! Confirmaremos tu pago en breve. 🙏');
            resetSession(msg.from);
        } else await msg.reply('📸 Por favor, envía la captura del pago.');
        return;
    }
});

async function showProducts(msg, cat, data) {
    let products = (cat === 'cuentas') ? data.categories.cuentas.subcategories.root.products : data.categories[cat].products;
    let list = `🛒 *Productos <LaTex>${cat.toUpperCase()}:*\n\n`;
    products.filter(p => p.available).forEach((p, i) => { list += `*$</LaTex>{i+1}.* ${p.name}\n`; });
    await msg.reply(list + '\nEscribe el número:');
}

async function showCountries(msg) {
    await msg.reply(`🌍 *País:*\n1.🇻🇪 2.🇨🇴 3.🇵🇪 4.🇪🇨 5.🇧🇷 6.🇧🇴 7.🇵🇾 8.🇩🇴 9.🌍 Otro`);
}

async function showPayment(msg, session, data) {
    const pm = data.payment_methods[session.data.countryKey] || data.payment_methods['internacional_zelle'];
    await msg.reply(`${pm.details}\n\n📸 *Envía captura del pago:*`);
}

client.initialize();
