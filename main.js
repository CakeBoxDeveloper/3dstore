// main.js — рендер каталога на index.html

document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('catalog-root');
  const data = await loadCatalog();

  data.categories.forEach((cat, i) => {
    const block = document.createElement('div');
    block.className = 'category-block' + (i === 0 ? ' open' : '');
    block.innerHTML = `
      <div class="category-header">
        <h2>${cat.name}</h2>
        <span class="category-chevron">▼</span>
      </div>
      <div class="category-body">
        ${cat.subcategories.map(sub => `
          <div class="subcategory">
            <div class="subcategory-title">${sub.name}</div>
            <div class="product-grid">
              ${sub.products.map(p => `
                <div class="product-card" onclick="openProduct('${p.id}')">
                  <div class="product-thumb">
                    ${p.thumbnail
                      ? `<img src="${p.thumbnail}" alt="${p.name}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=thumb-placeholder>⬡</span>'">`
                      : `<span class="thumb-placeholder">⬡</span>`
                    }
                  </div>
                  <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-price">${p.price.toLocaleString('ru-RU')} ₽</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // accordion toggle
    block.querySelector('.category-header').addEventListener('click', () => {
      block.classList.toggle('open');
    });

    root.appendChild(block);
  });
});

function openProduct(productId) {
  window.location.href = `product.html?id=${productId}`;
}
