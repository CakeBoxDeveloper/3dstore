// catalog.js — данные каталога (загружаются через /api/catalog с фоллбеком на catalog.json)

window.CatalogData = null;

async function loadCatalog() {
  if (window.CatalogData) return window.CatalogData;

  try {
    const res = await fetch('/api/catalog');
    if (res.ok) {
      window.CatalogData = await res.json();
      return window.CatalogData;
    }
  } catch (e) {
    // Фоллбек на статический catalog.json при локальном тестировании
  }

  try {
    const res = await fetch('catalog.json');
    window.CatalogData = await res.json();
    return window.CatalogData;
  } catch (e) {
    console.error('Не удалось загрузить каталог:', e);
    return { categories: [] };
  }
}

// Найти товар по id
function findProduct(productId) {
  if (!window.CatalogData) return null;
  for (const cat of window.CatalogData.categories) {
    if (cat.products) {
      for (const p of cat.products) {
        if (p.id === productId) {
          return { product: p, category: cat, subcategory: { name: '' } };
        }
      }
    }
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        if (sub.products) {
          for (const p of sub.products) {
            if (p.id === productId) {
              return { product: p, category: cat, subcategory: sub };
            }
          }
        }
      }
    }
  }
  return null;
}

window.loadCatalog = loadCatalog;
window.findProduct = findProduct;
