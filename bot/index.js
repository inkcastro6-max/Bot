const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '../.wwebjs_auth') }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ],
        // ESTA ES LA RUTA PARA RAILWAY
        executablePath: '/usr/bin/chromium'
    }
});

client.on('qr', async () => {
    try {
        const pairingCode = await client.requestPairingCode('573206734323'); 
        console.log('\n********************************************');
        console.log('👉 TU CÓDIGO DE VINCULACIÓN ES:', pairingCode);
        console.log('********************************************\n');
    } catch (err) { console.error('Error:', err); }
});

client.on('ready', () => { console.log('✅ BOT KLEY OFICIAL CONECTADO'); });

// --- FLUJO DE CLIENTES ---
const sessions = {};
client.on('message', async (msg) => {
    if (msg.from.includes('@g.us')) return;
    const from = msg.from;
    const text = msg.body.trim().toLowerCase();

    if (!sessions[from] || ['hola', 'menu', 'inicio'].includes(text)) {
        sessions[from] = { step: 'ask_device' };
        await msg.reply("¡Hola! 👋 Bienvenido a *KLEY OFICIAL VIP* 🌟\n\n¿Qué teléfono tienes?\n\n1. 📱 Android\n2. 🍎 iPhone\n3. 💻 PC");
        return;
    }

    const session = sessions[from];
    if (session.step === 'ask_device') {
        if (text === '1') {
            session.step = 'ask_root';
            await msg.reply("¿Tienes Root?\n1. Sí\n2. No");
        } else if (text === '2') {
            session.step = 'show_products';
            await msg.reply("🍎 *Productos IPHONE:*\n\n• FLUORITE ✅\n• MONITE BÁSICO\n• MONITE PRO\n\nEscribe el producto:");
        } else if (text === '3') {
            await msg.reply("🔧 PC en mantenimiento. Escribe *menu*.");
            delete sessions[from];
        }
        return;
    }

    if (session.step === 'ask_root') {
        session.step = 'show_products';
        await msg.reply("📱 *Productos ANDROID:*\n\n• DRIP CLIENT\n• CUBAN MODS\n• HG CHEATS\n\nEscribe el producto:");
        return;
    }

    if (session.step === 'show_products') {
        session.step = 'wait_receipt';
        await msg.reply(`Elegiste *${msg.body}*. Envía la *CAPTURA DEL PAGO* para confirmar.`);
        return;
    }

    if (session.step === 'wait_receipt') {
        if (msg.hasMedia) {
            await msg.reply("✅ *Recibido.* Confirmaremos tu pago pronto. ¡Gracias!");
            delete sessions[from];
        } else {
            await msg.reply("❌ Envía la *CAPTURA* del pago.");
        }
    }
});

client.initialize();
