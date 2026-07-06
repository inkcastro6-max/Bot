// ─── Servidor principal: arranca bot de WhatsApp + panel admin ───────────────
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando KLEY OFICIAL VIP Bot System...\n');

// Iniciar el bot de WhatsApp
const bot = spawn('node', [path.join(__dirname, 'bot/index.js')], {
  stdio: 'inherit',
  env: { ...process.env }
});

bot.on('error', (err) => {
  console.error('❌ Error en el bot:', err.message);
});

bot.on('exit', (code) => {
  console.log(`⚠️ Bot terminó con código ${code}. Reiniciando en 5s...`);
  setTimeout(() => {
    require('child_process').spawn('node', [path.join(__dirname, 'bot/index.js')], {
      stdio: 'inherit',
      detached: false
    });
  }, 5000);
});

// Iniciar el panel admin
const admin = spawn('node', [path.join(__dirname, 'admin/server.js')], {
  stdio: 'inherit',
  env: { ...process.env, ADMIN_PORT: process.env.PORT || 3001 }
});

admin.on('error', (err) => {
  console.error('❌ Error en el panel admin:', err.message);
});

console.log('✅ Sistema iniciado correctamente.');
console.log('📱 Bot de WhatsApp: activo (escanea el QR)');
console.log('🌐 Panel Admin: http://localhost:' + (process.env.PORT || 3001));
