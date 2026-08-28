(function () {
  const KEY = 'bossBurgerzCart';
  const FAV_KEY = 'bossBurgerzFavs';
  const MODE_KEY = 'bossBurgerzMode';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function money(n) {
    return '$' + n.toFixed(2);
  }
  function loadCart() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }
  function saveCart(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }
  function loadFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
  }
  function saveFavs(list) {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
  }
  function parsePrice(el) {
    const raw = el?.textContent || '0';
    const n = parseFloat(raw.replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  function qtyTotal(items) {
    return items.reduce((s, i) => s + i.qty, 0);
  }
  function subtotal(items) {
    return items.reduce((s, i) => s + i.price * i.qty, 0);
  }

  function mountShell() {
    if ($('#cartDrawer')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="scrim" id="scrim" hidden></div>
      <aside class="drawer" id="cartDrawer" aria-hidden="true">
        <div class="drawer-head">
          <div>
            <h3>Your order</h3>
            <p class="drawer-sub" id="drawerMode">Drive-thru · ready in about 12 min</p>
          </div>
          <button class="icon-btn" id="closeCart" aria-label="Close cart">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" fill="none" stroke-width="2"/></svg>
          </button>
        </div>
        <div class="drawer-body" id="cartItems"></div>
        <div class="drawer-foot">
          <p class="drawer-note">Burgers already include fries + a drink.</p>
          <div class="drawer-total"><span>Subtotal</span><strong id="cartSub">$0.00</strong></div>
          <button class="btn btn-red btn-full" id="checkoutBtn">Place order</button>
          <a class="drawer-call" href="tel:+16824072809">Or call (682) 407-2809</a>
        </div>
      </aside>
      <div class="sheet" id="checkoutSheet" hidden>
        <h3>Almost there</h3>
        <p>We’ll have it ready at the window. No payment in this preview.</p>
        <label>Name<input id="coName" type="text" placeholder="Your name"></label>
        <label>Phone<input id="coPhone" type="tel" placeholder="(682) 000-0000"></label>
        <button class="btn btn-red btn-full" id="confirmOrder">Confirm pickup</button>
        <button class="sheet-cancel" id="cancelCheckout">Back to cart</button>
      </div>
      <div class="mobile-cart" id="mobileCart" hidden>
        <span id="mobileCartLabel">0 items · $0.00</span>
        <button type="button" id="mobileCartOpen">View cart</button>
      </div>
      <button class="to-top" id="toTop" aria-label="Back to top" hidden>↑</button>
    `);
  }

  function renderCart() {
    const items = loadCart();
    const count = qtyTotal(items);
    $$('#cartCount').forEach(el => {
      el.textContent = count;
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    });
    const list = $('#cartItems');
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div class="cart-empty"><p>Your bag is empty.</p><p>Add a burger — fries and a drink come with it.</p></div>';
    } else {
      list.innerHTML = items.map((i, idx) => `
        <div class="cart-row" data-idx="${idx}">
          <div>
            <strong>${i.name}</strong>
            <span>${money(i.price)}</span>
          </div>
          <div class="qty">
            <button type="button" data-act="minus" aria-label="Less">−</button>
            <em>${i.qty}</em>
            <button type="button" data-act="plus" aria-label="More">+</button>
          </div>
        </div>`).join('');
    }
    const sum = subtotal(items);
    const sub = $('#cartSub');
    if (sub) sub.textContent = money(sum);
    const bar = $('#mobileCart');
    const label = $('#mobileCartLabel');
    if (bar && label) {
      bar.hidden = count === 0;
      label.textContent = count + (count === 1 ? ' item' : ' items') + ' · ' + money(sum);
    }
    const mode = localStorage.getItem(MODE_KEY) || 'drive';
    const subEl = $('#drawerMode');
    if (subEl) {
      subEl.textContent = (mode === 'walk' ? 'Walk-up window' : 'Drive-thru') + ' · ready in about 12 min';
    }
  }

  function addItem(name, price) {
    const items = loadCart();
    const found = items.find(i => i.name === name);
    if (found) found.qty += 1;
    else items.push({ name, price, qty: 1 });
    saveCart(items);
    renderCart();
    toast(name + ' added');
  }

  function toast(msg) {
    let el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 1600);
  }

  function openCart(open) {
    const drawer = $('#cartDrawer');
    const scrim = $('#scrim');
    const sheet = $('#checkoutSheet');
    if (!drawer || !scrim) return;
    if (sheet) sheet.hidden = true;
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    scrim.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function applyFilters() {
    const q = ($('#menuSearch')?.value || '').trim().toLowerCase();
    const filter = $('.chip.is-on')?.dataset.filter || 'all';
    const favs = loadFavs();
    const pane = $('.tab-pane.is-on') || document;
    const cards = $$('.menu-card', pane);
    cards.forEach(card => {
      const name = (card.dataset.name || '') + ' ' + card.innerText;
      const hay = name.toLowerCase();
      const price = parsePrice(card.querySelector('.price'));
      const title = card.querySelector('h3')?.textContent || '';
      let ok = !q || hay.includes(q);
      if (ok && filter === 'under12') ok = price > 0 && price < 12;
      if (ok && filter === 'spicy') ok = /spicy|jalapeño|jalapeno/.test(hay);
      if (ok && filter === 'saved') ok = favs.includes(title);
      card.classList.toggle('hidden', !ok);
    });
    $$('.menu-section', pane).forEach(sec => {
      const visible = $$('.menu-card', sec).some(c => !c.classList.contains('hidden'));
      sec.style.display = visible ? '' : 'none';
    });
    const empty = $('#emptyFilter');
    if (empty) empty.hidden = cards.some(c => !c.classList.contains('hidden'));
  }

  function showMenuTab(id) {
    const tabs = $$('.folder-tab');
    if (!tabs.length) return;
    const valid = tabs.some(t => t.dataset.tab === id);
    const next = valid ? id : (tabs[0].dataset.tab || 'burgers');
    tabs.forEach((t, i) => {
      const on = t.dataset.tab === next;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && i === 0) $('.folder-panel')?.setAttribute('data-edge', 'start');
    });
    if (tabs[0]?.dataset.tab !== next) $('.folder-panel')?.removeAttribute('data-edge');
    $$('.tab-pane').forEach(p => {
      const on = p.dataset.pane === next;
      p.classList.toggle('is-on', on);
      p.hidden = !on;
    });
    applyFilters();
  }

  mountShell();
  renderCart();

  const nav = $('#nav');
  $('#menuToggle')?.addEventListener('click', () => nav?.classList.toggle('open'));

  $$('.add').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.menu-card, .food-card');
      const name = btn.dataset.item || card?.querySelector('h3')?.textContent || 'Item';
      const price = parsePrice(card?.querySelector('.price'));
      addItem(name, price);
    });
  });

  $('#cartBtn')?.addEventListener('click', () => { renderCart(); openCart(true); });
  $('#closeCart')?.addEventListener('click', () => openCart(false));
  $('#scrim')?.addEventListener('click', () => openCart(false));
  $('#mobileCartOpen')?.addEventListener('click', () => { renderCart(); openCart(true); });

  $('#cartItems')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const row = btn.closest('.cart-row');
    const items = loadCart();
    const i = items[+row.dataset.idx];
    if (!i) return;
    if (btn.dataset.act === 'plus') i.qty += 1;
    if (btn.dataset.act === 'minus') i.qty -= 1;
    saveCart(items.filter(x => x.qty > 0));
    renderCart();
  });

  $('#checkoutBtn')?.addEventListener('click', () => {
    if (!loadCart().length) { toast('Add something first'); return; }
    $('#checkoutSheet').hidden = false;
  });
  $('#cancelCheckout')?.addEventListener('click', () => { $('#checkoutSheet').hidden = true; });
  $('#confirmOrder')?.addEventListener('click', () => {
    const name = $('#coName').value.trim();
    const phone = $('#coPhone').value.trim();
    if (!name || !phone) { toast('Name and phone help us call you'); return; }
    saveCart([]);
    renderCart();
    openCart(false);
    $('#checkoutSheet').hidden = true;
    toast('Order in — see you at the window, ' + name.split(' ')[0]);
  });

  const favs = loadFavs();
  $$('.fav').forEach(btn => {
    const title = btn.closest('.menu-card')?.querySelector('h3')?.textContent;
    if (title && favs.includes(title)) {
      btn.querySelector('path')?.setAttribute('fill', 'currentColor');
      btn.style.color = '#eb0029';
    }
    btn.addEventListener('click', () => {
      const path = btn.querySelector('path');
      const on = path.getAttribute('fill') === 'currentColor';
      path.setAttribute('fill', on ? 'none' : 'currentColor');
      btn.style.color = on ? '' : '#eb0029';
      let list = loadFavs();
      if (on) list = list.filter(x => x !== title);
      else if (title && !list.includes(title)) list.push(title);
      saveFavs(list);
      applyFilters();
    });
  });

  $$('.mode-btn').forEach(btn => {
    const saved = localStorage.getItem(MODE_KEY) || 'drive';
    if (btn.dataset.mode === saved) btn.classList.add('is-on');
    btn.addEventListener('click', () => {
      $$('.mode-btn').forEach(b => b.classList.remove('is-on'));
      btn.classList.add('is-on');
      localStorage.setItem(MODE_KEY, btn.dataset.mode);
      renderCart();
    });
  });
  if ($$('.mode-btn').length && !$$('.mode-btn.is-on').length) {
    $$('.mode-btn')[0]?.classList.add('is-on');
  }

  $$('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.chip').forEach(c => c.classList.remove('is-on'));
      chip.classList.add('is-on');
      applyFilters();
    });
  });
  $('#menuSearch')?.addEventListener('input', applyFilters);

  const folderTabs = $$('.folder-tab');
  if (folderTabs.length) {
    const hashId = (location.hash || '').replace('#', '');
    const mapped = hashId === 'featured' ? 'burgers' : hashId;
    showMenuTab(mapped);
    folderTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        showMenuTab(tab.dataset.tab);
        history.replaceState(null, '', '#' + tab.dataset.tab);
      });
    });
    const list = $('.folder-tabs');
    list?.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowLeft: -1 };
      if (!keys[e.key]) return;
      e.preventDefault();
      const i = folderTabs.findIndex(t => t.classList.contains('is-on'));
      const next = folderTabs[(i + keys[e.key] + folderTabs.length) % folderTabs.length];
      next.focus();
      next.click();
    });
    window.addEventListener('hashchange', () => {
      const id = location.hash.replace('#', '');
      if (id === 'contact') return;
      showMenuTab(id === 'featured' ? 'burgers' : id);
    });
    const header = $('.header');
    const bar = $('.folder-tabs-bar');
    const pinBar = () => {
      if (!header || !bar) return;
      bar.style.top = Math.round(header.getBoundingClientRect().height) + 'px';
    };
    pinBar();
    window.addEventListener('resize', pinBar);
  }

  const topBtn = $('#toTop');
  window.addEventListener('scroll', () => {
    if (topBtn) topBtn.hidden = window.scrollY < 500;
  });
  topBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  $$('.menu-card img, .food-card img').forEach(img => {
    img.addEventListener('error', () => {
      img.src = 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80';
    });
  });
})();
