const products = [
  { id: 1, name: "ပုံသွင်း ဘလေဇာ", category: "Trendy", meta: "Atelier N° 8 · အနက်", price: 312000, image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85", badge: "အသစ်" },
  { id: 2, name: "လီနင်ရှည်ဝတ်စုံ", category: "Women", meta: "Lune Studio · အဖြူဖျော့", price: 201600, image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=85" },
  { id: 3, name: "အေးမြသော ရှပ်အင်္ကျီ", category: "Men", meta: "Common Ground · အစိမ်းဖျော့", price: 151200, image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85", badge: "အသစ်" },
  { id: 4, name: "သားရေပခုံးအိတ်", category: "Accessories", meta: "Forma · ကော်ဖီရောင်", price: 260400, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85" },
  { id: 5, name: "နေ့စဉ်ဝတ် ဘောင်းဘီရှည်", category: "Women", meta: "Still Life · ဒင်နင်", price: 184800, image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=85" },
  { id: 6, name: "ခေတ်ဟောင်း စနီကာ", category: "Shoes", meta: "Reebok · အဖြူဖျော့", price: 231000, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85" },
  { id: 7, name: "မီရီနိုချည် ပိုလို", category: "Men", meta: "Norse Project · ကုလားအုတ်ရောင်", price: 220500, image: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=900&q=85" },
  { id: 8, name: "ကိုယ်ထည်ပါ နေကာမျက်မှန်", category: "Accessories", meta: "Onda · အညိုရောင်", price: 113400, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85" }
];
const categories = ["All", "Trendy", "Women", "Men", "Accessories", "Shoes"];
const categoryLabels = { All: "အားလုံး", Trendy: "ခေတ်စား", Women: "အမျိုးသမီး", Men: "အမျိုးသား", Accessories: "အသုံးအဆောင်", Shoes: "ဖိနပ်" };
let activeCategory = "All", searchTerm = "", cart = {};
const $ = (selector) => document.querySelector(selector);
const categoryTabs = $("#categoryTabs"), catalog = $("#catalog"), emptyState = $("#emptyState"), template = $("#productTemplate");
const searchInput = $("#searchInput"), sortSelect = $("#sortSelect"), cartDrawer = $("#cartDrawer"), drawerOverlay = $("#drawerOverlay"), drawerItems = $("#drawerItems");
const money = (value) => `${value.toLocaleString("en-US")} ကျပ်`;
function renderCategories() { categoryTabs.innerHTML = categories.map((category) => `<button class="category-tab ${category === activeCategory ? "active" : ""}" data-category="${category}" role="tab" aria-selected="${category === activeCategory}">${categoryLabels[category]}</button>`).join(""); }
function visibleProducts() { return products.filter((product) => (activeCategory === "All" || product.category === activeCategory) && `${product.name} ${product.category} ${product.meta}`.toLowerCase().includes(searchTerm.toLowerCase())).sort((first, second) => sortSelect.value === "price-low" ? first.price - second.price : sortSelect.value === "price-high" ? second.price - first.price : first.id - second.id); }
function renderProducts() {
  const items = visibleProducts(); catalog.innerHTML = ""; emptyState.hidden = items.length > 0;
  items.forEach((product) => { const card = template.content.cloneNode(true), quantity = cart[product.id] || 0;
    const image = card.querySelector(".product-image"); image.src = product.image; image.alt = product.name;
    card.querySelector(".product-name").textContent = product.name; card.querySelector(".product-meta").textContent = product.meta; card.querySelector(".product-price").textContent = money(product.price);
    const badge = card.querySelector(".product-badge"); if (product.badge) { badge.hidden = false; badge.textContent = product.badge; }
    const count = card.querySelector(".product-count"); count.hidden = quantity === 0; count.textContent = String(quantity);
    const addButton = card.querySelector(".add-button"), controls = card.querySelector(".quantity-controls"), quantityValue = card.querySelector(".quantity-value");
    if (quantity > 0) { addButton.hidden = true; controls.hidden = false; quantityValue.textContent = String(quantity); }
    addButton.addEventListener("click", () => updateQuantity(product.id, 1)); card.querySelector(".decrease").addEventListener("click", () => updateQuantity(product.id, -1)); card.querySelector(".increase").addEventListener("click", () => updateQuantity(product.id, 1)); catalog.appendChild(card);
  });
}
function updateQuantity(id, change) { const nextQuantity = Math.max(0, (cart[id] || 0) + change); if (nextQuantity === 0) delete cart[id]; else cart[id] = nextQuantity; renderProducts(); renderCart(); }
function cartDetails() { return products.filter((product) => cart[product.id]).map((product) => ({ product, quantity: cart[product.id] })); }
function renderCart() {
  const details = cartDetails(), itemCount = details.reduce((sum, item) => sum + item.quantity, 0), total = details.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  $("#bagCount").textContent = String(itemCount); $("#cartItemCount").textContent = `${itemCount} ပစ္စည်း`; $("#cartTotal").textContent = money(total); $("#drawerTotal").textContent = money(total);
  $("#cartBar").classList.toggle("visible", itemCount > 0); $("#cartBar").setAttribute("aria-hidden", String(itemCount === 0));
  drawerItems.innerHTML = details.length ? details.map(({ product, quantity }) => `<div class="drawer-item"><img src="${product.image}" alt="${product.name}" /><div class="drawer-item-info"><h3>${product.name}</h3><p>${product.meta}</p><strong class="drawer-item-price">${money(product.price)}</strong></div><div class="mini-quantity"><button data-id="${product.id}" data-change="-1" aria-label="${product.name} တစ်ခုလျှော့ရန်">−</button><span>${quantity}</span><button data-id="${product.id}" data-change="1" aria-label="${product.name} တစ်ခုတိုးရန်">+</button></div></div>`).join("") : `<p class="empty-state">သင့်အိတ်ထဲတွင် ပစ္စည်းမရှိသေးပါ။</p>`;
  drawerItems.querySelectorAll("button[data-id]").forEach((button) => button.addEventListener("click", () => updateQuantity(Number(button.dataset.id), Number(button.dataset.change))));
}
function setDrawer(open) { cartDrawer.classList.toggle("open", open); drawerOverlay.classList.toggle("open", open); cartDrawer.setAttribute("aria-hidden", String(!open)); }
categoryTabs.addEventListener("click", (event) => { const button = event.target.closest("[data-category]"); if (!button) return; activeCategory = button.dataset.category; renderCategories(); renderProducts(); });
searchInput.addEventListener("input", () => { searchTerm = searchInput.value; renderProducts(); }); sortSelect.addEventListener("change", renderProducts);
$("#bagButton").addEventListener("click", () => setDrawer(true)); $("#viewBag").addEventListener("click", () => setDrawer(true)); $("#closeBag").addEventListener("click", () => setDrawer(false)); drawerOverlay.addEventListener("click", () => setDrawer(false));
$("#searchToggle").addEventListener("click", () => { searchInput.focus(); searchInput.scrollIntoView({ behavior: "smooth", block: "center" }); }); $("#checkoutButton").addEventListener("click", () => alert("ငွေရှင်းခြင်းကို Telegram နှင့် ချိတ်ဆက်ပေးပါမည်။"));
renderCategories(); renderProducts(); renderCart();
