let products = [

];
const categories = ["All", "Trendy", "Women", "Men", "Accessories", "Shoes"];
const categoryLabels = { All: "အားလုံး", Trendy: "ခေတ်စား", Women: "အမျိုးသမီး", Men: "အမျိုးသား", Accessories: "အသုံးအဆောင်", Shoes: "ဖိနပ်" };
let activeCategory = "All", searchTerm = "", cart = {};
const $ = (selector) => document.querySelector(selector);
const categoryTabs = $("#categoryTabs"), catalog = $("#catalog"), emptyState = $("#emptyState"), template = $("#productTemplate");
const searchInput = $("#searchInput"), sortSelect = $("#sortSelect"), cartDrawer = $("#cartDrawer"), drawerOverlay = $("#drawerOverlay"), drawerItems = $("#drawerItems");
const money = (value) => `${value.toLocaleString("en-US")} ကျပ်`;
const STOCK_OUT_GRACE_MS = 4 * 60 * 60 * 1000;
function hasStock(product) {
  if (!Object.prototype.hasOwnProperty.call(product, "stock")) return true;
  return product.stock !== null && String(product.stock).trim() !== "" && Number(product.stock) > 0;
}
function isStockOut(product) { return Object.prototype.hasOwnProperty.call(product, "stock") && !hasStock(product); }
function renderCategories() { categoryTabs.innerHTML = categories.map((category) => `<button class="category-tab ${category === activeCategory ? "active" : ""}" data-category="${category}" role="tab" aria-selected="${category === activeCategory}">${categoryLabels[category]}</button>`).join(""); }
function visibleProducts() { return products.filter((product) => (activeCategory === "All" || product.category === activeCategory) && `${product.name} ${product.category} ${product.meta}`.toLowerCase().includes(searchTerm.toLowerCase())).sort((first, second) => sortSelect.value === "price-low" ? first.price - second.price : sortSelect.value === "price-high" ? second.price - first.price : 0); }
function renderProducts() {
  const items = visibleProducts(); catalog.innerHTML = ""; emptyState.hidden = items.length > 0;
  items.forEach((product) => { const card = template.content.cloneNode(true), quantity = cart[product.id] || 0;
    const image = card.querySelector(".product-image"); const video = card.querySelector(".product-video");
    if (product.mediaType === "video" && product.image) { image.hidden = true; video.hidden = false; video.src = product.image; } else if (product.image) { image.src = product.image; image.alt = product.name; } else { image.hidden = true; video.hidden = true; }
    card.querySelector(".product-name").textContent = product.name; card.querySelector(".product-meta").textContent = product.meta; card.querySelector(".product-price").textContent = money(product.price);
    card.querySelector(".product-stock").textContent = Number.isFinite(Number(product.stock)) ? `Stock: ${Math.max(0, Number(product.stock) - quantity)}` : "";
    const badge = card.querySelector(".product-badge"); if (product.badge) { badge.hidden = false; badge.textContent = product.badge; }
    const count = card.querySelector(".product-count"); count.hidden = quantity === 0; count.textContent = String(quantity);
    const addButton = card.querySelector(".add-button"), controls = card.querySelector(".quantity-controls"), quantityValue = card.querySelector(".quantity-value");
    const availableStock = Number.isFinite(Number(product.stock)) ? Math.max(0, Number(product.stock)) : Infinity;
    const stockOut = !hasStock(product) || availableStock <= quantity;
    addButton.disabled = stockOut;
    if (stockOut) addButton.textContent = "Stock out!";
    if (quantity > 0) { addButton.hidden = true; controls.hidden = false; quantityValue.textContent = String(quantity); }
    card.querySelector(".product-card").addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      openProductDetail(product);
    });
    addButton.addEventListener("click", () => updateQuantity(product.id, 1)); card.querySelector(".decrease").addEventListener("click", () => updateQuantity(product.id, -1)); card.querySelector(".increase").addEventListener("click", () => updateQuantity(product.id, 1)); catalog.appendChild(card);
  });
}
function updateQuantity(id, change) {
  const product = products.find((item) => item.id === id);
  const availableStock = product && Number.isFinite(Number(product.stock)) ? Math.max(0, Number(product.stock)) : Infinity;
  if (change > 0 && (!product || !hasStock(product))) { notify("Stock out!"); return; }
  const currentQuantity = cart[id] || 0;
  const requestedQuantity = Math.max(0, currentQuantity + change);
  const nextQuantity = Math.min(availableStock, requestedQuantity);
  if (nextQuantity === 0) delete cart[id]; else cart[id] = nextQuantity;
  if (change > 0 && requestedQuantity > availableStock) notify("ဒီပစ္စည်း၏ stock မလုံလောက်တော့ပါ။");
  renderProducts(); renderCart();
}
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

// Bot server's public HTTPS URL, now hosted on Render.
// Browsers block http:// calls from this https:// page, so this must stay https://.
const API_BASE_URL = "https://soneyay-fa-6da.b.onjrnm.vip";

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

function stockOutTimestamp(product) {
  if (!product.stockOutAt) return null;
  if (typeof product.stockOutAt.toDate === "function") return product.stockOutAt.toDate().getTime();
  if (product.stockOutAt instanceof Date) return product.stockOutAt.getTime();
  if (typeof product.stockOutAt === "number") return product.stockOutAt;
  return null;
}

async function removeStockOutProduct(product) {
  if (typeof product.id === "string") {
    await window.firebaseReady;
    await firebase.firestore().collection("products").doc(product.id).delete();
  }
  products = products.filter((item) => item.id !== product.id);
  delete cart[product.id];
  renderProducts();
  renderCart();
}

function scheduleStockOutCleanup(product) {
  if (!isStockOut(product) || typeof product.id !== "string") return;
  const stockOutAt = stockOutTimestamp(product);
  const startedAt = stockOutAt || Date.now();
  if (!stockOutAt) {
    firebase.firestore().collection("products").doc(product.id).update({ stockOutAt: firebase.firestore.FieldValue.serverTimestamp() }).catch((error) => console.error("Could not start stock-out timer:", error));
  }
  const remaining = Math.max(0, startedAt + STOCK_OUT_GRACE_MS - Date.now());
  if (remaining === 0) removeStockOutProduct(product).catch((error) => console.error("Could not remove stock-out product:", error));
  else setTimeout(() => removeStockOutProduct(product).catch((error) => console.error("Could not remove stock-out product:", error)), remaining);
}

async function decreasePurchasedStock(details) {
  await window.firebaseReady;
  const firestore = firebase.firestore();
  await Promise.all(details.filter(({ product }) => typeof product.id === "string").map(({ product, quantity }) => {
    const productRef = firestore.collection("products").doc(product.id);
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(productRef);
      if (!snapshot.exists) return;
      const currentStock = Number(snapshot.data().stock);
      if (!Number.isFinite(currentStock) || currentStock < quantity) throw new Error(`${product.name} stock is no longer available`);
      const nextStock = currentStock - quantity;
      transaction.update(productRef, { stock: nextStock, ...(nextStock <= 0 ? { stockOutAt: firebase.firestore.FieldValue.serverTimestamp() } : {}) });
    });
  }));
  details.forEach(({ product, quantity }) => {
    if (Number.isFinite(Number(product.stock))) {
      product.stock = Math.max(0, Number(product.stock) - quantity);
      if (product.stock === 0) { product.stockOutAt = new Date(); scheduleStockOutCleanup(product); }
    }
  });
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
    const purchasedDetails = cartDetails();
    const response = await fetch(`${API_BASE_URL}/api/order`, { method: "POST", body: formData });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) {
      throw new Error((result && result.error) || `HTTP ${response.status}`);
    }
    await decreasePurchasedStock(purchasedDetails);

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
    notify(err.message.includes("stock is no longer available")
      ? "Stock ပြောင်းလဲသွားပါပြီ။ ပစ္စည်းအရေအတွက်ကို ပြန်စစ်ပြီး ထပ်မှာယူပါ။"
      : "မှာယူမှု ပို့၍မရပါ — ကွန်ရက် စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။ (" + err.message + ")");
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

const controlPanelTab = $("#controlPanelTab");
const controlPanel = $("#controlPanel");
const adminDialogBackdrop = $("#adminDialogBackdrop");
const adminDialog = $("#adminDialog");
const adminUsername = $("#adminUsername");
const adminFeedback = $("#adminFeedback");
const productMediaDropzone = $("#productMediaDropzone");
const productMediaInput = $("#productMedia");
const selectedMedia = $("#selectedMedia");
const uploadFeedback = $("#uploadFeedback");
const productUploadForm = $("#productUploadForm");
const uploadProductButton = productUploadForm.querySelector(".upload-product-button");
const productDetailBackdrop = $("#productDetailBackdrop");
const detailGallery = $("#detailGallery");
const detailProductCategory = $("#detailProductCategory");
const detailProductName = $("#detailProductName");
const detailProductPrice = $("#detailProductPrice");
const detailProductDescription = $("#detailProductDescription");
const detailChoices = $("#detailChoices");
const detailAddButton = $("#detailAddButton");
const thumbnailDropzone = $("#thumbnailDropzone");
const thumbnailInput = $("#thumbnailInput");
const thumbnailEmpty = $("#thumbnailEmpty");
const thumbnailPreview = $("#thumbnailPreview");
const thumbnailImage = $("#thumbnailImage");
const thumbnailVideo = $("#thumbnailVideo");
const thumbnailFileName = $("#thumbnailFileName");
const choiceList = $("#choiceList");
const addChoiceButton = $("#addChoiceButton");
let adminUnlocked = false;
let selectedProductMedia = [];
let selectedThumbnail = null;
let activeDetailProduct = null;

function openAdminDialog() {
  adminDialogBackdrop.hidden = false;
  adminFeedback.textContent = "";
  adminUsername.value = "";
  adminUsername.focus();
}

function closeAdminDialog() { adminDialogBackdrop.hidden = true; }

function showControlPanel() {
  controlPanel.hidden = false;
  controlPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderSelectedMedia() {
  selectedMedia.innerHTML = selectedProductMedia.map((file) => `<span>${file.type.startsWith("video/") ? "Video" : "Photo"}: ${file.name}</span>`).join("");
}

function setThumbnail(file) {
  if (!file || (!file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
    uploadFeedback.textContent = "Thumbnail must be a photo or video.";
    return;
  }
  selectedThumbnail = file;
  thumbnailEmpty.hidden = true;
  thumbnailPreview.hidden = false;
  thumbnailImage.hidden = !file.type.startsWith("image/");
  thumbnailVideo.hidden = !file.type.startsWith("video/");
  const previewUrl = URL.createObjectURL(file);
  if (file.type.startsWith("image/")) thumbnailImage.src = previewUrl;
  else thumbnailVideo.src = previewUrl;
  thumbnailFileName.textContent = file.name;
}

function clearThumbnail() {
  selectedThumbnail = null;
  thumbnailInput.value = "";
  thumbnailEmpty.hidden = false;
  thumbnailPreview.hidden = true;
  thumbnailImage.removeAttribute("src");
  thumbnailVideo.removeAttribute("src");
}

function addChoiceRow() {
  const row = document.createElement("div");
  row.className = "choice-row";
  row.innerHTML = `<input class="choice-input" type="text" placeholder="Item-Name or colour" aria-label="Item name or colour choice" required /><button class="remove-choice-button" type="button" aria-label="Remove choice">×</button>`;
  row.querySelector(".remove-choice-button").addEventListener("click", () => row.remove());
  choiceList.appendChild(row);
}

function openProductDetail(product) {
  activeDetailProduct = product;
  detailProductCategory.textContent = categoryLabels[product.category] || product.category || "Product";
  detailProductName.textContent = product.name;
  detailProductPrice.textContent = money(product.price);
  const stockOut = !hasStock(product) || Number(product.stock) <= (cart[product.id] || 0);
  detailProductStock.textContent = stockOut ? "Stock out!" : (Number.isFinite(Number(product.stock)) ? `Stock: ${Math.max(0, Number(product.stock) - (cart[product.id] || 0))}` : "");
  detailAddButton.disabled = stockOut;
  detailAddButton.innerHTML = stockOut ? "Stock out!" : "အိတ်ထဲထည့်ရန် <span>+</span>";
  detailProductDescription.textContent = product.meta || "";
  detailChoices.innerHTML = (product.choices || []).map((choice, index) => `<label><input type="radio" name="detail-choice" value="${choice}" ${index === 0 ? "checked" : ""} /> <span>${choice}</span></label>`).join("");
  const galleryItems = [];
  if (product.detailMediaUrls && product.detailMediaUrls.length) galleryItems.push(...product.detailMediaUrls);
  else if (product.image) galleryItems.push({ url: product.image, type: product.mediaType || "image/jpeg", name: product.name });
  detailGallery.innerHTML = galleryItems.map((item) => item.type.startsWith("video/")
    ? `<video src="${item.url}" controls muted playsinline></video>`
    : `<img src="${item.url}" alt="${product.name}" />`).join("");
  productDetailBackdrop.hidden = false;
}

function closeProductDetail() { productDetailBackdrop.hidden = true; activeDetailProduct = null; }

function setProductMedia(files) {
  const nextFiles = Array.from(files);
  const allFiles = [...selectedProductMedia, ...nextFiles];
  const photoCount = allFiles.filter((file) => file.type.startsWith("image/")).length;
  const videoCount = allFiles.filter((file) => file.type.startsWith("video/")).length;
  if (allFiles.some((file) => !file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
    uploadFeedback.textContent = "Only photos and videos can be uploaded.";
    return;
  }
  if (photoCount > 10 || videoCount > 5) {
    uploadFeedback.textContent = "Maximum 10 photos and 5 videos allowed.";
    return;
  }
  selectedProductMedia = allFiles;
  uploadFeedback.textContent = "";
  renderSelectedMedia();
}

controlPanelTab.addEventListener("click", () => { if (adminUnlocked) showControlPanel(); else openAdminDialog(); });
$("#closeControlPanel").addEventListener("click", () => { controlPanel.hidden = true; });
$("#cancelAdminDialog").addEventListener("click", closeAdminDialog);
adminDialogBackdrop.addEventListener("click", (event) => { if (event.target === adminDialogBackdrop) closeAdminDialog(); });
adminDialog.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = adminUsername.value.trim().toLowerCase();
  if (username !== "lavaflows11" && username !== "@lavaflows11") {
    adminFeedback.textContent = "You're not admin";
    return;
  }
  adminUnlocked = true;
  closeAdminDialog();
  showControlPanel();
});
productMediaInput.addEventListener("change", () => { if (productMediaInput.files) setProductMedia(productMediaInput.files); });
productMediaDropzone.addEventListener("dragover", (event) => { event.preventDefault(); productMediaDropzone.classList.add("dragover"); });
productMediaDropzone.addEventListener("dragleave", () => productMediaDropzone.classList.remove("dragover"));
productMediaDropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  productMediaDropzone.classList.remove("dragover");
  if (event.dataTransfer && event.dataTransfer.files) setProductMedia(event.dataTransfer.files);
});
thumbnailInput.addEventListener("change", () => { if (thumbnailInput.files && thumbnailInput.files[0]) setThumbnail(thumbnailInput.files[0]); });
thumbnailDropzone.addEventListener("dragover", (event) => { event.preventDefault(); thumbnailDropzone.classList.add("dragover"); });
thumbnailDropzone.addEventListener("dragleave", () => thumbnailDropzone.classList.remove("dragover"));
thumbnailDropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  thumbnailDropzone.classList.remove("dragover");
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  if (file) setThumbnail(file);
});
addChoiceButton.addEventListener("click", addChoiceRow);
productUploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!adminUnlocked) { openAdminDialog(); return; }
  if (!selectedThumbnail && selectedProductMedia.length === 0) { uploadFeedback.textContent = "Add a thumbnail or at least one detail photo/video."; return; }
  const productId = firebase.firestore().collection("products").doc().id;
  const product = {
    id: productId,
    name: $("#itemName").value.trim(),
    category: $("#itemCategory").value,
    meta: $("#itemDescription").value.trim(),
    price: Number($("#itemPrice").value),
    stock: Number($("#itemStocks").value),
    choices: Array.from(choiceList.querySelectorAll(".choice-input")).map((input) => input.value.trim()).filter(Boolean)
  };
  uploadProductButton.disabled = true;
  uploadProductButton.textContent = "Uploading...";
  uploadFeedback.textContent = "Saving product to Firebase...";
  try {
    await window.firebaseReady;
    const media = selectedProductMedia.map((file) => ({ name: file.name, type: file.type }));
    const thumbnail = selectedThumbnail ? { name: selectedThumbnail.name, type: selectedThumbnail.type } : null;
    const savedProduct = { ...product, media, thumbnail, badge: "အသစ်", createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    await firebase.firestore().collection("products").doc(productId).set(savedProduct);
    const cardMedia = selectedThumbnail || selectedProductMedia[0];
    const detailMediaUrls = selectedProductMedia.map((file) => ({ url: URL.createObjectURL(file), type: file.type, name: file.name }));
    if (selectedThumbnail) detailMediaUrls.unshift({ url: URL.createObjectURL(selectedThumbnail), type: selectedThumbnail.type, name: selectedThumbnail.name });
    const newProduct = { ...savedProduct, image: URL.createObjectURL(cardMedia), mediaType: cardMedia.type.startsWith("video/") ? "video" : "image", detailMediaUrls };
    products.unshift(newProduct);
    scheduleStockOutCleanup(newProduct);
    renderProducts();
    uploadFeedback.textContent = "Product uploaded successfully.";
    productUploadForm.reset();
    selectedProductMedia = [];
    clearThumbnail();
    choiceList.innerHTML = "";
    renderSelectedMedia();
  } catch (error) {
    console.error("Product upload failed:", error);
    uploadFeedback.textContent = error.code === "permission-denied"
      ? "Firebase denied this upload. Allow authenticated users to write products in Firestore rules."
      : "Upload failed. Check Firebase configuration and try again.";
  } finally {
    uploadProductButton.disabled = false;
    uploadProductButton.textContent = "Upload product";
  }
});
$("#closeProductDetail").addEventListener("click", closeProductDetail);
productDetailBackdrop.addEventListener("click", (event) => { if (event.target === productDetailBackdrop) closeProductDetail(); });
detailAddButton.addEventListener("click", () => {
  if (!activeDetailProduct) return;
  updateQuantity(activeDetailProduct.id, 1);
  closeProductDetail();
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !productDetailBackdrop.hidden) closeProductDetail(); });
async function loadSavedProducts() {
  try {
    await window.firebaseReady;
    const snapshot = await firebase.firestore().collection("products").get();
    const savedProducts = snapshot.docs.map((doc) => {
      const data = doc.data();
      const image = typeof data.image === "string" && !data.image.includes("firebasestorage.googleapis.com") ? data.image : "";
      return { ...data, id: doc.id, image };
    });
    products = [...savedProducts, ...products.filter((product) => !savedProducts.some((savedProduct) => savedProduct.id === product.id))];
    savedProducts.forEach(scheduleStockOutCleanup);
    renderProducts();
  } catch (error) {
    console.error("Could not load saved products:", error);
  }
}
renderCategories(); renderProducts(); renderCart(); setPaymentMethod("kbzpay");
loadSavedProducts();
