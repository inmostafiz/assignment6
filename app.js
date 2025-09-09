(() => {
  'use strict';

 
  // API & State
 
  const API = {
    allPlants: 'https://openapi.programming-hero.com/api/plants',
    categories: 'https://openapi.programming-hero.com/api/categories',
    plantsByCategory: function (id) {
      return 'https://openapi.programming-hero.com/api/category/' + id;
    },
    plantDetail: function (id) {
      return 'https://openapi.programming-hero.com/api/plant/' + id;
    },
  };

  const state = {
    activeCategoryId: 'all',
    categories: [],
    plants: [],
    cart: [], // line-items (we will group in render)
  };

  const els = {
    globalSpinner: null,
    categoryListEl: null,
    plantsGridEl: null,
    cartListEl: null,
    cartTotalEl: null,
    cartCountEl: null,
    clearCartBtn: null,
    modal: null,
    modalContent: null,
  };

  let spinnerCount = 0;

  // -----------------------------
  // Utils
  // -----------------------------
  function $(sel, root) {
    if (!root) root = document;
    return root.querySelector(sel);
  }
  function $all(sel, root) {
    if (!root) root = document;
    return Array.from(root.querySelectorAll(sel));
  }

  function showSpinner() {
    if (!els.globalSpinner) return;
    spinnerCount++;
    els.globalSpinner.classList.remove('hidden');
    els.globalSpinner.classList.add('flex');
  }
  function hideSpinner() {
    if (!els.globalSpinner) return;
    spinnerCount = Math.max(0, spinnerCount - 1);
    if (spinnerCount === 0) {
      els.globalSpinner.classList.add('hidden');
      els.globalSpinner.classList.remove('flex');
    }
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  function parsePrice(val) {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const n = parseFloat(val.replace(/[^\d.]/g, ''));
      return isNaN(n) ? 0 : n;
    }
    return 0;
  }
  function formatCurrency(amount) {
    return '৳' + Number(amount || 0).toFixed(0);
  }
  function truncate(text, length) {
    if (text == null) text = '';
    if (length == null) length = 120;
    return text.length > length ? text.slice(0, length) + '…' : text;
  }

  function extractArray(obj) {
    if (Array.isArray(obj)) return obj;
    if (obj && Array.isArray(obj.data)) return obj.data;
    if (obj && Array.isArray(obj.plants)) return obj.plants;
    if (obj && Array.isArray(obj.categories)) return obj.categories;
    if (obj && obj.data && Array.isArray(obj.data.plants)) return obj.data.plants;
    if (obj && obj.data && Array.isArray(obj.data.categories)) return obj.data.categories;
    return [];
  }

  function normalizeCategory(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id =
      raw.category_id != null
        ? raw.category_id
        : raw.id != null
        ? raw.id
        : raw.categoryId != null
        ? raw.categoryId
        : raw._id != null
        ? raw._id
        : String(raw);
    const name =
      raw.category != null
        ? raw.category
        : raw.category_name != null
        ? raw.category_name
        : raw.name != null
        ? raw.name
        : String(id);
    return { id: String(id), name: String(name) };
  }

  function normalizePlant(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = raw.id != null ? raw.id : raw.plant_id != null ? raw.plant_id : raw.plantId != null ? raw.plantId : raw._id;
    const name =
      raw.name != null
        ? raw.name
        : raw.plant_name != null
        ? raw.plant_name
        : raw.plantName != null
        ? raw.plantName
        : raw.title != null
        ? raw.title
        : raw.tree_name != null
        ? raw.tree_name
        : '';
    var image =
      raw.image != null
        ? raw.image
        : raw.plant_image != null
        ? raw.plant_image
        : raw.img != null
        ? raw.img
        : raw.image_url != null
        ? raw.image_url
        : raw.thumbnail != null
        ? raw.thumbnail
        : '';
    var category =
      raw.category != null
        ? raw.category
        : raw.plant_category != null
        ? raw.plant_category
        : raw.category_name != null
        ? raw.category_name
        : 'Tree';
    const price = parsePrice(raw.price != null ? raw.price : raw.plant_price != null ? raw.plant_price : raw.cost != null ? raw.cost : 0);
    var shortDescription =
      raw.short_description != null
        ? raw.short_description
        : raw.shortDescription != null
        ? raw.shortDescription
        : raw.description != null
        ? raw.description
        : raw.details != null
        ? raw.details
        : '';
    shortDescription = truncate(shortDescription, 120);
    return {
      id: String(id != null ? id : name || Math.random()),
      name: name || '',
      image: image,
      category: category || 'Tree',
      price: price,
      shortDescription: shortDescription,
      _raw: raw,
    };
  }

  function getDetailPayload(resp) {
    if (resp && resp.data && resp.data.plant) return resp.data.plant;
    if (resp && resp.data && Array.isArray(resp.data.plants) && resp.data.plants[0]) return resp.data.plants[0];
    if (resp && resp.data && typeof resp.data === 'object' && !Array.isArray(resp.data)) {
      var d = resp.data;
      if (d.name || d.plant_name || d.title) return d;
      if (d.plant) return d.plant;
    }
    if (resp && resp.data) return resp.data;
    if (resp && resp.plant) return resp.plant;
    return resp;
  }


 
  function buildShopUI() {
    var sections = $all('section');
    var referenceSection = sections.length > 1 ? sections[1] : sections.length > 0 ? sections[0] : null;

    const shop = document.createElement('section');
    shop.id = 'shop';
    shop.className = 'py-10 bg-[#f0fdf4]';
    shop.innerHTML = [
      '<div class="w-11/12 mx-auto">',
      '  <h2 class="text-3xl md:text-4xl font-extrabold text-[#111827] text-center mb-8">Choose Your Trees</h2>',
      '  <div class="grid grid-cols-1 md:grid-cols-12 gap-6">',
      '    <aside class="md:col-span-3 lg:col-span-2">',
      '      <div class="rounded-2xl border border-gray-200 p-3 bg-white">',
      '        <ul id="categoryList" class="flex flex-col gap-1"></ul>',
      '      </div>',
      '    </aside>',
      '    <main class="md:col-span-6 lg:col-span-7">',
      '      <div id="plantsGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>',
      '    </main>',
      '    <aside class="md:col-span-3 lg:col-span-3 bg-white rounded-2xl">',
      '      <div class="rounded-2xl border border-gray-200 p-4 sticky top-4">',
      '        <div class="flex items-center justify-between mb-3">',
      '          <h3 class="text-lg font-semibold text-[#111827]">Your Cart</h3>',
      '          <span id="cartCount" class="text-sm text-gray-500">0 items</span>',
      '        </div>',
      '        <ul id="cartList" class="space-y-2 max-h-[420px] overflow-auto pr-1"></ul>',
      '        <div class="mt-4 pt-3 border-t flex items-center justify-between">',
      '          <span class="font-semibold text-[#111827]">Total:</span>',
      '          <span id="cartTotal" class="font-bold text-[#111827]">৳0</span>',
      '        </div>',
      '    </aside>',
      '  </div>',
      '</div>',
    ].join('');

    
    const parent = referenceSection && referenceSection.parentNode ? referenceSection.parentNode : document.body;
    if (referenceSection && referenceSection.parentNode) {
      parent.insertBefore(shop, referenceSection);
    } else {
      parent.appendChild(shop);
    }

    // refs
    els.categoryListEl = $('#categoryList', shop);
    els.plantsGridEl = $('#plantsGrid', shop);
    els.cartListEl = $('#cartList', shop);
    els.cartTotalEl = $('#cartTotal', shop);
    els.cartCountEl = $('#cartCount', shop);
    els.clearCartBtn = $('#clearCartBtn', shop);

    // Modal
    ensureModal();

    // Clear cart (safe)
    if (els.clearCartBtn) {
      els.clearCartBtn.addEventListener('click', function () {
        if (!state.cart.length) return;
        if (confirm('Clear all items from cart?')) {
          state.cart = [];
          renderCart();
        }
      });
    }
  }

  function ensureModal() {
    const existing = $('#plantModal');
    if (existing) {
      els.modal = existing;
      els.modalContent = $('#modalContent', existing);
      return;
    }
   const modal = document.createElement('dialog');
    modal.id = 'plantModal';
    modal.className = 'modal';
    modal.innerHTML =
      '<div class="modal-box max-w-3xl">' +
      '  <form method="dialog">' +
      '    <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>' +
      '  </form>' +
      '  <div id="modalContent">Loading…</div>' +
      '</div>' +
      '<form method="dialog" class="modal-backdrop"><button>close</button></form>';
    document.body.appendChild(modal);
    els.modal = modal;
    els.modalContent = $('#modalContent', modal);
  }

  // -----------------------------
  // Renderers
  // -----------------------------
  function renderCategories(categories) {
    if (!els.categoryListEl) return;
    els.categoryListEl.innerHTML = '';

    function makeItem(id, name) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-cat-id', String(id));
      btn.className = 'w-full text-left px-4 py-2 rounded-md text-gray-700 hover:bg-green-50';
      btn.textContent = name;
      btn.addEventListener('click', function () {
        handleCategoryClick(String(id));
      });
      li.appendChild(btn);
      return li;
    }

    els.categoryListEl.appendChild(makeItem('all', 'All Trees'));
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      els.categoryListEl.appendChild(makeItem(c.id, c.name));
    }

    setActiveCategoryButton(state.activeCategoryId);
  }

  function setActiveCategoryButton(id) {
    const buttons = $all('button[data-cat-id]', els.categoryListEl);
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      const active = b.getAttribute('data-cat-id') === String(id);
      b.classList.toggle('bg-green-700', active);
      b.classList.toggle('text-white', active);
      b.classList.toggle('font-medium', active);
      b.classList.toggle('hover:bg-green-50', !active);
    }
  }

  function renderPlants(plants) {
    if (!els.plantsGridEl) return;
    els.plantsGridEl.innerHTML = '';
    state.plants = plants;

    if (!plants.length) {
      els.plantsGridEl.innerHTML =
        '<div class="col-span-full bg-[#F0FDF4] text-center p-10 rounded-xl text-[#166534]">No plants found for this category.</div>';
      return;
    }

    for (let i = 0; i < plants.length; i++) {
      const p = plants[i];
      const card = document.createElement('div');
      card.className = 'bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden';
      card.innerHTML =
        '<div class="w-full h-44 bg-gray-100">' +
        '  <img src="' +
        (p.image || '') +
        '" alt="' +
        (p.name || 'Tree') +
        '" class="w-full h-full object-cover" onerror="this.src=\'https://via.placeholder.com/600x400?text=Plant\'">' +
        '</div>' +
        '<div class="px-4 pb-4 pt-2">' +
        '  <h3 class="text-[15px] font-semibold text-[#111827] mt-2">' +
        '    <button class="link link-hover text-[#111827]" data-detail-id="' +
        p.id +
        '">' +
        (p.name || 'Tree') +
        '</button>' +
        '  </h3>' +
        '  <p class="text-sm text-gray-600 mt-1">' +
        (p.shortDescription || '') +
        '</p>' +
        '  <div class="flex items-center justify-between mt-2">' +
        '    <span class="text-xs md:text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">' +
        (p.category || 'Tree') +
        '</span>' +
        '    <span class="text-sm md:text-base font-semibold text-[#111827]">' +
        formatCurrency(p.price) +
        '</span>' +
        '  </div>' +
        '  <button class="btn w-full mt-3 bg-[#15803D] text-white border-0 rounded-full">Add to Cart</button>' +
        '</div>';

      // Modal opener
      const nameBtn = $('button[data-detail-id]', card);
      if (nameBtn) {
        nameBtn.addEventListener('click', (function (plantObj) {
          return function () {
            openPlantModal(plantObj);
          };
        })(p));
      }

      // Add to cart
      const addBtn = $('button.btn', card);
      if (addBtn) {
        addBtn.addEventListener('click', (function (plantObj) {
          return function () {
            addToCart(plantObj);
          };
        })(p));
      }

      els.plantsGridEl.appendChild(card);
    }
  }

  function renderCart() {
    if (!els.cartListEl || !els.cartTotalEl || !els.cartCountEl) return;
    els.cartListEl.innerHTML = '';

    // Group by id for qty
    const grouped = {};
    for (let i = 0; i < state.cart.length; i++) {
      var it = state.cart[i];
      if (!grouped[it.id]) grouped[it.id] = { id: it.id, name: it.name, price: it.price, qty: 0 };
      grouped[it.id].qty += 1;
    }

    var keys = Object.keys(grouped);
    if (!keys.length) {
      els.cartListEl.innerHTML =
        '<li class="text-sm text-gray-500 bg-white rounded-lg p-3"></li>';
    } else {
      for (var k = 0; k < keys.length; k++) {
        var g = grouped[keys[k]];
        var li = document.createElement('li');
        li.className = 'flex items-center justify-between bg-green-50 rounded-lg px-3 py-2';
        li.innerHTML =
          '<div class="min-w-0">' +
          '  <p class="font-medium text-[#111827] truncate">' +
          g.name +
          '</p>' +
          '  <p class="text-xs text-gray-600">' +
          formatCurrency(g.price) +
          ' × ' +
          g.qty +
          '</p>' +
          '</div>' +
          '<button class="btn btn-ghost btn-xs text-gray-500 hover:text-red-600">✕</button>';

        var removeBtn = $('button', li);
        if (removeBtn) {
          removeBtn.addEventListener('click', (function (removeId) {
            return function () {
              state.cart = state.cart.filter(function (c) {
                return c.id !== removeId;
              });
              renderCart();
            };
          })(g.id));
        }

        els.cartListEl.appendChild(li);
      }
    }

    var total = 0;
    for (var j = 0; j < state.cart.length; j++) total += state.cart[j].price || 0;
    els.cartTotalEl.textContent = formatCurrency(total);
    els.cartCountEl.textContent =
      state.cart.length + ' ' + (state.cart.length === 1 ? 'item' : 'items');
  }


  // Handlers

  async function handleCategoryClick(catId) {
    if (state.activeCategoryId === catId) return;
    state.activeCategoryId = catId;
    setActiveCategoryButton(catId);

    if (catId === 'all') await loadAllPlants();
    else await loadPlantsByCategory(catId);
  }

  function addToCart(plant) {
    state.cart.push({ id: plant.id, name: plant.name, price: plant.price });
    renderCart();
  }

  // Modal with robust title (no "Unknown")
  async function openPlantModal(plantOrObj) {
    ensureModal();
    var fallback =
      typeof plantOrObj === 'object'
        ? plantOrObj
        : (function () {
            for (var i = 0; i < state.plants.length; i++) {
              if (String(state.plants[i].id) === String(plantOrObj)) return state.plants[i];
            }
            return null;
          })();

    var id =
      typeof plantOrObj === 'object' ? plantOrObj.id : String(plantOrObj);

    if (els.modalContent) {
      els.modalContent.innerHTML =
        '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">' +
        '  <div class="w-full h-56 bg-gray-100 rounded-xl animate-pulse"></div>' +
        '  <div>' +
        '    <h3 class="text-xl font-bold text-[#166534]">' +
        (fallback && fallback.name ? fallback.name : 'Loading…') +
        '</h3>' +
        '    <p class="text-sm text-gray-600 mt-2">Loading details…</p>' +
        '  </div>' +
        '</div>';
    }
    try {
      if (els.modal && typeof els.modal.showModal === 'function') els.modal.showModal();
      else if (els.modal) els.modal.setAttribute('open', '');
    } catch (e) {
      if (els.modal) els.modal.setAttribute('open', '');
    }

    try {
      var resp = await fetchJSON(API.plantDetail(id));
      var raw = getDetailPayload(resp);
      var d = normalizePlant(raw) || {};

      var merged = {
        id: d.id || (fallback ? fallback.id : id),
        name:
          d.name && d.name !== 'Unknown Plant'
            ? d.name
            : fallback && fallback.name
            ? fallback.name
            : 'Tree',
        image: d.image || (fallback ? fallback.image : ''),
        category: d.category || (fallback ? fallback.category : 'Tree'),
        price:
          typeof d.price === 'number' && d.price > 0
            ? d.price
            : fallback
            ? fallback.price
            : 0,
        shortDescription:
          d.shortDescription ||
          (fallback ? fallback.shortDescription : ''),
      };

      var fullDesc =
        (raw && raw.full_description) ||
        (raw && raw.description) ||
        (raw && raw.details) ||
        merged.shortDescription ||
        'No description available.';

      var extras = [];
      function pushExtra(label, val) {
        if (val != null && String(val).trim() !== '') {
          extras.push('<li><span class="font-medium">' + label + ':</span> ' + val + '</li>');
        }
      }
      pushExtra('Sunlight', raw && raw.sunlight);
      pushExtra('Watering', (raw && raw.watering) || (raw && raw.water));
      pushExtra('Origin', raw && raw.origin);
      pushExtra('Mature Size', raw && raw.mature_size);
      pushExtra('Hardiness', raw && raw.hardiness);
      pushExtra('Rating', raw && raw.rating);

      if (els.modalContent) {
        els.modalContent.innerHTML =
          '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">' +
          '  <img src="' + (merged.image || '') + '" alt="' + merged.name + '" class="w-full h-56 object-cover rounded-xl bg-gray-100" onerror="this.src=\'https://via.placeholder.com/600x400?text=Plant\'">' +
          '  <div>' +
          '    <h3 class="text-xl font-bold text-[#166534]">' + merged.name + '</h3>' +
          '    <div class="flex items-center gap-2 mt-1">' +
          '      <span class="badge badge-outline">' + merged.category + '</span>' +
          '      <span class="font-semibold text-[#166534]">' + formatCurrency(merged.price) + '</span>' +
          '    </div>' +
          '    <p class="text-sm text-gray-700 mt-3">' + fullDesc + '</p>' +
          (extras.length ? '<ul class="mt-3 space-y-1 text-sm text-gray-700">' + extras.join('') + '</ul>' : '') +
          '    <div class="mt-4">' +
          '      <button id="modalAddCart" class="btn bg-[#15803D] text-white border-0 rounded-full">Add to Cart</button>' +
          '    </div>' +
          '  </div>' +
          '</div>';
      }

      const addBtn = $('#modalAddCart', els.modalContent || document);
      if (addBtn) {
        addBtn.addEventListener('click', function () {
          addToCart(merged);
          try {
            if (els.modal && typeof els.modal.close === 'function') els.modal.close();
            else if (els.modal) els.modal.removeAttribute('open');
          } catch (e) {
            if (els.modal) els.modal.removeAttribute('open');
          }
        });
      }
    } catch (e) {
      if (els.modalContent) {
        els.modalContent.innerHTML = '<div class="text-red-600">Failed to load plant details. Please try again.</div>';
      }
      console.error(e);
    }
  }

  // -----------------------------
  // Loaders
  // -----------------------------
  async function loadCategories() {
    try {
      showSpinner();
      var data = await fetchJSON(API.categories);
      var cats = extractArray(data).map(normalizeCategory).filter(function (x) { return !!x; });
      state.categories = cats;
      renderCategories(cats);
    } catch (e) {
      console.error(e);
      if (els.categoryListEl) {
        els.categoryListEl.innerHTML =
          '<li class="bg-red-50 border border-red-200 text-red-600 rounded-md p-3">Failed to load categories.</li>';
      }
    } finally {
      hideSpinner();
    }
  }

  async function loadAllPlants() {
    try {
      showSpinner();
      var data = await fetchJSON(API.allPlants);
      var plants = extractArray(data).map(normalizePlant).filter(function (x) { return !!x; });
      // Ensure each plant has a proper name
      for (let i = 0; i < plants.length; i++) {
        if (!plants[i].name || plants[i].name === 'Unknown Plant') {
          const r = plants[i]._raw || {};
          plants[i].name = r.plant_name || r.name || r.title || 'Tree';
        }
      }
      renderPlants(plants);
    } catch (e) {
      console.error(e);
      if (els.plantsGridEl) {
        els.plantsGridEl.innerHTML =
          '<div class="col-span-full bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">Failed to load plants. Please try again.</div>';
      }
    } finally {
      hideSpinner();
    }
  }

  async function loadPlantsByCategory(catId) {
    try {
      showSpinner();
      var data = await fetchJSON(API.plantsByCategory(catId));
      var plants = extractArray(data).map(normalizePlant).filter(function (x) { return !!x; });
      for (var i = 0; i < plants.length; i++) {
        if (!plants[i].name || plants[i].name === 'Unknown Plant') {
          var r = plants[i]._raw || {};
          plants[i].name = r.plant_name || r.name || r.title || 'Tree';
        }
      }
      renderPlants(plants);
    } catch (e) {
      console.error(e);
      if (els.plantsGridEl) {
        els.plantsGridEl.innerHTML =
          '<div class="col-span-full bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">Failed to load plants for this category.</div>';
      }
    } finally {
      hideSpinner();
    }
  }

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    var yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    els.globalSpinner = $('#globalSpinner');

    buildShopUI();
    loadCategories();
    loadAllPlants();
    renderCart();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();