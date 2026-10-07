let products = [];
const categories = [
  "ခေတ်စား",
  "အထူးစျေးနှုန်း",
  "အင်္ကျီ",
  "ဘောင်းဘီ",
  "စကတ်",
  "ဂါဝန်",
  "1 SET",
  "ဂျင်းထည်",
  "တီရှပ်",
  "ရှပ်အင်္ကျီ",
  "စပန့်",
  "အမျိုးသမီးအင်္ကျီ",
  "အပေါ်ထပ်",
  "အတွင်းဝတ်",
  "အသုံးအဆောင်",
  "အမျိုးသားဝတ်",
  "ကချင်ထည်",
  "ပါတိတ်",
  "ဇင်းမယ်",
  "ချိတ်",
  "တမူး",
];
let activeCategory = null,
  searchTerm = "",
  cart = {};
const CART_SEP = "::";
function cartKey(id, choice) {
  return choice ? `${id}${CART_SEP}${choice}` : String(id);
}
function parseCartKey(key) {
  const index = key.indexOf(CART_SEP);
  return index === -1
    ? { id: key, choice: "" }
    : { id: key.slice(0, index), choice: key.slice(index + CART_SEP.length) };
}
function cartKeysFor(id) {
  return Object.keys(cart).filter((key) => parseCartKey(key).id === String(id));
}
function productCartQty(id) {
  return cartKeysFor(id).reduce((sum, key) => sum + cart[key], 0);
}
function removeProductFromCart(id) {
  cartKeysFor(id).forEach((key) => delete cart[key]);
}
function hasChoices(product) {
  return normalizeChoiceItems(product.choices).length > 0;
}
function choiceStockOf(product, label) {
  if (!label) return Infinity;
  const found = normalizeChoiceItems(product.choices).find(
    (choice) => choice.label === label,
  );
  if (!found) return Infinity;
  const stock = Number(found.stock);
  return Number.isFinite(stock) ? Math.max(0, stock) : Infinity;
}
const $ = (selector) => document.querySelector(selector);
const categoryTabs = $("#categoryTabs"),
  categorySlider = $("#categorySlider"),
  catalog = $("#catalog"),
  emptyState = $("#emptyState"),
  template = $("#productTemplate");
const searchInput = $("#searchInput"),
  sortSelect = $("#sortSelect"),
  cartDrawer = $("#cartDrawer"),
  drawerOverlay = $("#drawerOverlay"),
  drawerItems = $("#drawerItems");
const loadingScreen = $("#loadingScreen"),
  loadingMessage = $("#loadingMessage");
const money = (value) => `${value.toLocaleString("en-US")} ကျပ်`;
const STOCK_OUT_GRACE_MS = 4 * 60 * 60 * 1000;
const stockOutCleanupTimers = new Map();

function promotionDetails(product) {
  const promotion = product.promotion;
  if (!promotion || typeof promotion.name !== "string" || !promotion.name.trim())
    return null;
  const percent = Number(promotion.percent);
  if (!Number.isInteger(percent) || percent < 1 || percent > 99) return null;
  const rawExpiry = promotion.expiresAt;
  const expiresAt =
    rawExpiry && typeof rawExpiry.toDate === "function"
      ? rawExpiry.toDate()
      : rawExpiry instanceof Date
        ? rawExpiry
        : new Date(rawExpiry);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now())
    return null;
  return { name: promotion.name.trim(), percent, expiresAt };
}

function productPrice(product, promotion = promotionDetails(product)) {
  return promotion
    ? Math.round((Number(product.price) * (100 - promotion.percent)) / 100)
    : Number(product.price);
}

function priceBreakdownMarkup(originalPrice, discountedPrice) {
  return `<span class="price-line original-price"><span class="price-label">မူရင်းစျေး</span><span class="price-value">${money(originalPrice)}</span></span><span class="price-line discounted-price"><span class="price-label">လျှော့စျေး</span><span class="price-value">${money(discountedPrice)}</span></span>`;
}

function showLoading(message) {
  loadingMessage.textContent = message;
  loadingScreen.classList.remove("is-hidden");
}
function hideLoading() {
  loadingScreen.classList.add("is-hidden");
}
function preloadProductImages(productList) {
  const imageUrls = productList
    .flatMap((product) => [
      product.image,
      ...(Array.isArray(product.detailMediaUrls)
        ? product.detailMediaUrls.map((media) => media.url)
        : []),
    ])
    .filter(
      (url, index, urls) =>
        typeof url === "string" && url && urls.indexOf(url) === index,
    );
  return Promise.all(
    imageUrls.map(
      (url) =>
        new Promise((resolve) => {
          const image = new Image();
          image.onload = resolve;
          image.onerror = resolve;
          image.src = url;
        }),
    ),
  );
}
function hasStock(product) {
  if (!Object.prototype.hasOwnProperty.call(product, "stock")) return true;
  return (
    product.stock !== null &&
    String(product.stock).trim() !== "" &&
    Number(product.stock) > 0
  );
}
function isStockOut(product) {
  return (
    Object.prototype.hasOwnProperty.call(product, "stock") && !hasStock(product)
  );
}
function renderCategories() {
  categoryTabs.innerHTML = [
    `<button class="category-tab ${activeCategory ? "" : "active"}" data-category="" role="tab" aria-selected="${!activeCategory}">All</button>`,
    ...categories.map(
      (category) =>
        `<button class="category-tab ${category === activeCategory ? "active" : ""}" data-category="${category}" role="tab" aria-selected="${category === activeCategory}">${category}</button>`,
    ),
  ].join("");
}
function visibleProducts() {
  return products
    .filter(
      (product) =>
        (!activeCategory || product.category === activeCategory) &&
        `${product.name} ${product.category} ${product.meta}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    )
    .sort((first, second) => {
      const firstHasPromotion = promotionDetails(first) !== null;
      const secondHasPromotion = promotionDetails(second) !== null;
      if (firstHasPromotion !== secondHasPromotion)
        return firstHasPromotion ? -1 : 1;
      if (sortSelect.value === "price-low")
        return productPrice(first) - productPrice(second);
      if (sortSelect.value === "price-high")
        return productPrice(second) - productPrice(first);
      return 0;
    });
}
function renderProducts() {
  const items = visibleProducts();
  catalog.innerHTML = "";
  emptyState.hidden = items.length > 0;
  items.forEach((product) => {
    const card = template.content.cloneNode(true),
      quantity = productCartQty(product.id);
    const image = card.querySelector(".product-image");
    const video = card.querySelector(".product-video");
    if (product.mediaType === "video" && product.image) {
      image.hidden = true;
      video.hidden = false;
      video.src = product.image;
    } else if (product.image) {
      image.src = product.image;
      image.alt = product.name;
    } else {
      image.hidden = true;
      video.hidden = true;
    }
    card.querySelector(".product-name").textContent = product.name;
    card.querySelector(".product-meta").textContent = product.meta;
    const promotion = promotionDetails(product);
    const productCard = card.querySelector(".product-card");
    productCard.classList.toggle("is-discounted", Boolean(promotion));
    const promotionName = card.querySelector(".product-promotion-name");
    promotionName.hidden = !promotion;
    if (promotion) {
      promotionName.innerHTML =
        '<i class="fa-solid fa-tag" aria-hidden="true"></i>';
      promotionName.append(document.createTextNode(promotion.name));
    }
    const productPriceElement = card.querySelector(".product-price");
    const discountedPrice = productPrice(product, promotion);
    if (promotion) {
      card.querySelector(".product-details").classList.add("has-discount");
      productPriceElement.classList.add("has-discount");
      productPriceElement.innerHTML = priceBreakdownMarkup(
        product.price,
        discountedPrice,
      );
    } else {
      card.querySelector(".product-details").classList.remove("has-discount");
      productPriceElement.classList.remove("has-discount");
      productPriceElement.textContent = money(product.price);
    }
    card.querySelector(".product-stock").textContent = Number.isFinite(
      Number(product.stock),
    )
      ? `လက်ကျန်: ${Math.max(0, Number(product.stock) - quantity)}`
      : "";
    const badge = card.querySelector(".product-badge");
    if (promotion) {
      badge.hidden = false;
      badge.classList.add("discount-tag");
      badge.innerHTML = `<i class="fa-solid fa-tag" aria-hidden="true"></i><span>-${promotion.percent}%</span>`;
      badge.setAttribute(
        "aria-label",
        `${promotion.name}: ${promotion.percent}% လျှော့စျေး`,
      );
    } else if (product.badge) {
      badge.hidden = false;
      badge.classList.remove("discount-tag");
      badge.textContent = product.badge;
      badge.removeAttribute("aria-label");
    }
    const count = card.querySelector(".product-count");
    count.hidden = quantity === 0;
    count.textContent = String(quantity);
    const addButton = card.querySelector(".add-button"),
      controls = card.querySelector(".quantity-controls"),
      quantityValue = card.querySelector(".quantity-value");
    const availableStock = Number.isFinite(Number(product.stock))
      ? Math.max(0, Number(product.stock))
      : Infinity;
    const stockOut = !hasStock(product) || availableStock <= quantity;
    addButton.disabled = stockOut;
    if (stockOut) addButton.textContent = "လက်ကျန်မရှိပါ";
    if (quantity > 0) {
      addButton.hidden = true;
      controls.hidden = false;
      quantityValue.textContent = String(quantity);
    }
    card.querySelector(".product-card").addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      openProductDetail(product);
    });
    const addFromCard = () => {
      if (hasChoices(product)) {
        openProductDetail(product);
        return;
      }
      updateQuantity(product.id, 1);
    };
    addButton.addEventListener("click", addFromCard);
    card.querySelector(".decrease").addEventListener("click", () => {
      const keys = cartKeysFor(product.id);
      if (keys.length === 0) return;
      const { choice } = parseCartKey(keys[keys.length - 1]);
      updateQuantity(product.id, -1, choice);
    });
    card.querySelector(".increase").addEventListener("click", addFromCard);
    catalog.appendChild(card);
  });
}
async function updateQuantity(id, change, choice = "") {
  const key = cartKey(id, choice);
  const product = products.find((item) => String(item.id) === String(id));
  if (!product) {
    if (change > 0) notify("လက်ကျန်မရှိပါ။");
    return;
  }

  // Respond to the tap immediately using what we already know locally —
  // don't make the button wait on a Firestore round-trip before the UI moves.
  const previousQuantity = cart[key] || 0;
  const otherQuantity = productCartQty(product.id) - previousQuantity;
  const localAvailableStock = Math.min(
    Number.isFinite(Number(product.stock))
      ? Math.max(0, Number(product.stock) - otherQuantity)
      : Infinity,
    choiceStockOf(product, choice),
  );
  const requestedQuantity = Math.max(0, previousQuantity + change);
  if (change > 0 && requestedQuantity > localAvailableStock) {
    notify("ဒီပစ္စည်း၏ လက်ကျန်မလုံလောက်တော့ပါ။");
    renderProducts();
    return;
  }
  const optimisticQuantity = Math.min(localAvailableStock, requestedQuantity);
  if (optimisticQuantity === 0) delete cart[key];
  else cart[key] = optimisticQuantity;
  renderProducts();
  renderCart();

  // Only additions need re-verifying against live stock, and that check now
  // runs in the background after the click has already been reflected on screen.
  if (change <= 0 || typeof product.id !== "string") return;
  try {
    await window.firebaseReady;
    const snapshot = await firebase
      .firestore()
      .collection("products")
      .doc(product.id)
      .get();
    if (!snapshot.exists) {
      notify("ဤပစ္စည်း မရှိတော့ပါ။");
      if (previousQuantity === 0) delete cart[key];
      else cart[key] = previousQuantity;
      renderProducts();
      renderCart();
      return;
    }
    const currentStock = Number(snapshot.data().stock);
    product.stock = Number.isFinite(currentStock)
      ? Math.max(0, currentStock)
      : null;
    const liveAvailableStock = Math.min(
      Number.isFinite(Number(product.stock))
        ? Math.max(0, Number(product.stock) - otherQuantity)
        : Infinity,
      choiceStockOf(product, choice),
    );
    if (!hasStock(product) || liveAvailableStock < optimisticQuantity) {
      notify("လက်ကျန်ပမာဏ ပြောင်းလဲသွားသဖြင့် ပမာဏကို ချိန်ညှိလိုက်ပါသည်။");
      const correctedQuantity = Math.min(
        liveAvailableStock,
        optimisticQuantity,
      );
      if (correctedQuantity === 0) delete cart[key];
      else cart[key] = correctedQuantity;
      renderProducts();
      renderCart();
    } else {
      renderProducts(); // refresh the displayed remaining-stock count silently
    }
  } catch (error) {
    console.error("Could not check current stock:", error);
    // Keep the optimistic quantity rather than reverting on a network hiccup —
    // checkout re-verifies stock in a transaction (decreasePurchasedStock) anyway.
    notify("လက်ကျန်ကို ခဏတာ စစ်ဆေး၍မရပါ။ မှာယူချိန်တွင် ထပ်စစ်ဆေးပေးပါမည်။");
  }
}
function cartDetails() {
  return Object.keys(cart)
    .map((key) => {
      const { id, choice } = parseCartKey(key);
      const product = products.find((item) => String(item.id) === id);
      return product
        ? { product, choice, key, quantity: cart[key] }
        : null;
    })
    .filter((line) => line && line.quantity > 0);
}
function renderCart() {
  const details = cartDetails(),
    itemCount = details.reduce((sum, item) => sum + item.quantity, 0),
    total = details.reduce(
      (sum, item) => sum + productPrice(item.product) * item.quantity,
      0,
    );
  $("#bagCount").textContent = String(itemCount);
  $("#cartItemCount").textContent = `${itemCount} ပစ္စည်း`;
  $("#cartTotal").textContent = money(total);
  $("#drawerTotal").textContent = money(total);
  $("#cartBar").classList.toggle("visible", itemCount > 0);
  $("#cartBar").setAttribute("aria-hidden", String(itemCount === 0));
  drawerItems.innerHTML = details.length
    ? details
        .map(
          ({ product, choice, key, quantity }) => {
            const promotion = promotionDetails(product);
            const currentPrice = productPrice(product, promotion);
            const priceMarkup = promotion
              ? priceBreakdownMarkup(product.price, currentPrice)
              : money(currentPrice);
            return `<div class="drawer-item"><img src="${product.image}" alt="${product.name}" /><div class="drawer-item-info"><h3>${product.name}</h3>${choice ? `<p><b>${choice}</b></p>` : ""}<p>${product.meta}</p><strong class="drawer-item-price">${priceMarkup}</strong></div><div class="mini-quantity"><button data-key="${key}" data-change="-1" aria-label="${product.name} တစ်ခုလျှော့ရန်">−</button><span>${quantity}</span><button data-key="${key}" data-change="1" aria-label="${product.name} တစ်ခုတိုးရန်">+</button></div></div>`;
          },
        )
        .join("")
    : `<p class="empty-state">သင့်အိတ်ထဲတွင် ပစ္စည်းမရှိသေးပါ။</p>`;
  drawerItems
    .querySelectorAll("button[data-key]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const { id, choice } = parseCartKey(button.dataset.key);
        updateQuantity(id, Number(button.dataset.change), choice);
      }),
    );
}
function setDrawer(open) {
  cartDrawer.classList.toggle("open", open);
  drawerOverlay.classList.toggle("open", open);
  cartDrawer.setAttribute("aria-hidden", String(!open));
  if (!open) showCheckoutStep();
}

const tg =
  window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tg) {
  tg.ready();
  tg.expand();
}

// Bot server's public HTTPS URL, now hosted on Render.
// Browsers block http:// calls from this https:// page, so this must stay https://.
const API_BASE_URL = "https://soneyay-fashion-studio3-cix5.onrender.com";

function notify(msg) {
  console.log("[notify]", msg);
  try {
    if (tg && tg.showAlert) {
      tg.showAlert(msg);
      return;
    }
  } catch (err) {
    console.error("showAlert failed:", err);
  }
  try {
    alert(msg);
  } catch (err) {
    console.error("alert failed:", err);
  }
}

function isNetworkError(err) {
  return (
    !navigator.onLine ||
    (err instanceof Error &&
      (err.name === "AbortError" ||
        err instanceof TypeError ||
        ["unavailable", "deadline-exceeded"].includes(err.code)))
  );
}

function telegramUser() {
  const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  return user
    ? {
        id: user.id,
        username: user.username || user.first_name || String(user.id),
      }
    : null;
}

const paymentAccounts = {
  kbzpay: { label: "KBZPay", number: "09-750 123 456" },
  wavemoney: { label: "WaveMoney", number: "09-961 234 567" },
};
const paymentCodes = {
  kbzpay: "KBZPay",
  wavemoney: "WavePay",
  mmqr: "MMQR",
  cod: "COD",
};
let selectedPaymentMethod = "kbzpay";
let selectedScreenshot = null;

const custNameInput = $("#custName"),
  custPhoneInput = $("#custPhone"),
  custAddressInput = $("#custAddress");
const checkoutStep = $("#checkoutStep"),
  paymentStep = $("#paymentStep"),
  checkoutButton = $("#checkoutButton"),
  backToCartButton = $("#backToCartButton");
const paymentMethodButtons = document.querySelectorAll(".payment-method");
const paymentAccount = $("#paymentAccount"),
  paymentAccountName = $("#paymentAccountName"),
  paymentAccountNumber = $("#paymentAccountNumber"),
  copyAccountButton = $("#copyAccountButton");
const paymentQr = $("#paymentQr");
const codNote = $("#codNote");
const dropzone = $("#dropzone"),
  dropzoneEmpty = $("#dropzoneEmpty"),
  dropzoneFilled = $("#dropzoneFilled"),
  dropzonePreview = $("#dropzonePreview"),
  dropzoneFileName = $("#dropzoneFileName");
const paymentScreenshotInput = $("#paymentScreenshot"),
  removeScreenshotButton = $("#removeScreenshotButton"),
  submitPaymentButton = $("#submitPaymentButton");
const orderSuccess = $("#orderSuccess"),
  successSub = $("#successSub"),
  successOkButton = $("#successOkButton");

function showCheckoutStep() {
  checkoutStep.hidden = false;
  paymentStep.hidden = true;
}
function showPaymentStep() {
  checkoutStep.hidden = true;
  paymentStep.hidden = false;
}

function setPaymentMethod(method) {
  selectedPaymentMethod = method;
  const isCod = method === "cod";
  const isMmqr = method === "mmqr";

  // COD needs no payment proof; MMQR uses the displayed QR instead of account details.
  paymentAccount.hidden = isCod || isMmqr;
  paymentQr.hidden = !isMmqr;
  dropzone.hidden = isCod;
  codNote.hidden = !isCod;
  submitPaymentButton.textContent = isCod
    ? "မှာယူမှု အတည်ပြုပါ"
    : "ငွေလွှဲပြေစာ ပို့ရန်";
  submitPaymentButton.disabled = isCod ? false : !selectedScreenshot;

  if (!isCod && !isMmqr) {
    const account = paymentAccounts[method];
    paymentAccountName.textContent = account.label;
    paymentAccountNumber.textContent = account.number;
  }

  paymentMethodButtons.forEach((button) => {
    const isActive = button.dataset.method === method;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function setScreenshot(file) {
  if (!file || !file.type.startsWith("image/")) return;
  selectedScreenshot = file;
  const reader = new FileReader();
  reader.onload = () => {
    dropzonePreview.src = String(reader.result);
  };
  reader.readAsDataURL(file);
  dropzoneFileName.textContent = file.name;
  dropzoneEmpty.hidden = true;
  dropzoneFilled.hidden = false;
  submitPaymentButton.disabled = false;
}

function clearScreenshot() {
  selectedScreenshot = null;
  paymentScreenshotInput.value = "";
  dropzoneEmpty.hidden = false;
  dropzoneFilled.hidden = true;
  submitPaymentButton.disabled = true;
}

checkoutButton.addEventListener("click", () => {
  if (
    !custNameInput.value.trim() ||
    !custPhoneInput.value.trim() ||
    !custAddressInput.value.trim()
  ) {
    notify("ကျေးဇူးပြု၍ အမည်၊ ဖုန်းနံပါတ်နှင့် လိပ်စာ ဖြည့်ပေးပါ။");
    return;
  }
  showPaymentStep();
});
backToCartButton.addEventListener("click", showCheckoutStep);
paymentMethodButtons.forEach((button) =>
  button.addEventListener("click", () =>
    setPaymentMethod(button.dataset.method),
  ),
);
copyAccountButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(paymentAccountNumber.textContent || "");
  } catch {
    /* clipboard unavailable */
  }
  copyAccountButton.classList.add("copied");
  copyAccountButton.textContent = "ကူးယူပြီးပါပြီ";
  setTimeout(() => {
    copyAccountButton.classList.remove("copied");
    copyAccountButton.textContent = "ကူးယူရန်";
  }, 1600);
});
paymentScreenshotInput.addEventListener("change", () => {
  if (paymentScreenshotInput.files && paymentScreenshotInput.files[0])
    setScreenshot(paymentScreenshotInput.files[0]);
});
removeScreenshotButton.addEventListener("click", (event) => {
  event.preventDefault();
  clearScreenshot();
});
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragover");
});
dropzone.addEventListener("dragleave", () =>
  dropzone.classList.remove("dragover"),
);
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
  const file =
    event.dataTransfer &&
    event.dataTransfer.files &&
    event.dataTransfer.files[0];
  if (file) setScreenshot(file);
});
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    paymentScreenshotInput.click();
  }
});
function buildOrder() {
  return {
    type: "order",
    items: cartDetails().map(({ product, choice, quantity }) => {
      const promotion = promotionDetails(product);
      return {
        productId: String(product.id),
        name: product.name,
        meta: product.meta || "",
        choice,
        quantity,
        price: productPrice(product, promotion),
        ...(promotion
          ? {
              originalPrice: Number(product.price),
              discountPercent: promotion.percent,
              promotionName: promotion.name,
            }
          : {}),
      };
    }),
    total: cartDetails().reduce(
      (sum, { product, quantity }) =>
        sum + productPrice(product) * quantity,
      0,
    ),
    payment: paymentCodes[selectedPaymentMethod],
    customer: {
      name: custNameInput.value.trim(),
      phone: custPhoneInput.value.trim(),
      address: custAddressInput.value.trim(),
    },
  };
}

// The backend can be a Render free-tier instance that sleeps when idle, so
// the first request after a while can be slow to wake up and sometimes
// drops the connection before a response comes back (browsers surface this
// as a generic "Failed to fetch", even though the backend may finish the
// request anyway). fetchWithRetry retries a couple of times on that kind of
// network-level failure instead of immediately telling the customer it failed.
function fetchWithRetry(url, options, attempts = 3, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      fetch(url, { ...options, signal: controller.signal })
        .then((response) => {
          clearTimeout(timer);
          resolve(response);
        })
        .catch((err) => {
          clearTimeout(timer);
          if (remaining > 1) {
            setTimeout(() => attempt(remaining - 1), 1500);
          } else {
            reject(err);
          }
        });
    };
    attempt(attempts);
  });
}

// Fire-and-forget ping as soon as the app opens, so a sleeping backend has
// a head start waking up before the customer even reaches checkout.
fetch(`${API_BASE_URL}/`, { method: "GET" }).catch(() => {});

function resetCartAndForm() {
  cart = {};
  renderProducts();
  renderCart();
  clearScreenshot();
  setPaymentMethod("kbzpay");
  custNameInput.value = "";
  custPhoneInput.value = "";
  custAddressInput.value = "";
}

function showOrderSuccess(message) {
  successSub.textContent = message;
  orderSuccess.hidden = false;
  orderSuccess.setAttribute("aria-hidden", "false");
  successOkButton.focus();
}

successOkButton.addEventListener("click", () => {
  orderSuccess.hidden = true;
  orderSuccess.setAttribute("aria-hidden", "true");
  resetCartAndForm();
  showCheckoutStep();
  setDrawer(false);
  $("#bagButton").focus();
});

function timestampMillis(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return null;
}

function stockOutTimestamp(product) {
  return timestampMillis(product.stockOutAt);
}

function stockOutExpiry(product) {
  const deleteAt = timestampMillis(product.deleteAt);
  if (deleteAt) return deleteAt;
  const stockOutAt = stockOutTimestamp(product);
  return stockOutAt ? stockOutAt + STOCK_OUT_GRACE_MS : null;
}

async function removeStockOutProduct(product) {
  if (typeof product.id !== "string") return;
  await window.firebaseReady;
  const firestore = firebase.firestore();
  const productRef = firestore.collection("products").doc(product.id);
  const shouldRemove = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(productRef);
    if (!snapshot.exists) return true;
    const currentProduct = snapshot.data() || {};
    const expiresAt = stockOutExpiry(currentProduct);
    if (!isStockOut(currentProduct) || !expiresAt || expiresAt > Date.now())
      return false;
    transaction.delete(productRef);
    return true;
  });
  if (!shouldRemove) return;

  if (stockOutCleanupTimers.has(product.id)) {
    clearTimeout(stockOutCleanupTimers.get(product.id));
    stockOutCleanupTimers.delete(product.id);
  }
  products = products.filter((item) => item.id !== product.id);
  removeProductFromCart(product.id);
  if (activeEditingProduct?.id === product.id) discardProductEditor();
  renderProducts();
  renderCart();
  renderProductDeleteOptions();
  renderProductEditList();
}

function scheduleStockOutCleanup(product) {
  if (!isStockOut(product) || typeof product.id !== "string") return;
  const stockOutAt = stockOutTimestamp(product);
  const expiresAt =
    stockOutExpiry(product) || Date.now() + STOCK_OUT_GRACE_MS;
  if (!stockOutAt || !timestampMillis(product.deleteAt)) {
    const update = {
      deleteAt: firebase.firestore.Timestamp.fromMillis(expiresAt),
    };
    if (!stockOutAt) {
      update.stockOutAt = firebase.firestore.FieldValue.serverTimestamp();
      product.stockOutAt = new Date();
    }
    product.deleteAt = new Date(expiresAt);
    firebase
      .firestore()
      .collection("products")
      .doc(product.id)
      .update(update)
      .catch((error) =>
        console.error("Could not save stock-out expiry:", error),
      );
  }
  if (stockOutCleanupTimers.has(product.id))
    clearTimeout(stockOutCleanupTimers.get(product.id));
  const remaining = Math.max(0, expiresAt - Date.now());
  if (remaining === 0)
    removeStockOutProduct(product).catch((error) =>
      console.error("Could not remove stock-out product:", error),
    );
  else {
    const timer = setTimeout(() => {
      stockOutCleanupTimers.delete(product.id);
      removeStockOutProduct(product).catch((error) =>
        console.error("Could not remove stock-out product:", error),
      );
    }, remaining);
    stockOutCleanupTimers.set(product.id, timer);
  }
}

async function decreasePurchasedStock(details) {
  await window.firebaseReady;
  const firestore = firebase.firestore();
  await Promise.all(
    details
      .filter(({ product }) => typeof product.id === "string")
      .map(({ product, choice, quantity }) => {
        const productRef = firestore.collection("products").doc(product.id);
        return firestore.runTransaction(async (transaction) => {
          const snapshot = await transaction.get(productRef);
          if (!snapshot.exists) return;
          const currentStock = Number(snapshot.data().stock);
          if (!Number.isFinite(currentStock) || currentStock < quantity)
            throw new Error(`${product.name} stock is no longer available`);
          const nextStock = currentStock - quantity;
          const storedChoices = snapshot.data().choices;
          const choiceUpdate =
            choice && Array.isArray(storedChoices)
              ? {
                  choices: storedChoices.map((item) =>
                    item && typeof item === "object" && item.label === choice
                      ? {
                          ...item,
                          stock: Math.max(0, Number(item.stock || 0) - quantity),
                        }
                      : item,
                  ),
                }
              : {};
          transaction.update(productRef, {
            ...choiceUpdate,
            stock: nextStock,
            ...(nextStock <= 0
              ? {
                  stockOutAt: firebase.firestore.FieldValue.serverTimestamp(),
                  deleteAt: firebase.firestore.Timestamp.fromMillis(
                    Date.now() + STOCK_OUT_GRACE_MS,
                  ),
                }
              : {
                  stockOutAt: firebase.firestore.FieldValue.delete(),
                  deleteAt: firebase.firestore.FieldValue.delete(),
                }),
          });
        });
      }),
  );
  details.forEach(({ product, choice, quantity }) => {
    if (choice && Array.isArray(product.choices)) {
      product.choices = product.choices.map((item) =>
        item && typeof item === "object" && item.label === choice
          ? { ...item, stock: Math.max(0, Number(item.stock || 0) - quantity) }
          : item,
      );
    }
    if (Number.isFinite(Number(product.stock))) {
      product.stock = Math.max(0, Number(product.stock) - quantity);
      if (product.stock === 0) {
        product.stockOutAt = new Date();
        product.deleteAt = new Date(Date.now() + STOCK_OUT_GRACE_MS);
        scheduleStockOutCleanup(product);
      }
    }
  });
}

submitPaymentButton.addEventListener("click", async () => {
  if (Object.keys(cart).length === 0) return;
  if (selectedPaymentMethod !== "cod" && !selectedScreenshot) return;

  const user = telegramUser();
  if (!user) {
    notify(
      "Telegram App ထဲမှသာ မှာယူ၍ရပါမည်။ Telegram ထဲတွင် ဤဆိုင်ကို ပြန်ဖွင့်ပေးပါ။",
    );
    return;
  }

  const order = buildOrder();
  const formData = new FormData();
  formData.append("order", JSON.stringify(order));
  formData.append("telegram_user_id", String(user.id));
  formData.append("username", user.username);
  // Stable per-checkout-attempt id: if the request below has to be retried
  // (see fetchWithRetry), the backend can recognize repeats of this exact
  // attempt and avoid creating a duplicate order / duplicate admin message.
  const clientOrderId =
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : `${user.id}-${Date.now()}-${Math.random()}`;
  formData.append("client_order_id", clientOrderId);
  if (selectedScreenshot)
    formData.append("photo", selectedScreenshot, selectedScreenshot.name);

  submitPaymentButton.disabled = true;
  submitPaymentButton.classList.add("is-loading");
  submitPaymentButton.textContent = "ပို့နေသည်...";

  try {
    const purchasedDetails = cartDetails();
    const response = await fetchWithRetry(`${API_BASE_URL}/api/order`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) {
      throw new Error((result && result.error) || `HTTP ${response.status}`);
    }
    await decreasePurchasedStock(purchasedDetails);

    const message =
      selectedPaymentMethod === "cod"
        ? "Please pay when your order arrives."
        : "Please wait for the administrator to approve.";
    showOrderSuccess(message);
  } catch (err) {
    console.error(err);
    notify(
      err.message.includes("stock is no longer available")
        ? "လက်ကျန် ပြောင်းလဲသွားပါပြီ။ ပစ္စည်းအရေအတွက်ကို ပြန်စစ်ပြီး ထပ်မှာယူပါ။"
        : isNetworkError(err)
          ? "Please check your internet!!"
          : "မှာယူမှု ပို့၍မရပါ။ ထပ်မံကြိုးစားပါ။",
    );
  } finally {
    submitPaymentButton.disabled = false;
    submitPaymentButton.classList.remove("is-loading");
    submitPaymentButton.textContent = "ငွေလွှဲပြေစာ ပို့ရန်";
  }
});
categoryTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  if (!button.dataset.category) {
    activeCategory = null;
    renderCategories();
    renderProducts();
    return;
  }
  activeCategory =
    activeCategory === button.dataset.category ? null : button.dataset.category;
  renderCategories();
  renderProducts();
});
function syncCategorySlider() {
  const maxScroll = categoryTabs.scrollWidth - categoryTabs.clientWidth;
  categorySlider.value =
    maxScroll > 0
      ? String(Math.round((categoryTabs.scrollLeft / maxScroll) * 1000))
      : "0";
}
categorySlider.addEventListener("input", () => {
  const maxScroll = categoryTabs.scrollWidth - categoryTabs.clientWidth;
  categoryTabs.scrollLeft = (Number(categorySlider.value) / 1000) * maxScroll;
});
categoryTabs.addEventListener("scroll", syncCategorySlider, { passive: true });
window.addEventListener("resize", syncCategorySlider);
searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value;
  renderProducts();
});
sortSelect.addEventListener("change", renderProducts);
$("#bagButton").addEventListener("click", () => setDrawer(true));
$("#viewBag").addEventListener("click", () => setDrawer(true));
$("#closeBag").addEventListener("click", () => setDrawer(false));
drawerOverlay.addEventListener("click", () => setDrawer(false));
$("#searchToggle").addEventListener("click", () => {
  searchInput.focus();
  searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
});

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
const showProductDelete = $("#showProductDelete");
const showProductEdit = $("#showProductEdit");
const productEditPanel = $("#productEditPanel");
const productEditList = $("#productEditList");
const productEditForm = $("#productEditForm");
const editItemName = $("#editItemName");
const editItemDescription = $("#editItemDescription");
const editItemCategory = $("#editItemCategory");
const editThumbnailBox = $("#editThumbnailBox");
const editThumbnailInput = $("#editThumbnailInput");
const editDetailMediaElement = $("#editDetailMedia");
const editDetailPhotoInput = $("#editDetailPhotoInput");
const editChoiceList = $("#editChoiceList");
const addEditChoiceButton = $("#addEditChoiceButton");
const editTotalStock = $("#editTotalStock");
const editPromotionSection = $("#editPromotionSection");
const editPromotionName = $("#editPromotionName");
const editPromotionPercent = $("#editPromotionPercent");
const editPromotionExpiry = $("#editPromotionExpiry");
const productEditFeedback = $("#productEditFeedback");
const saveProductEdit = $("#saveProductEdit");
const discardProductEdit = $("#discardProductEdit");
const productDeletePanel = $("#productDeletePanel");
const productDeleteList = $("#productDeleteList");
const selectAllProducts = $("#selectAllProducts");
const deleteSelectedProduct = $("#deleteSelectedProduct");
const productDeleteFeedback = $("#productDeleteFeedback");
const deleteConfirmBackdrop = $("#deleteConfirmBackdrop");
const deleteConfirmMessage = $("#deleteConfirmMessage");
const deleteConfirmList = $("#deleteConfirmList");
const cancelProductDelete = $("#cancelProductDelete");
const confirmProductDelete = $("#confirmProductDelete");
const productUploadForm = $("#productUploadForm");
const discountEnabled = $("#discountEnabled");
const discountFields = $("#discountFields");
const promotionNameInput = $("#promotionName");
const promotionPercentInput = $("#promotionPercent");
const promotionExpiryInput = $("#promotionExpiry");
const uploadProductButton = productUploadForm.querySelector(
  ".upload-product-button",
);
const productDetailBackdrop = $("#productDetailBackdrop");
const detailGallery = $("#detailGallery");
const detailProductCategory = $("#detailProductCategory");
const detailProductName = $("#detailProductName");
const detailProductPrice = $("#detailProductPrice");
const detailProductDescription = $("#detailProductDescription");
const detailPromotion = $("#detailPromotion");
const detailChoices = $("#detailChoices");
const detailChoiceHint = $("#detailChoiceHint");
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
let activeEditingProduct = null;
let activeEditThumbnailFile = null;
let activeEditThumbnailPreviewUrl = null;
let editDetailMedia = [];
let editPreviewUrls = [];
let pendingEditDetailIndex = -1;
let pendingProductDeletes = [];

function openAdminDialog() {
  adminDialogBackdrop.hidden = false;
  adminFeedback.textContent = "";
  adminUsername.value = "";
  adminUsername.focus();
}

function closeAdminDialog() {
  adminDialogBackdrop.hidden = true;
}

function showControlPanel() {
  controlPanel.hidden = false;
  renderProductDeleteOptions();
  renderProductEditList();
  controlPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderProductDeleteOptions() {
  const selectedIds = new Set(
    Array.from(
      productDeleteList.querySelectorAll(
        'input[type="checkbox"]:checked',
      ),
    ).map((checkbox) => checkbox.value),
  );
  productDeleteList.replaceChildren();
  const deletableProducts = products.filter(
    (product) => typeof product.id === "string",
  );
  deletableProducts.forEach((product) => {
    const label = document.createElement("label");
    label.className = "product-delete-item";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = product.id;
    checkbox.checked = selectedIds.has(product.id);
    const details = document.createElement("span");
    details.className = "product-delete-item-details";
    const name = document.createElement("strong");
    name.textContent = product.name || "အမည်မရှိသောပစ္စည်း";
    const meta = document.createElement("small");
    meta.textContent = [product.category, money(product.price)]
      .filter(Boolean)
      .join(" · ");
    details.append(name, meta);
    label.append(checkbox, details);
    productDeleteList.appendChild(label);
  });
  syncProductDeleteSelection();
  productDeleteFeedback.textContent =
    deletableProducts.length === 0 ? "ဖျက်ရန်ပစ္စည်း မရှိပါ။" : "";
}

function revokeEditPreviewUrls() {
  editPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  editPreviewUrls = [];
  activeEditThumbnailPreviewUrl = null;
  editDetailMedia.forEach((media) => {
    media.previewUrl = null;
  });
}

function editMediaPreviewUrl(media) {
  if (media.file) {
    if (!media.previewUrl) {
      media.previewUrl = URL.createObjectURL(media.file);
      editPreviewUrls.push(media.previewUrl);
    }
    return media.previewUrl;
  }
  return media.url || "";
}

function renderProductEditList() {
  productEditList.replaceChildren();
  if (products.length === 0) {
    const empty = document.createElement("p");
    empty.className = "product-edit-empty";
    empty.textContent = "ပြင်ဆင်ရန် ပစ္စည်းမရှိပါ။";
    productEditList.appendChild(empty);
    return;
  }

  products.forEach((product) => {
    const button = document.createElement("button");
    button.className = "product-edit-item";
    button.type = "button";
    button.disabled = typeof product.id !== "string";
    const name = document.createElement("strong");
    name.textContent = product.name || "အမည်မရှိသောပစ္စည်း";
    const details = document.createElement("small");
    details.textContent = [product.category, money(Number(product.price) || 0)]
      .filter(Boolean)
      .join(" · ");
    button.append(name, details);
    button.addEventListener("click", () => openProductEditor(product));
    productEditList.appendChild(button);
  });
}

function renderEditThumbnail() {
  if (activeEditThumbnailPreviewUrl) {
    URL.revokeObjectURL(activeEditThumbnailPreviewUrl);
    editPreviewUrls = editPreviewUrls.filter(
      (url) => url !== activeEditThumbnailPreviewUrl,
    );
    activeEditThumbnailPreviewUrl = null;
  }
  editThumbnailBox.replaceChildren();
  if (activeEditThumbnailFile) {
    activeEditThumbnailPreviewUrl = URL.createObjectURL(
      activeEditThumbnailFile,
    );
    editPreviewUrls.push(activeEditThumbnailPreviewUrl);
    const image = document.createElement("img");
    image.src = activeEditThumbnailPreviewUrl;
    image.alt = "အဓိကပုံ အစမ်းကြည့်ရန်";
    editThumbnailBox.appendChild(image);
  } else if (activeEditingProduct && activeEditingProduct.image) {
    const mediaType = activeEditingProduct.mediaType || "image/jpeg";
    const preview =
      mediaType === "video"
        ? document.createElement("video")
        : document.createElement("img");
    preview.src = activeEditingProduct.image;
    preview.alt = "အဓိကပုံ";
    if (preview instanceof HTMLVideoElement) {
      preview.controls = true;
      preview.muted = true;
      preview.playsInline = true;
    }
    editThumbnailBox.appendChild(preview);
  } else {
    const empty = document.createElement("span");
    empty.textContent = "အဓိကပုံ မရှိပါ";
    editThumbnailBox.appendChild(empty);
  }

  const replaceButton = document.createElement("button");
  replaceButton.className = "edit-media-button";
  replaceButton.type = "button";
  replaceButton.textContent = "Replace";
  replaceButton.addEventListener("click", () => editThumbnailInput.click());
  editThumbnailBox.appendChild(replaceButton);
}

function renderEditDetailMedia() {
  editDetailMediaElement.replaceChildren();
  if (editDetailMedia.length === 0) {
    const empty = document.createElement("p");
    empty.className = "product-edit-empty";
    empty.textContent = "Detail Photos မရှိပါ။";
    editDetailMediaElement.appendChild(empty);
    return;
  }

  editDetailMedia.forEach((media, index) => {
    const item = document.createElement("div");
    item.className = "edit-detail-media-item";
    const image = document.createElement("img");
    image.src = editMediaPreviewUrl(media);
    image.alt = media.name || `Detail photo ${index + 1}`;
    const name = document.createElement("small");
    name.textContent = media.name || `Detail photo ${index + 1}`;
    const actions = document.createElement("div");
    actions.className = "edit-detail-media-actions";
    const replaceButton = document.createElement("button");
    replaceButton.className = "edit-media-button";
    replaceButton.type = "button";
    replaceButton.textContent = "Replace";
    replaceButton.addEventListener("click", () => {
      pendingEditDetailIndex = index;
      editDetailPhotoInput.click();
    });
    const removeButton = document.createElement("button");
    removeButton.className = "edit-media-button is-remove";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      editDetailMedia.splice(index, 1);
      renderEditDetailMedia();
    });
    actions.append(replaceButton, removeButton);
    item.append(image, name, actions);
    editDetailMediaElement.appendChild(item);
  });
}

function updateEditTotalStock() {
  editTotalStock.textContent = String(
    Array.from(editChoiceList.querySelectorAll(".choice-stock-input")).reduce(
      (total, input) => total + Math.max(0, Number(input.value) || 0),
      0,
    ),
  );
}

function addEditChoiceRow(choice = { label: "", stock: 0 }) {
  const row = document.createElement("div");
  row.className = "choice-row";
  const fields = document.createElement("div");
  fields.className = "choice-field-group";
  const labelInput = document.createElement("input");
  labelInput.className = "choice-input";
  labelInput.type = "text";
  labelInput.placeholder = "ပစ္စည်းအမည် သို့မဟုတ် အရောင်";
  labelInput.value = choice.label;
  labelInput.required = true;
  const stockLabel = document.createElement("label");
  stockLabel.className = "choice-stock-field";
  const stockTitle = document.createElement("span");
  stockTitle.textContent = "လက်ကျန်";
  const stockInput = document.createElement("input");
  stockInput.className = "choice-stock-input";
  stockInput.type = "number";
  stockInput.min = "0";
  stockInput.step = "1";
  stockInput.value =
    choice.stock === null || choice.stock === undefined
      ? "0"
      : String(choice.stock);
  stockInput.required = true;
  stockInput.addEventListener("input", updateEditTotalStock);
  stockLabel.append(stockTitle, stockInput);
  fields.append(labelInput, stockLabel);

  const removeButton = document.createElement("button");
  removeButton.className = "remove-choice-button";
  removeButton.type = "button";
  removeButton.setAttribute("aria-label", "ရွေးချယ်စရာကို ဖယ်ရန်");
  removeButton.textContent = "×";
  removeButton.addEventListener("click", () => {
    row.remove();
    updateEditTotalStock();
  });
  row.append(fields, removeButton);
  editChoiceList.appendChild(row);
  updateEditTotalStock();
}

function openProductEditor(product) {
  if (typeof product.id !== "string") return;
  revokeEditPreviewUrls();
  activeEditingProduct = product;
  activeEditThumbnailFile = null;
  editDetailMedia = (Array.isArray(product.detailMediaUrls)
    ? product.detailMediaUrls
    : []
  ).map((media) => ({
    url: typeof media.url === "string" ? media.url : "",
    type: typeof media.type === "string" ? media.type : "image/jpeg",
    name: typeof media.name === "string" ? media.name : "",
    file: null,
  }));
  editItemName.value = product.name || "";
  editItemDescription.value = product.meta || "";
  editItemCategory.value = product.category || "";
  editChoiceList.replaceChildren();
  normalizeChoiceItems(product.choices).forEach((choice) =>
    addEditChoiceRow(choice),
  );
  const promotion = product.promotion;
  editPromotionSection.hidden = !promotion || typeof promotion !== "object";
  if (!editPromotionSection.hidden) {
    const rawExpiry =
      promotion.expiresAt && typeof promotion.expiresAt.toDate === "function"
        ? promotion.expiresAt.toDate()
        : promotion.expiresAt instanceof Date
          ? promotion.expiresAt
          : new Date(promotion.expiresAt);
    editPromotionName.value = promotion.name || "";
    editPromotionPercent.value = String(promotion.percent || "");
    editPromotionExpiry.value = Number.isNaN(rawExpiry.getTime())
      ? ""
      : localDateInputValue(rawExpiry);
  } else {
    editPromotionName.value = "";
    editPromotionPercent.value = "";
    editPromotionExpiry.value = "";
  }
  editThumbnailInput.value = "";
  editDetailPhotoInput.value = "";
  productEditFeedback.textContent = "";
  productEditForm.hidden = false;
  renderEditThumbnail();
  renderEditDetailMedia();
  productEditForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
  editItemName.focus({ preventScroll: true });
}

function discardProductEditor() {
  revokeEditPreviewUrls();
  activeEditingProduct = null;
  activeEditThumbnailFile = null;
  editDetailMedia = [];
  pendingEditDetailIndex = -1;
  editThumbnailInput.value = "";
  editDetailPhotoInput.value = "";
  editChoiceList.replaceChildren();
  editTotalStock.textContent = "0";
  editPromotionSection.hidden = true;
  editPromotionName.value = "";
  editPromotionPercent.value = "";
  editPromotionExpiry.value = "";
  productEditFeedback.textContent = "";
  productEditForm.reset();
  productEditForm.hidden = true;
}

function syncProductDeleteSelection() {
  const checkboxes = Array.from(
    productDeleteList.querySelectorAll('input[type="checkbox"]'),
  );
  const selectedCount = checkboxes.filter((checkbox) => checkbox.checked).length;
  deleteSelectedProduct.disabled = selectedCount === 0;
  deleteSelectedProduct.textContent =
    selectedCount > 0
      ? `ရွေးထားသည်များကို ဖျက်ရန် (${selectedCount})`
      : "ရွေးထားသည်များကို ဖျက်ရန်";
  selectAllProducts.checked =
    checkboxes.length > 0 && selectedCount === checkboxes.length;
  selectAllProducts.indeterminate =
    selectedCount > 0 && selectedCount < checkboxes.length;
  selectAllProducts.disabled = checkboxes.length === 0;
}

function closeProductDeleteConfirmation() {
  deleteConfirmBackdrop.hidden = true;
  pendingProductDeletes = [];
  confirmProductDelete.disabled = false;
  cancelProductDelete.disabled = false;
  confirmProductDelete.textContent = "Confirm";
}

function renderSelectedMedia() {
  selectedMedia.innerHTML = selectedProductMedia
    .map(
      (file) =>
        `<span>${file.type.startsWith("video/") ? "ဗီဒီယို" : "ဓာတ်ပုံ"}: ${file.name}</span>`,
    )
    .join("");
}

// Firestore has no built-in file storage here, so images are persisted as
// compressed base64 data URLs directly on the product document (videos are
// left as session-only blob previews — too large to store this way).
function imageFileToDataUrl(
  file,
  maxDim = 1000,
  quality = 0.72,
  maxDataUrlLength = Infinity,
) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        const dimensions = [maxDim, 850, 700, 550, 450];
        const qualities = [quality, 0.62, 0.52, 0.42];
        for (const dimension of dimensions) {
          const scale = Math.min(1, dimension / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("Could not prepare image"));
            return;
          }
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
          for (const imageQuality of qualities) {
            const dataUrl = canvas.toDataURL("image/jpeg", imageQuality);
            if (dataUrl.length <= maxDataUrlLength) {
              resolve(dataUrl);
              return;
            }
          }
        }
        reject(new Error("IMAGE_SIZE_LIMIT"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function setThumbnail(file) {
  if (
    !file ||
    (!file.type.startsWith("image/") && !file.type.startsWith("video/"))
  ) {
    uploadFeedback.textContent =
      "အဓိကပုံသည် ဓာတ်ပုံ သို့မဟုတ် ဗီဒီယို ဖြစ်ရပါမည်။";
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

function normalizeChoiceItems(choices) {
  return (Array.isArray(choices) ? choices : [])
    .map((choice) => {
      if (typeof choice === "string") {
        const label = choice.trim();
        return label ? { label, stock: null } : { label: "", stock: null };
      }
      if (choice && typeof choice === "object") {
        const rawLabel =
          typeof choice.label === "string"
            ? choice.label
            : typeof choice.name === "string"
              ? choice.name
              : typeof choice.value === "string"
                ? choice.value
                : "";
        const label = rawLabel.trim();
        const rawStock = Number(choice.stock);
        return {
          label,
          stock: Number.isFinite(rawStock) && rawStock >= 0 ? rawStock : null,
        };
      }
      return { label: "", stock: null };
    })
    .filter((choice) => choice.label);
}

function addChoiceRow() {
  const row = document.createElement("div");
  row.className = "choice-row";
  row.innerHTML = `
    <div class="choice-field-group">
      <input class="choice-input" type="text" placeholder="ပစ္စည်းအမည် သို့မဟုတ် အရောင်" aria-label="ပစ္စည်းအမည် သို့မဟုတ် အရောင်ရွေးချယ်စရာ" required />
      <label class="choice-stock-field">
        <span>လက်ကျန်</span>
        <input class="choice-stock-input" type="number" min="0" step="1" value="0" placeholder="0" aria-label="ပစ္စည်းအမည်အတွက် လက်ကျန်အရေအတွက်" required />
      </label>
    </div>
    <button class="remove-choice-button" type="button" aria-label="ရွေးချယ်စရာကို ဖယ်ရန်">×</button>
  `;
  row
    .querySelector(".remove-choice-button")
    .addEventListener("click", () => {
      row.remove();
      updateTotalStock();
    });
  choiceList.appendChild(row);
  updateTotalStock();
}

function updateTotalStock() {
  const total = Array.from(choiceList.querySelectorAll(".choice-stock-input"))
    .reduce((sum, input) => sum + Math.max(0, Number(input.value) || 0), 0);
  $("#itemStocks").value = String(total);
}

function openProductDetail(product) {
  activeDetailProduct = product;
  detailProductCategory.textContent = product.category || "ပစ္စည်း";
  detailProductName.textContent = product.name;
  const promotion = promotionDetails(product);
  const discountedPrice = productPrice(product, promotion);
  detailProductPrice.classList.toggle("has-discount", Boolean(promotion));
  detailProductPrice.innerHTML = promotion
    ? priceBreakdownMarkup(product.price, discountedPrice)
    : "";
  if (!promotion) detailProductPrice.textContent = money(product.price);
  const stockOut =
    !hasStock(product) || Number(product.stock) <= productCartQty(product.id);
  detailProductStock.textContent = stockOut
    ? "လက်ကျန်မရှိပါ"
    : Number.isFinite(Number(product.stock))
      ? `လက်ကျန်: ${Math.max(0, Number(product.stock) - productCartQty(product.id))}`
      : "";
  detailAddButton.disabled = stockOut;
  detailAddButton.innerHTML = stockOut
    ? "လက်ကျန်မရှိပါ"
    : "အိတ်ထဲထည့်ရန် <span>+</span>";
  detailProductDescription.textContent = product.meta || "";
  detailPromotion.hidden = !promotion;
  detailPromotion.textContent = promotion
    ? `${promotion.name} · ${promotion.percent}% လျှော့စျေး · သက်တမ်းကုန်မည့်ရက် ${promotion.expiresAt.toLocaleDateString("en-GB")}`
    : "";
  const choices = normalizeChoiceItems(product.choices);
  detailChoiceHint.hidden = choices.length === 0;
  detailChoices.innerHTML = choices
    .map((choice) => {
      const stock = Math.max(
        0,
        (Number.isFinite(Number(choice.stock)) ? Number(choice.stock) : 0) -
          (cart[cartKey(product.id, choice.label)] || 0),
      );
      const stockText = stock > 0 ? `လက်ကျန် ${stock}` : "လက်ကျန်မရှိ";
      return `<label class="${stock <= 0 ? "is-out" : ""}"><input type="checkbox" name="detail-choice" value="${choice.label}" ${stock <= 0 ? "disabled" : ""} /> <span>${choice.label}</span><small>(${stockText})</small></label>`;
    })
    .join("");
  const galleryItems = [];
  if (product.detailMediaUrls && product.detailMediaUrls.length)
    galleryItems.push(...product.detailMediaUrls);
  else if (product.image)
    galleryItems.push({
      url: product.image,
      type: product.mediaType || "image/jpeg",
      name: product.name,
    });
  detailGallery.innerHTML = galleryItems
    .map((item) =>
      item.type.startsWith("video/")
        ? `<video src="${item.url}" controls muted playsinline></video>`
        : `<img src="${item.url}" alt="${product.name}" />`,
    )
    .join("");
  productDetailBackdrop.hidden = false;
}

function closeProductDetail() {
  productDetailBackdrop.hidden = true;
  activeDetailProduct = null;
}

function setProductMedia(files) {
  const nextFiles = Array.from(files);
  const allFiles = [...selectedProductMedia, ...nextFiles];
  const photoCount = allFiles.filter((file) =>
    file.type.startsWith("image/"),
  ).length;
  const videoCount = allFiles.filter((file) =>
    file.type.startsWith("video/"),
  ).length;
  if (
    allFiles.some(
      (file) =>
        !file.type.startsWith("image/") && !file.type.startsWith("video/"),
    )
  ) {
    uploadFeedback.textContent = "ဓာတ်ပုံနှင့် ဗီဒီယိုများသာ တင်နိုင်ပါသည်။";
    return;
  }
  if (photoCount > 10 || videoCount > 5) {
    uploadFeedback.textContent =
      "ဓာတ်ပုံ ၁၀ ပုံနှင့် ဗီဒီယို ၅ ခုအထိသာ တင်နိုင်ပါသည်။";
    return;
  }
  selectedProductMedia = allFiles;
  uploadFeedback.textContent = "";
  renderSelectedMedia();
}

function localDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function syncDiscountFields() {
  const enabled = discountEnabled.checked;
  discountFields.hidden = !enabled;
  promotionNameInput.required = enabled;
  promotionPercentInput.required = enabled;
  promotionExpiryInput.required = enabled;
}

promotionExpiryInput.min = localDateInputValue(new Date());
discountEnabled.addEventListener("change", syncDiscountFields);
syncDiscountFields();

controlPanelTab.addEventListener("click", () => {
  if (adminUnlocked) showControlPanel();
  else openAdminDialog();
});
$("#closeControlPanel").addEventListener("click", () => {
  controlPanel.hidden = true;
});
$("#cancelAdminDialog").addEventListener("click", closeAdminDialog);
adminDialogBackdrop.addEventListener("click", (event) => {
  if (event.target === adminDialogBackdrop) closeAdminDialog();
});
adminDialog.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = adminUsername.value.trim().toLowerCase();
  if (username !== "lavaflows11" && username !== "@lavaflows11") {
    adminFeedback.textContent = "သင်သည် စီမံခန့်ခွဲသူ မဟုတ်ပါ။";
    return;
  }
  adminUnlocked = true;
  closeAdminDialog();
  showControlPanel();
});
productMediaInput.addEventListener("change", () => {
  if (productMediaInput.files) setProductMedia(productMediaInput.files);
});
productMediaDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  productMediaDropzone.classList.add("dragover");
});
productMediaDropzone.addEventListener("dragleave", () =>
  productMediaDropzone.classList.remove("dragover"),
);
productMediaDropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  productMediaDropzone.classList.remove("dragover");
  if (event.dataTransfer && event.dataTransfer.files)
    setProductMedia(event.dataTransfer.files);
});
thumbnailInput.addEventListener("change", () => {
  if (thumbnailInput.files && thumbnailInput.files[0])
    setThumbnail(thumbnailInput.files[0]);
});
thumbnailDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  thumbnailDropzone.classList.add("dragover");
});
thumbnailDropzone.addEventListener("dragleave", () =>
  thumbnailDropzone.classList.remove("dragover"),
);
thumbnailDropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  thumbnailDropzone.classList.remove("dragover");
  const file =
    event.dataTransfer &&
    event.dataTransfer.files &&
    event.dataTransfer.files[0];
  if (file) setThumbnail(file);
});
addChoiceButton.addEventListener("click", addChoiceRow);
showProductEdit.addEventListener("click", () => {
  const open = productEditPanel.hidden;
  productEditPanel.hidden = !open;
  showProductEdit.setAttribute("aria-expanded", String(open));
  if (open) renderProductEditList();
});
editThumbnailInput.addEventListener("change", () => {
  const file = editThumbnailInput.files && editThumbnailInput.files[0];
  if (!file) return;
  editThumbnailInput.value = "";
  if (!file.type.startsWith("image/")) {
    productEditFeedback.textContent = "အဓိကပုံသည် ဓာတ်ပုံ ဖြစ်ရပါမည်။";
    editThumbnailInput.value = "";
    return;
  }
  activeEditThumbnailFile = file;
  productEditFeedback.textContent = "";
  renderEditThumbnail();
});
editDetailPhotoInput.addEventListener("change", () => {
  const file = editDetailPhotoInput.files && editDetailPhotoInput.files[0];
  const index = pendingEditDetailIndex;
  pendingEditDetailIndex = -1;
  editDetailPhotoInput.value = "";
  if (!file || index < 0 || !editDetailMedia[index]) return;
  if (!file.type.startsWith("image/")) {
    productEditFeedback.textContent = "Detail Photos တွင် ဓာတ်ပုံသာ အသုံးပြုပါ။";
    return;
  }
  editDetailMedia[index] = {
    ...editDetailMedia[index],
    name: file.name,
    file,
  };
  productEditFeedback.textContent = "";
  renderEditDetailMedia();
});
discardProductEdit.addEventListener("click", discardProductEditor);
addEditChoiceButton.addEventListener("click", () => addEditChoiceRow());
productEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!adminUnlocked || !activeEditingProduct) return;

  saveProductEdit.disabled = true;
  productEditFeedback.textContent = "သိမ်းနေသည်...";
  showLoading("Saving...");
  try {
    await window.firebaseReady;
    const product = activeEditingProduct;
    const choices = Array.from(
      editChoiceList.querySelectorAll(".choice-row"),
    ).map((row) => {
      const stockInput = row.querySelector(".choice-stock-input");
      return {
        label: row.querySelector(".choice-input").value.trim(),
        stock: stockInput.value.trim() ? Number(stockInput.value) : NaN,
      };
    });
    if (
      choices.length === 0 ||
      choices.some(
        (choice) =>
          !choice.label ||
          !Number.isInteger(choice.stock) ||
          choice.stock < 0,
      )
    ) {
      throw new Error("INVALID_CHOICES");
    }
    const choiceLabels = choices.map((choice) => choice.label.toLowerCase());
    if (new Set(choiceLabels).size !== choices.length)
      throw new Error("DUPLICATE_CHOICES");

    const stock = choices.reduce((total, choice) => total + choice.stock, 0);
    const update = {
      name: editItemName.value.trim(),
      meta: editItemDescription.value.trim(),
      category: editItemCategory.value,
      choices,
      stock,
    };
    const promotion = product.promotion;
    let updatedPromotion = null;
    if (
      promotion &&
      typeof promotion === "object" &&
      !editPromotionSection.hidden
    ) {
      const name = editPromotionName.value.trim();
      const percent = Number(editPromotionPercent.value);
      const expiryValue = editPromotionExpiry.value;
      const expiryParts = expiryValue.split("-").map(Number);
      const expiresAt = new Date(
        expiryParts[0],
        expiryParts[1] - 1,
        expiryParts[2],
        23,
        59,
        59,
        999,
      );
      if (!name || !editPromotionExpiry.value || !editPromotionPercent.value)
        throw new Error("INVALID_PROMOTION");
      if (!Number.isInteger(percent) || percent < 1 || percent > 99)
        throw new Error("INVALID_PROMOTION_PERCENT");
      if (
        Number.isNaN(expiresAt.getTime()) ||
        (expiresAt.getTime() < Date.now() &&
          expiryValue !==
            localDateInputValue(
              promotion.expiresAt &&
                typeof promotion.expiresAt.toDate === "function"
                ? promotion.expiresAt.toDate()
                : promotion.expiresAt instanceof Date
                  ? promotion.expiresAt
                  : new Date(promotion.expiresAt),
            ))
      )
        throw new Error("INVALID_PROMOTION_DATE");
      updatedPromotion = {
        name,
        percent,
        expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
      };
      update.promotion = updatedPromotion;
    }

    const newImageCount =
      Number(Boolean(activeEditThumbnailFile)) +
      editDetailMedia.filter((media) => media.file).length;
    const retainedMediaLength =
      (activeEditThumbnailFile ? 0 : String(product.image || "").length) +
      editDetailMedia.reduce(
        (total, media) => total + (media.file ? 0 : media.url.length),
        0,
      );
    const mediaBudget = 850000 - retainedMediaLength;
    if (newImageCount > 0 && mediaBudget < newImageCount * 10000)
      throw new Error("IMAGE_SIZE_LIMIT");
    const perImageBudget =
      newImageCount > 0 ? Math.floor(mediaBudget / newImageCount) : Infinity;

    const detailMediaUrls = await Promise.all(
      editDetailMedia.map(async (media) => ({
        url: media.file
          ? await imageFileToDataUrl(
              media.file,
              1000,
              0.72,
              perImageBudget,
            )
          : media.url,
        type: "image/jpeg",
        name: media.name,
      })),
    );
    if (activeEditThumbnailFile) {
      update.image = await imageFileToDataUrl(
        activeEditThumbnailFile,
        1000,
        0.72,
        perImageBudget,
      );
      update.mediaType = "image";
    }
    update.detailMediaUrls = detailMediaUrls;
    update.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    if (stock <= 0) {
      update.stockOutAt = firebase.firestore.FieldValue.serverTimestamp();
      update.deleteAt = firebase.firestore.Timestamp.fromMillis(
        Date.now() + STOCK_OUT_GRACE_MS,
      );
    } else {
      update.stockOutAt = firebase.firestore.FieldValue.delete();
      update.deleteAt = firebase.firestore.FieldValue.delete();
    }

    await firebase
      .firestore()
      .collection("products")
      .doc(product.id)
      .update(update);
    Object.assign(product, update, {
      detailMediaUrls: detailMediaUrls.map((media) => ({ ...media })),
      ...(updatedPromotion
        ? {
            promotion: {
              name: updatedPromotion.name,
              percent: updatedPromotion.percent,
              expiresAt: updatedPromotion.expiresAt.toDate(),
            },
          }
        : {}),
    });
    if (stock > 0) {
      delete product.stockOutAt;
      delete product.deleteAt;
      if (stockOutCleanupTimers.has(product.id)) {
        clearTimeout(stockOutCleanupTimers.get(product.id));
        stockOutCleanupTimers.delete(product.id);
      }
    } else {
      product.stockOutAt = new Date();
      product.deleteAt = new Date(Date.now() + STOCK_OUT_GRACE_MS);
      scheduleStockOutCleanup(product);
    }
    activeEditThumbnailFile = null;
    editDetailMedia = detailMediaUrls.map((media) => ({ ...media, file: null }));
    editThumbnailInput.value = "";
    renderEditThumbnail();
    renderEditDetailMedia();
    renderProducts();
    renderProductDeleteOptions();
    renderProductEditList();
    productEditFeedback.textContent = "Changes saved.";
  } catch (error) {
    console.error("Could not save product changes:", error);
    if (error.message === "INVALID_CHOICES")
      productEditFeedback.textContent =
        "ရွေးချယ်စရာ အနည်းဆုံးတစ်ခုနှင့် မှန်ကန်သော လက်ကျန်အရေအတွက် ထည့်ပါ။";
    else if (error.message === "DUPLICATE_CHOICES")
      productEditFeedback.textContent =
        "ရွေးချယ်စရာအမည်များ ထပ်နေပါသည်။ တစ်ခုချင်းစီ မတူညီအောင် ပြင်ပါ။";
    else if (error.message === "INVALID_PROMOTION")
      productEditFeedback.textContent =
        "Promotion name၊ Discount percent နှင့် Expiry Date အားလုံးဖြည့်ပါ။";
    else if (error.message === "INVALID_PROMOTION_PERCENT")
      productEditFeedback.textContent =
        "Discount percent ကို ၁ မှ ၉၉ အတွင်းရှိ ကိန်းပြည့်အဖြစ် ထည့်ပါ။";
    else if (error.message === "INVALID_PROMOTION_DATE")
      productEditFeedback.textContent =
        "Promotion Expiry Date သည် ယနေ့ သို့မဟုတ် အနာဂတ်ရက် ဖြစ်ရပါမည်။";
    else if (error.message === "IMAGE_SIZE_LIMIT")
      productEditFeedback.textContent =
        "ပုံများ၏ စုစုပေါင်းအရွယ်အစား များနေပါသည်။ ပုံအသစ်အရွယ်အစား သို့မဟုတ် အရေအတွက်ကို လျှော့ပါ။";
    else if (error.code === "permission-denied")
      productEditFeedback.textContent =
        "Firebase က ပြင်ဆင်ခွင့်ကို ပယ်ချလိုက်ပါသည်။ ခွင့်ပြုချက်နှင့် အင်တာနက်ကို စစ်ဆေးပါ။";
    else
      productEditFeedback.textContent =
        "ပြင်ဆင်မှုကို သိမ်း၍မရပါ။ အင်တာနက်ကို စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။";
  } finally {
    hideLoading();
    saveProductEdit.disabled = false;
  }
});
showProductDelete.addEventListener("click", () => {
  const open = productDeletePanel.hidden;
  productDeletePanel.hidden = !open;
  showProductDelete.setAttribute("aria-expanded", String(open));
  if (open) {
    renderProductDeleteOptions();
    productDeleteList.querySelector("input")?.focus();
  }
});
productDeleteList.addEventListener("change", () => {
  productDeleteFeedback.textContent = "";
  syncProductDeleteSelection();
});
selectAllProducts.addEventListener("change", () => {
  productDeleteList
    .querySelectorAll('input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.checked = selectAllProducts.checked;
    });
  syncProductDeleteSelection();
});
deleteSelectedProduct.addEventListener("click", () => {
  if (!adminUnlocked) return;
  const selectedIds = new Set(
    Array.from(
      productDeleteList.querySelectorAll(
        'input[type="checkbox"]:checked',
      ),
    ).map((checkbox) => checkbox.value),
  );
  pendingProductDeletes = products.filter(
    (product) =>
      typeof product.id === "string" && selectedIds.has(product.id),
  );
  if (pendingProductDeletes.length === 0) {
    productDeleteFeedback.textContent = "ဖျက်မည့်ပစ္စည်းများကို ရွေးပေးပါ။";
    syncProductDeleteSelection();
    return;
  }
  deleteConfirmMessage.textContent = `${pendingProductDeletes.length} ခုသော ပစ္စည်းကို ဖျက်မည်။`;
  deleteConfirmList.replaceChildren();
  pendingProductDeletes.forEach((product) => {
    const item = document.createElement("li");
    item.textContent = product.name || "အမည်မရှိသောပစ္စည်း";
    deleteConfirmList.appendChild(item);
  });
  deleteConfirmBackdrop.hidden = false;
  confirmProductDelete.focus();
});
cancelProductDelete.addEventListener(
  "click",
  closeProductDeleteConfirmation,
);
deleteConfirmBackdrop.addEventListener("click", (event) => {
  if (event.target === deleteConfirmBackdrop && !confirmProductDelete.disabled)
    closeProductDeleteConfirmation();
});
confirmProductDelete.addEventListener("click", async () => {
  const productsToDelete = pendingProductDeletes;
  if (!adminUnlocked || productsToDelete.length === 0) {
    closeProductDeleteConfirmation();
    return;
  }

  confirmProductDelete.disabled = true;
  cancelProductDelete.disabled = true;
  confirmProductDelete.textContent = "Deleting...";
  try {
    await window.firebaseReady;
    const firestore = firebase.firestore();
    const results = await Promise.allSettled(
      productsToDelete.map((product) =>
        firestore.collection("products").doc(product.id).delete(),
      ),
    );
    const deletedIds = new Set();
    const failedProducts = [];
    results.forEach((result, index) => {
      const product = productsToDelete[index];
      if (result.status === "fulfilled") deletedIds.add(product.id);
      else {
        console.error(`Could not delete product ${product.id}:`, result.reason);
        failedProducts.push(product);
      }
    });
    products = products.filter((product) => !deletedIds.has(product.id));
    if (
      activeEditingProduct &&
      deletedIds.has(activeEditingProduct.id)
    )
      discardProductEditor();
    deletedIds.forEach((id) => removeProductFromCart(id));
    renderProducts();
    renderCart();
    renderProductDeleteOptions();
    renderProductEditList();
    if (failedProducts.length > 0) {
      productDeleteFeedback.textContent =
        `${deletedIds.size} ခု ဖျက်ပြီး၊ ${failedProducts.length} ခု ဖျက်၍မရပါ။ ထပ်ကြိုးစားပါ။`;
    } else {
      productDeleteFeedback.textContent = `${deletedIds.size} ခုသော ပစ္စည်းကို ဖျက်ပြီးပါပြီ။`;
    }
    closeProductDeleteConfirmation();
  } catch (error) {
    console.error("Could not delete selected products:", error);
    productDeleteFeedback.textContent =
      "ပစ္စည်းများကို ဖျက်၍မရပါ။ ခွင့်ပြုချက်နှင့် အင်တာနက်ကို စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။";
    closeProductDeleteConfirmation();
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    !deleteConfirmBackdrop.hidden &&
    !confirmProductDelete.disabled
  )
    closeProductDeleteConfirmation();
});
choiceList.addEventListener("input", (event) => {
  if (event.target.matches(".choice-stock-input")) updateTotalStock();
});
productUploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!adminUnlocked) {
    openAdminDialog();
    return;
  }
  if (!selectedThumbnail && selectedProductMedia.length === 0) {
    uploadFeedback.textContent =
      "အဓိကပုံ သို့မဟုတ် အသေးစိတ်ဓာတ်ပုံ/ဗီဒီယို အနည်းဆုံးတစ်ခု ထည့်ပါ။";
    return;
  }
  if (choiceList.querySelectorAll(".choice-row").length === 0) {
    uploadFeedback.textContent =
      "စုစုပေါင်းလက်ကျန်တွက်ရန် အနည်းဆုံးရွေးချယ်စရာတစ်ခု ထည့်ပါ။";
    return;
  }
  const choices = Array.from(choiceList.querySelectorAll(".choice-row"))
    .map((row) => {
      const label = row.querySelector(".choice-input").value.trim();
      const stockValue = Number(row.querySelector(".choice-stock-input").value);
      if (!label) return null;
      return {
        label,
        stock: Number.isFinite(stockValue) && stockValue >= 0 ? stockValue : 0,
      };
    })
    .filter(Boolean);
  if (choices.length === 0) {
    uploadFeedback.textContent =
      "စုစုပေါင်းလက်ကျန်တွက်ရန် အနည်းဆုံးရွေးချယ်စရာတစ်ခု ထည့်ပါ။";
    return;
  }
  let promotion = null;
  if (discountEnabled.checked) {
    const promotionName = promotionNameInput.value.trim();
    const percent = Number(promotionPercentInput.value);
    const expiryParts = promotionExpiryInput.value.split("-").map(Number);
    const expiresAt = new Date(
      expiryParts[0],
      expiryParts[1] - 1,
      expiryParts[2],
      23,
      59,
      59,
      999,
    );
    if (
      !promotionName ||
      !promotionExpiryInput.value ||
      !promotionPercentInput.value
    ) {
      uploadFeedback.textContent =
        "Promotion name၊ Discount percent နှင့် Expiry Date အားလုံးဖြည့်ပါ။";
      return;
    }
    if (!Number.isInteger(percent) || percent < 1 || percent > 99) {
      uploadFeedback.textContent =
        "Discount percent ကို ၁ မှ ၉၉ အတွင်းရှိ ကိန်းပြည့်အဖြစ် ထည့်ပါ။";
      return;
    }
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      uploadFeedback.textContent =
        "Promotion Expiry Date သည် ယနေ့ သို့မဟုတ် အနာဂတ်ရက် ဖြစ်ရပါမည်။";
      return;
    }
    promotion = { name: promotionName, percent, expiresAt };
  }
  const productId = firebase.firestore().collection("products").doc().id;
  const product = {
    id: productId,
    name: $("#itemName").value.trim(),
    category: $("#itemCategory").value,
    meta: $("#itemDescription").value.trim(),
    price: Number($("#itemPrice").value),
    stock: choices.reduce((total, choice) => total + choice.stock, 0),
    choices,
    ...(promotion ? { promotion } : {}),
  };
  uploadProductButton.disabled = true;
  uploadProductButton.textContent = "တင်နေသည်...";
  uploadFeedback.textContent = "ပစ္စည်းကို Firebase သို့ သိမ်းနေသည်...";
  showLoading("ပစ္စည်းအသစ်ကို တင်နေသည်...");
  try {
    await window.firebaseReady;
    const cardMedia = selectedThumbnail || selectedProductMedia[0];
    const cardIsVideo = cardMedia.type.startsWith("video/");
    if (cardIsVideo) {
      uploadFeedback.textContent =
        "လောလောဆယ် ဗီဒီယိုများကို အသေးစိတ်ပုံအဖြစ်သာ အသုံးပြုနိုင်ပါသည် — အမြဲတမ်းသိမ်းရန် အဓိကပုံအဖြစ် ဓာတ်ပုံတစ်ပုံ ရွေးပါ။";
      uploadProductButton.disabled = false;
      uploadProductButton.textContent = "ပစ္စည်းတင်ရန်";
      return;
    }

    // Only images are persisted (compressed to keep each product doc under
    // Firestore's 1MB limit); videos stay as local-only previews for now.
    const imageFiles = (selectedThumbnail
      ? [selectedThumbnail, ...selectedProductMedia]
      : selectedProductMedia).filter((file) => file.type.startsWith("image/"));
    const perImageBudget = Math.floor(800000 / imageFiles.length);
    const dataUrls = await Promise.all(
      imageFiles.map((file) =>
        imageFileToDataUrl(file, 1000, 0.72, perImageBudget),
      ),
    );
    const totalBytes = dataUrls.reduce((sum, url) => sum + url.length, 0);
    if (totalBytes > 900000) {
      throw new Error("IMAGE_SIZE_LIMIT");
    }
    const detailMediaUrls = dataUrls.map((url, i) => ({
      url,
      type: "image/jpeg",
      name: imageFiles[i] ? imageFiles[i].name : `photo-${i}`,
    }));
    const savedProduct = {
      ...product,
      image: dataUrls[0],
      mediaType: "image",
      detailMediaUrls,
      badge: promotion ? "" : "အသစ်",
      ...(promotion
        ? {
            promotion: {
              name: promotion.name,
              percent: promotion.percent,
              expiresAt: firebase.firestore.Timestamp.fromDate(
                promotion.expiresAt,
              ),
            },
          }
        : {}),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      ...(product.stock <= 0
        ? {
            stockOutAt: firebase.firestore.FieldValue.serverTimestamp(),
            deleteAt: firebase.firestore.Timestamp.fromMillis(
              Date.now() + STOCK_OUT_GRACE_MS,
            ),
          }
        : {}),
    };
    await firebase
      .firestore()
      .collection("products")
      .doc(productId)
      .set(savedProduct);
    const newProduct = {
      ...savedProduct,
      ...(product.stock <= 0
        ? {
            stockOutAt: new Date(),
            deleteAt: new Date(Date.now() + STOCK_OUT_GRACE_MS),
          }
        : {}),
    };
    products.unshift(newProduct);
    scheduleStockOutCleanup(newProduct);
    renderProducts();
    renderProductDeleteOptions();
    renderProductEditList();
    uploadFeedback.textContent = "ပစ္စည်းတင်ပြီးပါပြီ။";
    productUploadForm.reset();
    syncDiscountFields();
    $("#itemStocks").value = "0";
    selectedProductMedia = [];
    clearThumbnail();
    choiceList.innerHTML = "";
    renderSelectedMedia();
  } catch (error) {
    console.error("Product upload failed:", error);
    uploadFeedback.textContent =
      error.message === "IMAGE_SIZE_LIMIT"
        ? "ဓာတ်ပုံအားလုံးကို အရွယ်အစားလျှော့ပြီးပါပြီ။ ဖိုင်အရွယ်အစား များနေသေးပါက ပုံအရေအတွက်လျှော့ပြီး ထပ်တင်ပါ။"
        : error.code === "permission-denied"
          ? "Firebase က ပစ္စည်းတင်ခွင့်ကို ပယ်ချလိုက်ပါသည်။ Firestore စည်းမျဉ်းများတွင် အတည်ပြုထားသောအသုံးပြုသူများကို ပစ္စည်းရေးသားခွင့်ပြုပါ။"
          : "တင်၍မရပါ။ Firebase ပြင်ဆင်မှုကို စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။";
  } finally {
    uploadProductButton.disabled = false;
    uploadProductButton.textContent = "ပစ္စည်းတင်ရန်";
    hideLoading();
  }
});
$("#closeProductDetail").addEventListener("click", closeProductDetail);
productDetailBackdrop.addEventListener("click", (event) => {
  if (event.target === productDetailBackdrop) closeProductDetail();
});
detailAddButton.addEventListener("click", async () => {
  if (!activeDetailProduct) return;
  const product = activeDetailProduct;
  const choices = Array.from(
    detailChoices.querySelectorAll('input[name="detail-choice"]:checked'),
  ).map((input) => input.value);
  if (hasChoices(product) && choices.length === 0) {
    notify("အရောင်/ရွေးချယ်မှု ကို အရင်ရွေးပါ။");
    return;
  }
  if (choices.length === 0) choices.push("");
  detailAddButton.disabled = true;
  try {
    for (const choice of choices) await updateQuantity(product.id, 1, choice);
    if (activeDetailProduct === product) closeProductDetail();
  } finally {
    if (activeDetailProduct === product)
      detailAddButton.disabled =
        !hasStock(product) || Number(product.stock) <= productCartQty(product.id);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !productDetailBackdrop.hidden)
    closeProductDetail();
});
async function loadSavedProducts() {
  try {
    const savedProducts =
      await window.firebaseImageLoader.loadProducts("products");
    await preloadProductImages(savedProducts);
    products = [
      ...savedProducts,
      ...products.filter(
        (product) =>
          !savedProducts.some((savedProduct) => savedProduct.id === product.id),
      ),
    ];
    savedProducts.forEach(scheduleStockOutCleanup);
    renderProducts();
    if (!controlPanel.hidden) {
      renderProductDeleteOptions();
      renderProductEditList();
    }
  } catch (error) {
    console.error("Could not load saved products:", error);
  } finally {
    hideLoading();
  }
}
renderCategories();
syncCategorySlider();
renderProducts();
renderCart();
setPaymentMethod("kbzpay");
loadSavedProducts();
