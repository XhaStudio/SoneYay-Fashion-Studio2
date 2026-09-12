export {};

type Category = "All" | "Trendy" | "Women" | "Men" | "Accessories" | "Shoes";
type Product = { id: number; name: string; category: Exclude<Category, "All">; meta: string; price: number; image: string; badge?: string };
type Cart = Record<number, number>;

const products: Product[] = [
  { id: 1, name: "ပုံသွင်း ဘလေဇာ", category: "Trendy", meta: "Atelier N° 8 · အနက်", price: 312000, image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85", badge: "အသစ်" },
  { id: 2, name: "လီနင်ရှည်ဝတ်စုံ", category: "Women", meta: "Lune Studio · အဖြူဖျော့", price: 201600, image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=85" },
  { id: 3, name: "အေးမြသော ရှပ်အင်္ကျီ", category: "Men", meta: "Common Ground · အစိမ်းဖျော့", price: 151200, image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85", badge: "အသစ်" },
  { id: 4, name: "သားရေပခုံးအိတ်", category: "Accessories", meta: "Forma · ကော်ဖီရောင်", price: 260400, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85" },
  { id: 5, name: "နေ့စဉ်ဝတ် ဘောင်းဘီရှည်", category: "Women", meta: "Still Life · ဒင်နင်", price: 184800, image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=85" },
  { id: 6, name: "ခေတ်ဟောင်း စနီကာ", category: "Shoes", meta: "Reebok · အဖြူဖျော့", price: 231000, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85" },
  { id: 7, name: "မီရီနိုချည် ပိုလို", category: "Men", meta: "Norse Project · ကုလားအုတ်ရောင်", price: 220500, image: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=900&q=85" },
  { id: 8, name: "ကိုယ်ထည်ပါ နေကာမျက်မှန်", category: "Accessories", meta: "Onda · အညိုရောင်", price: 113400, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85" }
];

const categories: Category[] = ["All", "Trendy", "Women", "Men", "Accessories", "Shoes"];
const categoryLabels: Record<Category, string> = { All: "အားလုံး", Trendy: "ခေတ်စား", Women: "အမျိုးသမီး", Men: "အမျိုးသား", Accessories: "အသုံးအဆောင်", Shoes: "ဖိနပ်" };
let activeCategory: Category = "All";
let searchTerm = "";
let cart: Cart = {};

const categoryTabs = document.querySelector<HTMLDivElement>("#categoryTabs")!;
const catalog = document.querySelector<HTMLElement>("#catalog")!;
const emptyState = document.querySelector<HTMLParagraphElement>("#emptyState")!;
const template = document.querySelector<HTMLTemplateElement>("#productTemplate")!;
const searchInput = document.querySelector<HTMLInputElement>("#searchInput")!;
const sortSelect = document.querySelector<HTMLSelectElement>("#sortSelect")!;
const cartDrawer = document.querySelector<HTMLElement>("#cartDrawer")!;
const drawerOverlay = document.querySelector<HTMLDivElement>("#drawerOverlay")!;
const drawerItems = document.querySelector<HTMLDivElement>("#drawerItems")!;

const money = (value: number): string => `${value.toLocaleString("en-US")} ကျပ်`;

function renderCategories(): void {
  categoryTabs.innerHTML = categories.map((category) => `<button class="category-tab ${category === activeCategory ? "active" : ""}" data-category="${category}" role="tab" aria-selected="${category === activeCategory}">${categoryLabels[category]}</button>`).join("");
}

function visibleProducts(): Product[] {
  const filtered = products.filter((product) => {
    const matchesCategory = activeCategory === "All" || product.category === activeCategory;
    const searchable = `${product.name} ${product.category} ${product.meta}`.toLowerCase();
    return matchesCategory && searchable.includes(searchTerm.toLowerCase());
  });
  return filtered.sort((first, second) => {
    if (sortSelect.value === "price-low") return first.price - second.price;
    if (sortSelect.value === "price-high") return second.price - first.price;
    return first.id - second.id;
  });
}

function renderProducts(): void {
  const items = visibleProducts();
  catalog.innerHTML = "";
  emptyState.hidden = items.length > 0;
  items.forEach((product) => {
    const card = template.content.cloneNode(true) as DocumentFragment;
    const quantity = cart[product.id] || 0;
    const image = card.querySelector<HTMLImageElement>(".product-image")!;
    image.src = product.image;
    image.alt = product.name;
    card.querySelector<HTMLElement>(".product-name")!.textContent = product.name;
    card.querySelector<HTMLElement>(".product-meta")!.textContent = product.meta;
    card.querySelector<HTMLElement>(".product-price")!.textContent = money(product.price);
    const badge = card.querySelector<HTMLElement>(".product-badge")!;
    if (product.badge) { badge.hidden = false; badge.textContent = product.badge; }
    const count = card.querySelector<HTMLElement>(".product-count")!;
    count.hidden = quantity === 0;
    count.textContent = String(quantity);
    const addButton = card.querySelector<HTMLButtonElement>(".add-button")!;
    const controls = card.querySelector<HTMLDivElement>(".quantity-controls")!;
    const quantityValue = card.querySelector<HTMLElement>(".quantity-value")!;
    if (quantity > 0) { addButton.hidden = true; controls.hidden = false; quantityValue.textContent = String(quantity); }
    addButton.addEventListener("click", () => updateQuantity(product.id, 1));
    card.querySelector(".decrease")!.addEventListener("click", () => updateQuantity(product.id, -1));
    card.querySelector(".increase")!.addEventListener("click", () => updateQuantity(product.id, 1));
    catalog.appendChild(card);
  });
}

function updateQuantity(id: number, change: number): void {
  const nextQuantity = Math.max(0, (cart[id] || 0) + change);
  if (nextQuantity === 0) delete cart[id]; else cart[id] = nextQuantity;
  renderProducts();
  renderCart();
}

function cartDetails(): { product: Product; quantity: number }[] {
  return products.filter((product) => cart[product.id]).map((product) => ({ product, quantity: cart[product.id] }));
}

function renderCart(): void {
  const details = cartDetails();
  const itemCount = details.reduce((sum, item) => sum + item.quantity, 0);
  const total = details.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  document.querySelector("#bagCount")!.textContent = String(itemCount);
  document.querySelector("#cartItemCount")!.textContent = `${itemCount} ပစ္စည်း`;
  document.querySelector("#cartTotal")!.textContent = money(total);
  document.querySelector("#drawerTotal")!.textContent = money(total);
  document.querySelector<HTMLElement>("#cartBar")!.classList.toggle("visible", itemCount > 0);
  document.querySelector<HTMLElement>("#cartBar")!.setAttribute("aria-hidden", String(itemCount === 0));
  drawerItems.innerHTML = details.length ? details.map(({ product, quantity }) => `<div class="drawer-item"><img src="${product.image}" alt="${product.name}" /><div class="drawer-item-info"><h3>${product.name}</h3><p>${product.meta}</p><strong class="drawer-item-price">${money(product.price)}</strong></div><div class="mini-quantity"><button data-id="${product.id}" data-change="-1" aria-label="${product.name} တစ်ခုလျှော့ရန်">−</button><span>${quantity}</span><button data-id="${product.id}" data-change="1" aria-label="${product.name} တစ်ခုတိုးရန်">+</button></div></div>`).join("") : `<p class="empty-state">သင့်အိတ်ထဲတွင် ပစ္စည်းမရှိသေးပါ။</p>`;
  drawerItems.querySelectorAll<HTMLButtonElement>("button[data-id]").forEach((button) => button.addEventListener("click", () => updateQuantity(Number(button.dataset.id), Number(button.dataset.change))));
}

function setDrawer(open: boolean): void {
  cartDrawer.classList.toggle("open", open);
  drawerOverlay.classList.toggle("open", open);
  cartDrawer.setAttribute("aria-hidden", String(!open));
  if (!open) showCheckoutStep();
}

type PaymentMethodId = "kbzpay" | "wavemoney";
const paymentAccounts: Record<PaymentMethodId, { label: string; number: string }> = {
  kbzpay: { label: "KBZPay", number: "09-750 123 456" },
  wavemoney: { label: "WaveMoney", number: "09-961 234 567" }
};
let selectedPaymentMethod: PaymentMethodId = "kbzpay";
let selectedScreenshot: File | null = null;

const checkoutStep = document.querySelector<HTMLDivElement>("#checkoutStep")!;
const paymentStep = document.querySelector<HTMLDivElement>("#paymentStep")!;
const checkoutButton = document.querySelector<HTMLButtonElement>("#checkoutButton")!;
const backToCartButton = document.querySelector<HTMLButtonElement>("#backToCartButton")!;
const paymentMethodButtons = document.querySelectorAll<HTMLButtonElement>(".payment-method");
const paymentAccountName = document.querySelector<HTMLElement>("#paymentAccountName")!;
const paymentAccountNumber = document.querySelector<HTMLElement>("#paymentAccountNumber")!;
const copyAccountButton = document.querySelector<HTMLButtonElement>("#copyAccountButton")!;
const dropzone = document.querySelector<HTMLLabelElement>("#dropzone")!;
const dropzoneEmpty = document.querySelector<HTMLDivElement>("#dropzoneEmpty")!;
const dropzoneFilled = document.querySelector<HTMLDivElement>("#dropzoneFilled")!;
const dropzonePreview = document.querySelector<HTMLImageElement>("#dropzonePreview")!;
const dropzoneFileName = document.querySelector<HTMLElement>("#dropzoneFileName")!;
const paymentScreenshotInput = document.querySelector<HTMLInputElement>("#paymentScreenshot")!;
const removeScreenshotButton = document.querySelector<HTMLButtonElement>("#removeScreenshotButton")!;
const submitPaymentButton = document.querySelector<HTMLButtonElement>("#submitPaymentButton")!;

function showCheckoutStep(): void { checkoutStep.hidden = false; paymentStep.hidden = true; }
function showPaymentStep(): void { checkoutStep.hidden = true; paymentStep.hidden = false; }

function setPaymentMethod(method: PaymentMethodId): void {
  selectedPaymentMethod = method;
  const account = paymentAccounts[method];
  paymentAccountName.textContent = account.label;
  paymentAccountNumber.textContent = account.number;
  paymentMethodButtons.forEach((button) => {
    const isActive = button.dataset.method === method;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function setScreenshot(file: File): void {
  if (!file.type.startsWith("image/")) return;
  selectedScreenshot = file;
  const reader = new FileReader();
  reader.onload = () => { dropzonePreview.src = String(reader.result); };
  reader.readAsDataURL(file);
  dropzoneFileName.textContent = file.name;
  dropzoneEmpty.hidden = true;
  dropzoneFilled.hidden = false;
  submitPaymentButton.disabled = false;
}

function clearScreenshot(): void {
  selectedScreenshot = null;
  paymentScreenshotInput.value = "";
  dropzoneEmpty.hidden = false;
  dropzoneFilled.hidden = true;
  submitPaymentButton.disabled = true;
}

checkoutButton.addEventListener("click", showPaymentStep);
backToCartButton.addEventListener("click", showCheckoutStep);
paymentMethodButtons.forEach((button) => button.addEventListener("click", () => setPaymentMethod(button.dataset.method as PaymentMethodId)));
copyAccountButton.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(paymentAccountNumber.textContent || ""); } catch { /* clipboard unavailable */ }
  copyAccountButton.classList.add("copied");
  copyAccountButton.textContent = "ကူးယူပြီးပါပြီ";
  setTimeout(() => { copyAccountButton.classList.remove("copied"); copyAccountButton.textContent = "ကူးယူရန်"; }, 1600);
});
paymentScreenshotInput.addEventListener("change", () => {
  if (paymentScreenshotInput.files && paymentScreenshotInput.files[0]) setScreenshot(paymentScreenshotInput.files[0]);
});
removeScreenshotButton.addEventListener("click", (event) => { event.preventDefault(); clearScreenshot(); });
dropzone.addEventListener("dragover", (event) => { event.preventDefault(); dropzone.classList.add("dragover"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
  const file = event.dataTransfer?.files?.[0];
  if (file) setScreenshot(file);
});
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); paymentScreenshotInput.click(); }
});
submitPaymentButton.addEventListener("click", () => {
  if (!selectedScreenshot) return;
  alert(`${paymentAccounts[selectedPaymentMethod].label} မှတစ်ဆင့် ငွေလွှဲပြေစာကို ပို့ပြီးပါပြီ။ Admin မှ အတည်ပြုပေးသည်အထိ ခဏစောင့်ပေးပါ။`);
  cart = {};
  renderProducts();
  renderCart();
  clearScreenshot();
  setDrawer(false);
});

categoryTabs.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category as Category;
  renderCategories();
  renderProducts();
});
searchInput.addEventListener("input", () => { searchTerm = searchInput.value; renderProducts(); });
sortSelect.addEventListener("change", renderProducts);
document.querySelector("#bagButton")!.addEventListener("click", () => setDrawer(true));
document.querySelector("#viewBag")!.addEventListener("click", () => setDrawer(true));
document.querySelector("#closeBag")!.addEventListener("click", () => setDrawer(false));
drawerOverlay.addEventListener("click", () => setDrawer(false));
document.querySelector("#searchToggle")!.addEventListener("click", () => { searchInput.focus(); searchInput.scrollIntoView({ behavior: "smooth", block: "center" }); });

renderCategories();
renderProducts();
renderCart();
