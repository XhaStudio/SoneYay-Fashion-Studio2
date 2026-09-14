(() => {
  "use strict";

  function normalizeImage(image, fallbackName) {
    if (typeof image === "string" && image.trim()) {
      return { url: image, type: "image/jpeg", name: fallbackName };
    }
    if (!image || typeof image.url !== "string" || !image.url.trim()) return null;
    return {
      url: image.url,
      type: typeof image.type === "string" ? image.type : "image/jpeg",
      name: typeof image.name === "string" && image.name.trim() ? image.name : fallbackName,
    };
  }

  function productImages(data, productName) {
    const images = [];
    const thumbnail = normalizeImage(data.image, productName || "product-image");
    if (thumbnail) images.push(thumbnail);

    if (Array.isArray(data.detailMediaUrls)) {
      data.detailMediaUrls.forEach((image, index) => {
        const normalized = normalizeImage(image, `${productName || "product"}-${index + 1}`);
        if (normalized && !images.some((item) => item.url === normalized.url)) images.push(normalized);
      });
    }
    return images;
  }

  async function loadProducts(collectionName = "products") {
    if (!window.firebaseReady || !window.firebase || !firebase.firestore) {
      throw new Error("Firebase is not initialized");
    }

    await window.firebaseReady;
    const snapshot = await firebase.firestore().collection(collectionName).get();
    return snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      const images = productImages(data, data.name);
      return {
        ...data,
        id: doc.id,
        image: images[0] ? images[0].url : "",
        mediaType: images[0] ? images[0].type : data.mediaType,
        detailMediaUrls: images,
      };
    });
  }

  async function loadAllImages(collectionName = "products") {
    const products = await loadProducts(collectionName);
    return products.flatMap((product) => product.detailMediaUrls || []);
  }

  window.firebaseImageLoader = Object.freeze({ loadProducts, loadAllImages });
})();
