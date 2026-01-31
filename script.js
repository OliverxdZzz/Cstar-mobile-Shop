
const firebaseConfig = {
  apiKey: "AizaSyQpn93QDq6Z9CJT5V7Z1ink_3GV",
  authDomain: "cstar-mobile-shop.firebaseapp.com",
  projectId: "cstar-mobile-shop",
  storageBucket: "cstar-mobile-shop.appspot.com",
  messagingSenderId: "336110486907",
  appId: "1:336110486907:web:fC97cf127d11f354a6",
  measurementId: "G-6J4YE5Y01S"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// Productos iniciales (se añaden a DB si no existe)
const initialProducts = [
  { name: 'AirPods Inalámbricos Premium', desc: 'Disfruta de audio inmersivo con cancelación de ruido y batería extendida. Perfectos para llamadas claras y música sin interrupciones – ¡Eleva tu día a día!', price: 1499, image: 'https://placehold.co/300x300?text=AirPods' },
  { name: 'Funda Protectora Anti-Golpes Negra', desc: 'Protección robusta contra caídas y rayones, con agarre antideslizante. Diseño minimalista que no añade volumen – ¡Tu teléfono seguro y elegante!', price: 250, image: 'https://placehold.co/300x300?text=Funda+Negra' },
  { name: 'Funda Elegante con Glitter Rosa', desc: 'Añade brillo a tu estilo con esta funda resistente y chic. Materiales premium para durabilidad diaria – ¡Haz que tu teléfono destaque en cualquier ocasión!', price: 220, image: 'https://placehold.co/300x300?text=Funda+Rosa' },
  { name: 'Funda Transparente Ultra-Delgada', desc: 'Muestra el diseño original de tu teléfono mientras lo proteges de impactos. Ligera y flexible – ¡Invisible pero invencible!', price: 280, image: 'https://placehold.co/300x300?text=Funda+Transparente' },
  { name: 'Funda con Soporte Integrado Azul', desc: 'Multifuncional: protege y sirve como stand para videos. Resistente al agua y polvo – ¡Ideal para aventureros urbanos!', price: 300, image: 'https://placehold.co/300x300?text=Funda+Azul' }
];

// Carrito local (por usuario)
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products = [];
let analytics = { visits: 0, addClicks: 0 };
let configs = { social: '<a href="#">Instagram</a> | <a href="#">Facebook</a>', contact: '<p>Email: miguelpilinzd@gmail.com | Tel: +1-809-XXX-XXXX</p>', adminPassword: 'neluis@@' };

// Funciones compartidas
async function initDB() {
  // Inicializa analytics si no existe
  const analyticsDoc = db.collection('shop').doc('analytics');
  const analyticsSnap = await analyticsDoc.get();
  if (!analyticsSnap.exists) {
    await analyticsDoc.set({ visits: 0, addClicks: 0 });
  } else {
    analytics = analyticsSnap.data();
  }

  // Incrementa visits atómicamente
  await analyticsDoc.update({ visits: firebase.firestore.FieldValue.increment(1) });
  analytics.visits++;

  // Inicializa configs si no existe
  const configsDoc = db.collection('shop').doc('configs');
  const configsSnap = await configsDoc.get();
  if (!configsSnap.exists) {
    await configsDoc.set(configs);
  } else {
    configs = configsSnap.data();
  }

  // Inicializa products si vacío
  const productsQuery = await db.collection('products').get();
  if (productsQuery.empty) {
    initialProducts.forEach(async (p) => {
      await db.collection('products').add(p);
    });
  }

  // Carga products y escucha realtime
  db.collection('products').onSnapshot((snapshot) => {
    products = [];
    snapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });
    if (document.getElementById('productGrid')) renderProducts();
    if (document.getElementById('adminProductList')) renderAdminProducts();
  });

  // Escucha analytics realtime
  analyticsDoc.onSnapshot((snap) => {
    analytics = snap.data();
    updateAnalyticsUI();
  });

  // Escucha configs realtime
  configsDoc.onSnapshot((snap) => {
    configs = snap.data();
    loadConfigs();
  });
}

function renderProducts(filtered = products) {
  const grid = document.getElementById('productGrid');
  if (grid) {
    grid.innerHTML = '';
    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="\( {p.image}" alt=" \){p.name}">
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <p>${p.price} DOP</p>
        <button onclick="addToCart('${p.id}')">Añadir al Carrito</button>
      `;
      grid.appendChild(card);
    });
  }
}

function searchProducts() {
  const input = document.getElementById('searchInput').value.toLowerCase();
  if (input === configs.adminPassword) {  // Usa password de DB
    window.location.href = 'admin.html';
    return;
  }
  const filtered = products.filter(p => p.name.toLowerCase().includes(input) || p.desc.toLowerCase().includes(input));
  renderProducts(filtered);
}

async function addToCart(id) {
  const product = products.find(p => p.id === id);
  cart.push(product);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCart();

  // Incrementa addClicks
  await db.collection('shop').doc('analytics').update({ addClicks: firebase.firestore.FieldValue.increment(1) });
}

function updateCart() {
  const count = document.getElementById('cartCount');
  if (count) count.textContent = cart.length;
  const items = document.getElementById('cartItems');
  if (items) {
    items.innerHTML = '';
    cart.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = 'cart-item';
      item.innerHTML = `${p.name} - \( {p.price} DOP <button onclick="removeFromCart( \){idx})">Eliminar</button>`;
      items.appendChild(item);
    });
    document.getElementById('cartTotal').textContent = cart.reduce((sum, p) => sum + p.price, 0);
  }
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCart();
}

function toggleCart() {
  const modal = document.getElementById('cartModal');
  modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
  updateCart();
}

function checkout() {
  const orderDetails = cart.map(p => `${p.name}: ${p.price} DOP`).join('\n');
  const total = cart.reduce((sum, p) => sum + p.price, 0);
  const mailto = `mailto:miguelpilinzd@gmail.com?subject=Nuevo Pedido Cstar&body=Detalles del pedido:%0A${orderDetails}%0ATotal: ${total} DOP%0A%0ANombre: [Tu nombre]%0ADirección: [Tu dirección]`;
  window.location.href = mailto;
  cart = [];
  localStorage.setItem('cart', JSON.stringify(cart));
  toggleCart();
}

function loadConfigs() {
  const socialEl = document.getElementById('socialLinks');
  if (socialEl) socialEl.innerHTML += configs.social;
  const contactEl = document.getElementById('contactInfo');
  if (contactEl) contactEl.innerHTML += configs.contact;
}

// Admin funciones
function loadAdmin() {
  document.getElementById('adminContent').style.display = 'none';
  // Prellenar configs en form (cargado de DB via listener)
  document.getElementById('socialConfig').value = configs.social;
  document.getElementById('contactConfig').value = configs.contact;
}

function loginAdmin() {
  const inputPass = document.getElementById('adminPassword').value;
  if (inputPass === configs.adminPassword) {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    updateAnalyticsUI();
    renderAdminProducts();
  } else {
    alert('Password incorrecto');
  }
}

function updateAnalyticsUI() {
  if (document.getElementById('visitCount')) document.getElementById('visitCount').textContent = analytics.visits;
  if (document.getElementById('addClickCount')) document.getElementById('addClickCount').textContent = analytics.addClicks;
}

function renderAdminProducts() {
  const list = document.getElementById('adminProductList');
  if (list) {
    list.innerHTML = '';
    products.forEach(p => {
      const div = document.createElement('div');
      div.innerHTML = `
        <h3>${p.name}</h3>
        <form class="editForm" data-id="${p.id}">
          <input type="text" value="${p.name}" required>
          <textarea required>${p.desc}</textarea>
          <input type="number" value="${p.price}" required>
          <input type="file" accept="image/*">
          <button type="submit">Editar</button>
          <button type="button" onclick="deleteProduct('${p.id}')">Borrar</button>
        </form>
      `;
      list.appendChild(div);
    });

    document.querySelectorAll('.editForm').forEach(form => {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const id = e.target.dataset.id;
        let imageUrl = products.find(p => p.id === id).image;
        if (e.target[3].files[0]) {
          const ref = storage.ref(`images/${Date.now()}`);
          await ref.put(e.target[3].files[0]);
          imageUrl = await ref.getDownloadURL();
        }
        await db.collection('products').doc(id).update({
          name: e.target[0].value,
          desc: e.target[1].value,
          price: parseInt(e.target[2].value),
          image: imageUrl
        });
      });
    });
  }
}

document.getElementById('addProductForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const ref = storage.ref(`images/${Date.now()}`);
  await ref.put(document.getElementById('newImage').files[0]);
  const imageUrl = await ref.getDownloadURL();
  await db.collection('products').add({
    name: document.getElementById('newName').value,
    desc: document.getElementById('newDesc').value,
    price: parseInt(document.getElementById('newPrice').value),
    image: imageUrl
  });
  e.target.reset();
});

document.getElementById('configForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const updates = {
    social: document.getElementById('socialConfig').value,
    contact: document.getElementById('contactConfig').value
  };
  const newPass = document.getElementById('newAdminPassword').value;
  if (newPass) updates.adminPassword = newPass;
  await db.collection('shop').doc('configs').update(updates);
  alert('Configuración guardada.');
});

async function deleteProduct(id) {
  await db.collection('products').doc(id).delete();
}

async function resetAnalytics() {
  await db.collection('shop').doc('analytics').set({ visits: 0, addClicks: 0 });
}

// Inicializar
initDB();
if (document.getElementById('productGrid')) {
  updateCart();
  toggleCart(); // Cerrar por default
  loadConfigs();
}
