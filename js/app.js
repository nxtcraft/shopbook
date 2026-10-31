// ── STATE ──
let state = {
  shop: { name: 'My Shop', owner: '', phone: '', address: '', gstin: '' },
  products: [],
  bills: [],
  cart: [],
  nextBillNo: 1
};
let currentPayment = 'cash';

// ── STORAGE ──
function save() {
  localStorage.setItem('shopbook', JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem('shopbook');
  if (raw) {
    try { state = JSON.parse(raw); } catch(e) {}
  }
  if (!state.cart) state.cart = [];
  if (!state.nextBillNo) state.nextBillNo = 1;
}

// ── NAV ──
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  document.getElementById('fab-add').style.display = name === 'products' ? 'flex' : 'none';

  if (name === 'dashboard') renderDashboard();
  if (name === 'products') renderProducts();
  if (name === 'history') renderHistory();
  if (name === 'bill') renderCart();
}

// ── DASHBOARD ──
function renderDashboard() {
  const now = new Date();
  const todayStr = now.toDateString();
  const monthStr = now.getFullYear() + '-' + now.getMonth();

  let todaySales = 0, todayBills = 0, monthSales = 0, monthBills = 0, totalSales = 0;
  state.bills.forEach(b => {
    totalSales += b.total;
    const bd = new Date(b.date);
    if (bd.toDateString() === todayStr) { todaySales += b.total; todayBills++; }
    if (bd.getFullYear() + '-' + bd.getMonth() === monthStr) { monthSales += b.total; monthBills++; }
  });

  document.getElementById('stat-today').textContent = '₹' + todaySales.toFixed(2);
  document.getElementById('stat-today-bills').textContent = todayBills + ' bill' + (todayBills !== 1 ? 's' : '');
  document.getElementById('stat-month').textContent = '₹' + monthSales.toFixed(2);
  document.getElementById('stat-month-bills').textContent = monthBills + ' bill' + (monthBills !== 1 ? 's' : '');
  document.getElementById('stat-total').textContent = '₹' + totalSales.toFixed(2);
  document.getElementById('stat-total-bills').textContent = state.bills.length + ' bills';
  document.getElementById('stat-products').textContent = state.products.length;

  const lowProds = state.products.filter(p => p.stock !== null && p.stock !== undefined && p.stock <= (p.lowAlert || 5));
  document.getElementById('stat-low-stock').textContent = lowProds.length + ' low stock';

  const alert = document.getElementById('low-stock-alert');
  if (lowProds.length > 0) {
    alert.style.display = 'block';
    document.getElementById('low-stock-list').innerHTML = lowProds.map(p => `<span style="display:inline-block; background:#fecaca; color:#dc2626; border-radius:6px; padding:2px 8px; margin:2px; font-size:12px;">${p.name} (${p.stock} left)</span>`).join('');
  } else {
    alert.style.display = 'none';
  }

  const recent = [...state.bills].reverse().slice(0, 10);
  const container = document.getElementById('recent-bills');
  if (recent.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🧾</div><div class="empty-text">No bills yet</div><div class="empty-sub">Tap "New Bill" below to create your first bill</div></div>`;
  } else {
    container.innerHTML = recent.map(b => `
      <div class="bill-card" onclick="showReceipt(${b.id})">
        <div class="bill-card-top">
          <div>
            <div class="bill-no">Bill #${b.no}${b.customer && b.customer.name ? ' · ' + esc(b.customer.name) : ''}</div>
            <div class="bill-time">${formatDate(b.date)}</div>
            ${b.customer && b.customer.phone ? `<div class="bill-items-count">📞 ${esc(b.customer.phone)}</div>` : ''}
          </div>
          <div style="text-align:right">
            <div class="bill-amount">₹${b.total.toFixed(2)}</div>
            <div class="bill-items-count">${b.items.length} item${b.items.length !== 1 ? 's' : ''}</div>
            ${b.paymentLabel ? `<div class="bill-items-count">${b.paymentLabel}</div>` : ''}
          </div>
        </div>
      </div>`).join('');
  }
}

// ── PRODUCTS ──
function renderProducts() {
  const list = document.getElementById('products-list');
  if (state.products.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-text">No products yet</div><div class="empty-sub">Tap + to add your first product</div></div>`;
    return;
  }
  list.innerHTML = state.products.map(p => `
    <div class="product-card">
      <div class="pc-icon">📦</div>
      <div class="pc-info">
        <div class="pc-name">${esc(p.name)}</div>
        <div class="pc-price">₹${p.price.toFixed(2)} / ${p.unit || 'pcs'}</div>
        <div class="pc-stock ${p.stock !== null && p.stock <= (p.lowAlert || 5) ? 'low' : ''}">
          ${p.stock !== null ? 'Stock: ' + p.stock : 'Stock not tracked'}
        </div>
      </div>
      <div class="pc-actions">
        <button class="pc-btn" onclick="openEditProduct(${p.id})">Edit</button>
        <button class="pc-btn" onclick="deleteProduct(${p.id})" style="color:#dc2626">Del</button>
      </div>
    </div>`).join('');
}

function openAddProduct() {
  document.getElementById('product-modal-title').textContent = 'Add Product';
  document.getElementById('p-id').value = '';
  document.getElementById('p-name').value = '';
  document.getElementById('p-price').value = '';
  document.getElementById('p-stock').value = '';
  document.getElementById('p-low').value = '5';
  document.getElementById('p-unit').value = 'pcs';
  openModal('modal-product');
}

function openEditProduct(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('p-id').value = p.id;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-stock').value = p.stock !== null ? p.stock : '';
  document.getElementById('p-low').value = p.lowAlert || 5;
  document.getElementById('p-unit').value = p.unit || 'pcs';
  openModal('modal-product');
}

function saveProduct() {
  const name = document.getElementById('p-name').value.trim();
  const price = parseFloat(document.getElementById('p-price').value);
  if (!name) { alert('Please enter a product name.'); return; }
  if (isNaN(price) || price < 0) { alert('Please enter a valid price.'); return; }
  const stock = document.getElementById('p-stock').value !== '' ? parseInt(document.getElementById('p-stock').value) : null;
  const lowAlert = parseInt(document.getElementById('p-low').value) || 5;
  const unit = document.getElementById('p-unit').value;
  const existId = document.getElementById('p-id').value;

  if (existId) {
    const idx = state.products.findIndex(p => p.id == existId);
    if (idx !== -1) state.products[idx] = { ...state.products[idx], name, price, stock, lowAlert, unit };
  } else {
    state.products.push({ id: Date.now(), name, price, stock, lowAlert, unit });
  }
  save();
  closeModal('modal-product');
  renderProducts();
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  state.products = state.products.filter(p => p.id !== id);
  save();
  renderProducts();
}

// ── BILLING / CART ──
function searchProducts(q) {
  const results = document.getElementById('searchResults');
  const term = q.trim().toLowerCase();
  if (!term) { results.style.display = 'none'; return; }
  const matches = state.products.filter(p => p.name.toLowerCase().includes(term)).slice(0, 8);
  if (matches.length === 0) { results.style.display = 'none'; return; }
  results.style.display = 'block';
  results.innerHTML = matches.map(p => `
    <div class="search-result-item" onclick="addToCart(${p.id})">
      <div>
        <div class="sri-name">${esc(p.name)}</div>
        <div class="sri-stock">${p.stock !== null ? 'Stock: ' + p.stock : ''}</div>
      </div>
      <div class="sri-price">₹${p.price.toFixed(2)}</div>
    </div>`).join('');
}

function addToCart(productId) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return;
  const existing = state.cart.find(c => c.productId === productId);
  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({ productId, name: p.name, price: p.price, qty: 1, unit: p.unit || 'pcs' });
  }
  document.getElementById('productSearch').value = '';
  document.getElementById('searchResults').style.display = 'none';
  renderCart();
}

function changeQty(productId, delta) {
  const item = state.cart.find(c => c.productId === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter(c => c.productId !== productId);
  renderCart();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(c => c.productId !== productId);
  renderCart();
}

function renderCart() {
  const body = document.getElementById('cart-body');
  const count = document.getElementById('cart-count');
  const totalsBox = document.getElementById('totals-box');
  const actions = document.getElementById('bill-actions');

  count.textContent = state.cart.length + ' item' + (state.cart.length !== 1 ? 's' : '');

  if (state.cart.length === 0) {
    body.innerHTML = '<div class="cart-empty">Search and add products above</div>';
    totalsBox.style.display = 'none';
    actions.style.display = 'none';
    return;
  }

  body.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <div class="ci-name">
        ${esc(item.name)}
        <div class="ci-price">₹${item.price.toFixed(2)} each</div>
      </div>
      <div class="qty-ctrl">
        <button class="qty-btn" onclick="changeQty(${item.productId}, -1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${item.productId}, 1)">+</button>
      </div>
      <div class="ci-total">₹${(item.price * item.qty).toFixed(2)}</div>
      <button class="ci-remove" onclick="removeFromCart(${item.productId})">×</button>
    </div>`).join('');

  totalsBox.style.display = 'block';
  actions.style.display = 'grid';
  document.getElementById('payment-row').style.display = 'block';
  renderTotals();
}

function renderTotals() {
  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Discount
  const discountEnabled = document.getElementById('discountEnabled').checked;
  const discountVal  = parseFloat(document.getElementById('discountVal').value) || 0;
  const discountType = document.getElementById('discountType').value;
  let discountAmt = 0;
  if (discountEnabled && discountVal > 0) {
    discountAmt = discountType === 'pct' ? subtotal * discountVal / 100 : Math.min(discountVal, subtotal);
  }
  const afterDiscount = subtotal - discountAmt;

  // GST on post-discount amount
  const gstEnabled = document.getElementById('gstEnabled').checked;
  const gstPct = parseFloat(document.getElementById('gstPct').value) || 0;
  const gstAmt = gstEnabled ? afterDiscount * gstPct / 100 : 0;
  const grand = afterDiscount + gstAmt;

  document.getElementById('t-sub').textContent = '₹' + subtotal.toFixed(2);
  document.getElementById('discount-row').style.display = discountEnabled && discountAmt > 0 ? 'flex' : 'none';
  document.getElementById('discount-label').textContent = discountType === 'pct' ? discountVal + '%' : '₹' + discountVal;
  document.getElementById('t-discount').textContent = '−₹' + discountAmt.toFixed(2);
  document.getElementById('gst-row').style.display = gstEnabled ? 'flex' : 'none';
  document.getElementById('gst-pct-label').textContent = gstPct;
  document.getElementById('t-gst').textContent = '₹' + gstAmt.toFixed(2);
  document.getElementById('t-grand').textContent = '₹' + grand.toFixed(2);
}

function selectPayment(mode) {
  currentPayment = mode;
  ['cash','upi','card','credit'].forEach(m => {
    document.getElementById('pay-' + m).classList.toggle('active', m === mode);
  });
}

function toggleCustomer() {
  const fields = document.getElementById('customer-fields');
  const icon   = document.getElementById('customer-toggle-icon');
  const open   = fields.style.display === 'none';
  fields.style.display = open ? 'block' : 'none';
  icon.textContent = open ? '− Hide' : '+ Add';
}

function clearBill() {
  if (state.cart.length > 0 && !confirm('Clear all items?')) return;
  state.cart = [];
  document.getElementById('c-name').value = '';
  document.getElementById('c-phone').value = '';
  document.getElementById('c-address').value = '';
  document.getElementById('discountEnabled').checked = false;
  document.getElementById('discountVal').value = 0;
  selectPayment('cash');
  renderCart();
}

function finaliseBill() {
  if (state.cart.length === 0) { alert('Add at least one product.'); return; }
  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);

  const discountEnabled = document.getElementById('discountEnabled').checked;
  const discountVal  = parseFloat(document.getElementById('discountVal').value) || 0;
  const discountType = document.getElementById('discountType').value;
  let discountAmt = 0;
  if (discountEnabled && discountVal > 0) {
    discountAmt = discountType === 'pct' ? subtotal * discountVal / 100 : Math.min(discountVal, subtotal);
  }
  const afterDiscount = subtotal - discountAmt;

  const gstEnabled = document.getElementById('gstEnabled').checked;
  const gstPct = parseFloat(document.getElementById('gstPct').value) || 0;
  const gstAmt = gstEnabled ? afterDiscount * gstPct / 100 : 0;
  const grand = afterDiscount + gstAmt;

  // Customer details (optional)
  const customer = {
    name:    document.getElementById('c-name').value.trim(),
    phone:   document.getElementById('c-phone').value.trim(),
    address: document.getElementById('c-address').value.trim()
  };

  // Deduct stock
  state.cart.forEach(item => {
    const p = state.products.find(p => p.id === item.productId);
    if (p && p.stock !== null) p.stock = Math.max(0, p.stock - item.qty);
  });

  const paymentLabels = { cash: 'Cash', upi: 'UPI', card: 'Card', credit: 'Credit' };
  const bill = {
    id: Date.now(),
    no: state.nextBillNo++,
    date: new Date().toISOString(),
    customer,
    payment: currentPayment,
    paymentLabel: paymentLabels[currentPayment] || 'Cash',
    items: state.cart.map(i => ({ ...i })),
    subtotal,
    discountEnabled,
    discountAmt,
    discountVal,
    discountType,
    gstEnabled,
    gstPct,
    gstAmt,
    total: grand
  };
  state.bills.push(bill);
  state.cart = [];
  // reset bill fields
  document.getElementById('c-name').value = '';
  document.getElementById('c-phone').value = '';
  document.getElementById('c-address').value = '';
  document.getElementById('discountEnabled').checked = false;
  document.getElementById('discountVal').value = 0;
  selectPayment('cash');
  save();

  renderCart();
  showReceipt(bill.id);
}

// ── RECEIPT ──
function showReceipt(billId) {
  const bill = state.bills.find(b => b.id === billId);
  if (!bill) return;
  const shop = state.shop;
  const lines = bill.items.map(i =>
    `<div class="receipt-item"><span>${esc(i.name)} ×${i.qty}</span><span>₹${(i.price * i.qty).toFixed(2)}</span></div>`
  ).join('');

  const cust = bill.customer || {};
  const custBlock = (cust.name || cust.phone || cust.address) ? `
    <hr class="receipt-divider">
    <div style="font-size:12px; line-height:1.7;">
      <div style="font-weight:700; margin-bottom:2px;">Customer</div>
      ${cust.name    ? `<div>${esc(cust.name)}</div>` : ''}
      ${cust.phone   ? `<div>📞 ${esc(cust.phone)}</div>` : ''}
      ${cust.address ? `<div>📍 ${esc(cust.address)}</div>` : ''}
    </div>` : '';

  document.getElementById('receipt-content').innerHTML = `
    <div class="receipt-shop">
      <h2>${esc(shop.name || 'My Shop')}</h2>
      ${shop.owner ? `<div>${esc(shop.owner)}</div>` : ''}
      ${shop.phone ? `<div>${esc(shop.phone)}</div>` : ''}
      ${shop.address ? `<div>${esc(shop.address)}</div>` : ''}
      ${shop.gstin ? `<div>GSTIN: ${esc(shop.gstin)}</div>` : ''}
    </div>
    <hr class="receipt-divider">
    <div class="receipt-row"><span>Bill #${bill.no}</span><span>${formatDate(bill.date)}</span></div>
    ${custBlock}
    <hr class="receipt-divider">
    ${lines}
    <hr class="receipt-divider">
    <div class="receipt-row"><span>Subtotal</span><span>₹${bill.subtotal.toFixed(2)}</span></div>
    ${bill.discountEnabled && bill.discountAmt > 0 ? `<div class="receipt-row" style="color:#16a34a;"><span>Discount (${bill.discountType === 'pct' ? bill.discountVal + '%' : '₹' + bill.discountVal})</span><span>−₹${bill.discountAmt.toFixed(2)}</span></div>` : ''}
    ${bill.gstEnabled ? `<div class="receipt-row"><span>GST (${bill.gstPct}%)</span><span>₹${bill.gstAmt.toFixed(2)}</span></div>` : ''}
    <hr class="receipt-divider">
    <div class="receipt-row receipt-total"><span>TOTAL</span><span>₹${bill.total.toFixed(2)}</span></div>
    <div class="receipt-row" style="font-size:12px; color:#78716c; margin-top:4px;"><span>Payment</span><span>${esc(bill.paymentLabel || 'Cash')}</span></div>
    <div class="receipt-footer">Thank you! Visit again.</div>
  `;
  openModal('modal-receipt');
}

// ── HISTORY ──
function renderHistory() {
  const list = document.getElementById('history-list');
  if (state.bills.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🕐</div><div class="empty-text">No bill history</div><div class="empty-sub">Bills you create will appear here</div></div>`;
    return;
  }
  list.innerHTML = [...state.bills].reverse().map(b => `
    <div class="bill-card" onclick="showReceipt(${b.id})">
      <div class="bill-card-top">
        <div>
          <div class="bill-no">Bill #${b.no}${b.customer && b.customer.name ? ' · ' + esc(b.customer.name) : ''}</div>
          <div class="bill-time">${formatDate(b.date)}</div>
          ${b.customer && b.customer.phone ? `<div class="bill-items-count">📞 ${esc(b.customer.phone)}</div>` : ''}
          <div class="bill-items-count">${b.items.map(i => esc(i.name) + ' ×' + i.qty).join(', ')}</div>
        </div>
        <div style="text-align:right">
          <div class="bill-amount">₹${b.total.toFixed(2)}</div>
          <div class="bill-items-count">${b.items.length} item${b.items.length !== 1 ? 's' : ''}</div>
          ${b.paymentLabel ? `<div class="bill-items-count">${b.paymentLabel}</div>` : ''}
        </div>
      </div>
    </div>`).join('');
}

// ── SHOP SETTINGS ──
function openShopSettings() {
  document.getElementById('s-name').value = state.shop.name || '';
  document.getElementById('s-owner').value = state.shop.owner || '';
  document.getElementById('s-phone').value = state.shop.phone || '';
  document.getElementById('s-address').value = state.shop.address || '';
  document.getElementById('s-gstin').value = state.shop.gstin || '';
  openModal('modal-settings');
}

function saveShopSettings() {
  state.shop = {
    name: document.getElementById('s-name').value.trim() || 'My Shop',
    owner: document.getElementById('s-owner').value.trim(),
    phone: document.getElementById('s-phone').value.trim(),
    address: document.getElementById('s-address').value.trim(),
    gstin: document.getElementById('s-gstin').value.trim()
  };
  save();
  updateShopDisplay();
  closeModal('modal-settings');
}

function updateShopDisplay() {
  const el = document.getElementById('shopNameDisplay');
  el.textContent = state.shop.name !== 'My Shop' ? state.shop.name : '';
}

// ── EXPORT ──
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'shopbook-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
}

// ── MODAL HELPERS ──
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.add('hidden'); });
});

// ── UTILS ──
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ── INIT ──
load();
updateShopDisplay();
renderDashboard();
