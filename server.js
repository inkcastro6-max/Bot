const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 INICIANDO SISTEMA KLEY OFICIAL VIP...');

const bot = spawn('node', [path.join(__dirname, 'bot/index.js')], { stdio: 'inherit' });
const admin = spawn('node', [path.join(__dirname, 'admin/server.js')], { 
  stdio: 'inherit', 
  env: { ...process.env, ADMIN_PORT: process.env.PORT || 8080 } 
});

console.log('✅ SISTEMA EN MARCHA. MIRA LOS LOGS PARA EL CÓDIGO DE VINCULACIÓN.');
