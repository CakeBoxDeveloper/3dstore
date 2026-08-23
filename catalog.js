// catalog.js — данные загружаются из catalog.json и доступны глобально

window.CatalogData = null;

async function loadCatalog() {
  const res = await fetch('/catalog.json');
  window.CatalogData = await res.json();
  return window.CatalogData;
}

// Найти товар по id
function findProduct(productId) {
  if (!window.CatalogData) return null;
  for (const cat of window.CatalogData.categories) {
    for (const sub of cat.subcategories) {
      for (const p of sub.products) {
        if (p.id === productId) {
          return { product: p, category: cat, subcategory: sub };
        }
      }
    }
  }
  return null;
}

window.loadCatalog = loadCatalog;
window.findProduct = findProduct;
