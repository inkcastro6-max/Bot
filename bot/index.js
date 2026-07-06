const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

client.on('qr', async () => {
    try {
        const pairingCode = await client.requestPairingCode('573206734323'); 
        console.log('\n********************************************');
        console.log('ð TU CÃDIGO DE VINCULACIÃN ES:', pairingCode);
        console.log('********************************************\n');
        console.log('Pasos: WhatsApp -> ConfiguraciÃ³n -> Dispositivos vinculados -> Vincular con nÃºmero de telÃ©fono.');
    } catch (err) { console.error('Error al generar cÃ³digo:', err); }
});

client.on('ready', () => { console.log('â BOT KLEY OFICIAL VIP CONECTADO Y LISTO'); });

client.on('message', async (msg) => {
    if (msg.from.includes('@g.us')) return;
    const from = msg.from;
    const data = loadData();
    const session = getSession(from);
    const text = msg.body.trim().toLowerCase();

    if (['hola', 'menu', 'inicio', 'start'].includes(text)) resetSession(from);

    if (session.step === 'welcome') {
        await msg.reply(`Â¡Hola! ð Bienvenido a *KLEY OFICIAL VIP* ð\n\nÂ¿CÃ³mo te llamas? ð`);
        session.step = 'get_name';
        return;
    }

    if (session.step === 'get_name') {
        session.data.name = msg.body;
        session.step = 'ask_device';
        await msg.reply(`Â¡Perfecto, ${msg.body}! ð Antes que nada, *Â¿quÃ© telÃ©fono tienes?*\n\n1. ð± Android\n2. ð iPhone\n3. ð» PC`);
        return;
    }

    if (session.step === 'ask_device') {
        if (text === '1') {
            session.data.device_type = 'Android';
            session.step = 'ask_root';
            await msg.reply("Â¿Tu Android tiene *Root*? ð\n\n1. SÃ­\n2. No");
        } else if (text === '2') {
            session.data.device_type = 'iPhone';
            session.step = 'show_products';
            await showProducts(msg, 'iphone', data);
        } else if (text === '3') {
            await msg.reply("ð§ La categorÃ­a *PC* estÃ¡ en mantenimiento ahora mismo. Escribe *menu* para volver.");
            delete sessions[from];
        } else await msg.reply("Elige 1, 2 o 3.");
        return;
    }

    if (session.step === 'ask_root') {
        session.data.is_root = (text === '1') ? 'Si' : 'No';
        session.step = 'show_products';
        await showProducts(msg, 'android', data);
        return;
    }

    if (session.step === 'show_products') {
        const cat = session.data.device_type.toLowerCase();
        let products = (cat === 'android') ? data.categories.android.products : data.categories.iphone.products;
        products = products.filter(p => p.available);
        const idx = parseInt(text) - 1;
        if (isNaN(idx) || idx < 0 || idx >= products.length) return msg.reply("â NÃºmero no vÃ¡lido.");
        
        session.data.product = products[idx];
        session.step = 'ask_payment';
        await msg.reply(`Elegiste *${products[idx].name}*.\n\nð³ *Elige mÃ©todo de pago:*\n1. Pago MÃ³vil (VEN)\n2. Nequi (COL)\n3. Yape (PER)\n4. Zelle/WU (INT)`);
        return;
    }

    if (session.step === 'ask_payment') {
        session.data.payment_idx = text;
        session.step = 'wait_receipt';
        let info = (text === '1') ? data.payment_methods.venezuela.details : 
                   (text === '2') ? data.payment_methods.colombia.details : 
                   data.payment_methods.internacional_zelle.details;
        await msg.reply(`${info}\n\nâ ï¸ *ENVÃA LA CAPTURA DEL COMPROBANTE* aquÃ­ para confirmar.`);
        return;
    }

    if (session.step === 'wait_receipt') {
        if (msg.hasMedia) {
            await msg.reply("â *Â¡Recibido!* Confirmaremos tu pago manualmente en breve. Â¡Gracias!");
            delete sessions[from];
        } else await msg.reply("â EnvÃ­a la *CAPTURA* del pago.");
        return;
    }
});

async function showProducts(msg, cat, data) {
    let products = data.categories[cat].products.filter(p => p.available);
    let list = `ð *Productos ${cat.toUpperCase()}:*\n\n`;
    products.forEach((p, i) => { list += `*${i+1}.* ${p.name}\n`; });
    await msg.reply(list + '\nEscribe el nÃºmero:');
}

client.initialize();
