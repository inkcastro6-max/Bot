const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_PATH = path.join(__dirname, '../data/products.json');
const ORDERS_PATH = path.join(__dirname, '../data/orders.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'kley-admin-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 } // 1 hora
}));

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}
function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}
function loadOrders() {
  return JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8'));
}
function saveOrders(orders) {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2));
}

// ─── Middleware de autenticación ──────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.redirect('/login');
}

// ─── Rutas de autenticación ───────────────────────────────────────────────────
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { password } = req.body;
  const data = loadData();
  if (password === data.settings.admin_password) {
    req.session.admin = true;
    res.redirect('/');
  } else {
    res.redirect('/login?error=1');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ─── Panel principal ──────────────────────────────────────────────────────────
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── API: Obtener todos los datos ─────────────────────────────────────────────
app.get('/api/data', requireAuth, (req, res) => {
  res.json(loadData());
});

// ─── API: Obtener pedidos ─────────────────────────────────────────────────────
app.get('/api/orders', requireAuth, (req, res) => {
  res.json(loadOrders());
});

// ─── API: Confirmar pedido ────────────────────────────────────────────────────
app.post('/api/orders/:id/confirm', requireAuth, (req, res) => {
  const orders = loadOrders();
  const id = parseInt(req.params.id);
  const idx = orders.pending.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Pedido no encontrado' });
  const order = orders.pending.splice(idx, 1)[0];
  order.status = 'confirmed';
  order.confirmedAt = new Date().toISOString();
  orders.completed.push(order);
  saveOrders(orders);
  res.json({ success: true, order });
});

// ─── API: Eliminar pedido ─────────────────────────────────────────────────────
app.delete('/api/orders/:id', requireAuth, (req, res) => {
  const orders = loadOrders();
  const id = parseInt(req.params.id);
  orders.pending = orders.pending.filter(o => o.id !== id);
  orders.completed = orders.completed.filter(o => o.id !== id);
  saveOrders(orders);
  res.json({ success: true });
});

// ─── API: Toggle mantenimiento de categoría ───────────────────────────────────
app.post('/api/category/:cat/maintenance', requireAuth, (req, res) => {
  const data = loadData();
  const cat = req.params.cat;
  if (!data.categories[cat]) return res.status(404).json({ error: 'Categoría no encontrada' });
  data.categories[cat].maintenance = req.body.maintenance;
  if (req.body.message) data.categories[cat].maintenance_message = req.body.message;
  saveData(data);
  res.json({ success: true });
});

// ─── API: Toggle mantenimiento de producto ────────────────────────────────────
app.post('/api/category/:cat/product/:id/maintenance', requireAuth, (req, res) => {
  const data = loadData();
  const { cat, id } = req.params;
  let products = [];
  if (cat === 'cuentas') {
    products = data.categories.cuentas.subcategories.root.products;
  } else if (data.categories[cat]) {
    products = data.categories[cat].products;
  }
  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  product.maintenance = req.body.maintenance;
  product.available = !req.body.maintenance;
  saveData(data);
  res.json({ success: true });
});

// ─── API: Actualizar precios de Android ──────────────────────────────────────
app.put('/api/prices/:cat/:group', requireAuth, (req, res) => {
  const data = loadData();
  const { cat, group } = req.params;
  if (!data.categories[cat] || !data.categories[cat].prices) {
    return res.status(404).json({ error: 'Categoría o grupo no encontrado' });
  }
  data.categories[cat].prices[group] = req.body.prices;
  saveData(data);
  res.json({ success: true });
});

// ─── API: Agregar precio ──────────────────────────────────────────────────────
app.post('/api/prices/:cat/:group', requireAuth, (req, res) => {
  const data = loadData();
  const { cat, group } = req.params;
  if (!data.categories[cat].prices[group]) data.categories[cat].prices[group] = [];
  const newPrice = {
    id: `${req.body.label.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
    label: req.body.label,
    price: parseFloat(req.body.price),
    currency: 'USD',
    available: true
  };
  data.categories[cat].prices[group].push(newPrice);
  saveData(data);
  res.json({ success: true, price: newPrice });
});

// ─── API: Eliminar precio ─────────────────────────────────────────────────────
app.delete('/api/prices/:cat/:group/:priceId', requireAuth, (req, res) => {
  const data = loadData();
  const { cat, group, priceId } = req.params;
  data.categories[cat].prices[group] = data.categories[cat].prices[group].filter(p => p.id !== priceId);
  saveData(data);
  res.json({ success: true });
});

// ─── API: Toggle disponibilidad de precio ────────────────────────────────────
app.post('/api/prices/:cat/:group/:priceId/toggle', requireAuth, (req, res) => {
  const data = loadData();
  const { cat, group, priceId } = req.params;
  const price = data.categories[cat].prices[group].find(p => p.id === priceId);
  if (!price) return res.status(404).json({ error: 'Precio no encontrado' });
  price.available = !price.available;
  saveData(data);
  res.json({ success: true, available: price.available });
});

// ─── API: Actualizar configuración general ────────────────────────────────────
app.put('/api/settings', requireAuth, (req, res) => {
  const data = loadData();
  data.settings = { ...data.settings, ...req.body };
  saveData(data);
  res.json({ success: true });
});

// ─── API: Agregar producto ────────────────────────────────────────────────────
app.post('/api/category/:cat/product', requireAuth, (req, res) => {
  const data = loadData();
  const { cat } = req.params;
  const newProduct = {
    id: req.body.name.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now(),
    name: req.body.name,
    available: true,
    maintenance: false
  };
  if (cat === 'cuentas') {
    data.categories.cuentas.subcategories.root.products.push(newProduct);
  } else {
    data.categories[cat].products.push(newProduct);
  }
  saveData(data);
  res.json({ success: true, product: newProduct });
});

// ─── API: Eliminar producto ───────────────────────────────────────────────────
app.delete('/api/category/:cat/product/:id', requireAuth, (req, res) => {
  const data = loadData();
  const { cat, id } = req.params;
  if (cat === 'cuentas') {
    data.categories.cuentas.subcategories.root.products = data.categories.cuentas.subcategories.root.products.filter(p => p.id !== id);
  } else {
    data.categories[cat].products = data.categories[cat].products.filter(p => p.id !== id);
  }
  saveData(data);
  res.json({ success: true });
});

const PORT = process.env.ADMIN_PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Panel Admin corriendo en http://localhost:${PORT}`);
});
