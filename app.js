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
function setDrawer(open) { cartDrawer.classList.toggle("open", open); drawerOverlay.classList.toggle("open", open); cartDrawer.setAttribute("aria-hidden", String(!open)); if (!open) showCheckoutStep(); }

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tg) { tg.ready(); tg.expand(); }

// IMPORTANT: replace with your bot server's public HTTPS URL (see bot.py's
// API_PORT / reverse-proxy notes). Browsers block http:// calls from this
// https:// page, so this must be a real https:// address, not http://.
const API_BASE_URL = "https://soneyay-fa-d64.e.onjrnm.co.uk";

function notify(msg) {
  console.log("[notify]", msg);
  try {
    if (tg && tg.showAlert) { tg.showAlert(msg); return; }
  } catch (err) { console.error("showAlert failed:", err); }
  try { alert(msg); } catch (err) { console.error("alert failed:", err); }
}

function telegramUser() {
  const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  return user ? { id: user.id, username: user.username || user.first_name || String(user.id) } : null;
}

const paymentAccounts = {
  kbzpay: { label: "KBZPay", number: "09-750 123 456" },
  wavemoney: { label: "WaveMoney", number: "09-961 234 567" }
};
const paymentCodes = { kbzpay: "KBZPay", wavemoney: "WavePay", cod: "COD" };
let selectedPaymentMethod = "kbzpay";
let selectedScreenshot = null;

const custNameInput = $("#custName"), custPhoneInput = $("#custPhone"), custAddressInput = $("#custAddress");
const checkoutStep = $("#checkoutStep"), paymentStep = $("#paymentStep"), checkoutButton = $("#checkoutButton"), backToCartButton = $("#backToCartButton");
const paymentMethodButtons = document.querySelectorAll(".payment-method");
const paymentAccount = $("#paymentAccount"), paymentAccountName = $("#paymentAccountName"), paymentAccountNumber = $("#paymentAccountNumber"), copyAccountButton = $("#copyAccountButton");
const codNote = $("#codNote");
const dropzone = $("#dropzone"), dropzoneEmpty = $("#dropzoneEmpty"), dropzoneFilled = $("#dropzoneFilled"), dropzonePreview = $("#dropzonePreview"), dropzoneFileName = $("#dropzoneFileName");
const paymentScreenshotInput = $("#paymentScreenshot"), removeScreenshotButton = $("#removeScreenshotButton"), submitPaymentButton = $("#submitPaymentButton");
const paymentStepContent = $("#paymentStepContent"), orderSuccess = $("#orderSuccess"), successSub = $("#successSub");

function showCheckoutStep() { checkoutStep.hidden = false; paymentStep.hidden = true; }
function showPaymentStep() {
  checkoutStep.hidden = true; paymentStep.hidden = false;
  paymentStepContent.hidden = false; orderSuccess.hidden = true;
}

function setPaymentMethod(method) {
  selectedPaymentMethod = method;
  const isCod = method === "cod";

  // COD needs no wallet transfer and no payment-proof screenshot.
  paymentAccount.hidden = isCod;
  dropzone.hidden = isCod;
  codNote.hidden = !isCod;
  submitPaymentButton.textContent = isCod ? "မှာယူမှု အတည်ပြုပါ" : "ငွေလွှဲပြေစာ ပို့ရန်";
  submitPaymentButton.disabled = isCod ? false : !selectedScreenshot;

  if (!isCod) {
    const account = paymentAccounts[method];
    paymentAccountName.textContent = account.label;
    paymentAccountNumber.textContent = account.number;
  }

  paymentMethodButtons.forEach((button) => { const isActive = button.dataset.method === method; button.classList.toggle("active", isActive); button.setAttribute("aria-selected", String(isActive)); });
}

function setScreenshot(file) {
  if (!file || !file.type.startsWith("image/")) return;
  selectedScreenshot = file;
  const reader = new FileReader();
  reader.onload = () => { dropzonePreview.src = String(reader.result); };
  reader.readAsDataURL(file);
  dropzoneFileName.textContent = file.name;
  dropzoneEmpty.hidden = true; dropzoneFilled.hidden = false;
  submitPaymentButton.disabled = false;
}

function clearScreenshot() {
  selectedScreenshot = null; paymentScreenshotInput.value = "";
  dropzoneEmpty.hidden = false; dropzoneFilled.hidden = true;
  submitPaymentButton.disabled = true;
}

checkoutButton.addEventListener("click", () => {
  if (!custNameInput.value.trim() || !custPhoneInput.value.trim() || !custAddressInput.value.trim()) {
    notify("ကျေးဇူးပြု၍ အမည်၊ ဖုန်းနံပါတ်နှင့် လိပ်စာ ဖြည့်ပေးပါ။");
    return;
  }
  showPaymentStep();
});
backToCartButton.addEventListener("click", showCheckoutStep);
paymentMethodButtons.forEach((button) => button.addEventListener("click", () => setPaymentMethod(button.dataset.method)));
copyAccountButton.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(paymentAccountNumber.textContent || ""); } catch { /* clipboard unavailable */ }
  copyAccountButton.classList.add("copied"); copyAccountButton.textContent = "ကူးယူပြီးပါပြီ";
  setTimeout(() => { copyAccountButton.classList.remove("copied"); copyAccountButton.textContent = "ကူးယူရန်"; }, 1600);
});
paymentScreenshotInput.addEventListener("change", () => { if (paymentScreenshotInput.files && paymentScreenshotInput.files[0]) setScreenshot(paymentScreenshotInput.files[0]); });
removeScreenshotButton.addEventListener("click", (event) => { event.preventDefault(); clearScreenshot(); });
dropzone.addEventListener("dragover", (event) => { event.preventDefault(); dropzone.classList.add("dragover"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault(); dropzone.classList.remove("dragover");
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  if (file) setScreenshot(file);
});
dropzone.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); paymentScreenshotInput.click(); } });
function buildOrder() {
  return {
    type: "order",
    items: cartDetails().map(({ product, quantity }) => ({ name: product.name, meta: product.meta, quantity, price: product.price })),
    total: cartDetails().reduce((sum, { product, quantity }) => sum + product.price * quantity, 0),
    payment: paymentCodes[selectedPaymentMethod],
    customer: { name: custNameInput.value.trim(), phone: custPhoneInput.value.trim(), address: custAddressInput.value.trim() }
  };
}

function resetCartAndForm() {
  cart = {}; renderProducts(); renderCart(); clearScreenshot(); setPaymentMethod("kbzpay");
  custNameInput.value = ""; custPhoneInput.value = ""; custAddressInput.value = "";
}

function showOrderSuccess(message) {
  paymentStepContent.hidden = true;
  successSub.textContent = message;
  orderSuccess.hidden = false;
}

submitPaymentButton.addEventListener("click", async () => {
  if (Object.keys(cart).length === 0) return;
  if (selectedPaymentMethod !== "cod" && !selectedScreenshot) return;

  const user = telegramUser();
  if (!user) {
    notify("Telegram App ထဲမှသာ မှာယူ၍ရပါမည်။ Telegram ထဲတွင် ဤဆိုင်ကို ပြန်ဖွင့်ပေးပါ။");
    return;
  }

  const order = buildOrder();
  const formData = new FormData();
  formData.append("order", JSON.stringify(order));
  formData.append("telegram_user_id", String(user.id));
  formData.append("username", user.username);
  if (selectedScreenshot) formData.append("photo", selectedScreenshot, selectedScreenshot.name);

  submitPaymentButton.disabled = true;
  submitPaymentButton.classList.add("is-loading");
  submitPaymentButton.textContent = "ပို့နေသည်...";

  try {
    const response = await fetch(`${API_BASE_URL}/api/order`, { method: "POST", body: formData });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) {
      throw new Error((result && result.error) || `HTTP ${response.status}`);
    }

    const message = selectedPaymentMethod === "cod"
      ? "ပစ္စည်းရောက်ရှိချိန်တွင် ငွေချေပေးပါ။"
      : "Admin မှ အတည်ပြုပေးမည်ကို ခဏစောင့်ပေးပါ။";
    showOrderSuccess(message);

    setTimeout(() => {
      resetCartAndForm();
      showCheckoutStep();
      setDrawer(false);
    }, 2200);
  } catch (err) {
    console.error(err);
    notify("မှာယူမှု ပို့၍မရပါ — ကွန်ရက် စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။ (" + err.message + ")");
  } finally {
    submitPaymentButton.disabled = false;
    submitPaymentButton.classList.remove("is-loading");
    submitPaymentButton.textContent = "ငွေလွှဲပြေစာ ပို့ရန်";
  }
});
categoryTabs.addEventListener("click", (event) => { const button = event.target.closest("[data-category]"); if (!button) return; activeCategory = button.dataset.category; renderCategories(); renderProducts(); });
searchInput.addEventListener("input", () => { searchTerm = searchInput.value; renderProducts(); }); sortSelect.addEventListener("change", renderProducts);
$("#bagButton").addEventListener("click", () => setDrawer(true)); $("#viewBag").addEventListener("click", () => setDrawer(true)); $("#closeBag").addEventListener("click", () => setDrawer(false)); drawerOverlay.addEventListener("click", () => setDrawer(false));
$("#searchToggle").addEventListener("click", () => { searchInput.focus(); searchInput.scrollIntoView({ behavior: "smooth", block: "center" }); });
renderCategories(); renderProducts(); renderCart(); setPaymentMethod("kbzpay");
