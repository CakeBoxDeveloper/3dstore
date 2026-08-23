// main.js

document.addEventListener('DOMContentLoaded', async () => {
  const data = await loadCatalog();
  const categories = data.categories; // массив из 3 категорий

  let currentCat = 0; // 0, 1, 2

  const prism   = document.getElementById('cat-prism');
  const wrap    = document.getElementById('cat-prism-wrap');
  const titleEl = document.getElementById('cat-title');
  const btnPrev = document.getElementById('cat-prev');
  const btnNext = document.getElementById('cat-next');

  // Строим 3 грани призмы
  // Призма горизонтальная (rotateY): грань i повёрнута на i*120deg
  // translateZ вычисляется из ширины: r = W / (2*sqrt(3))

  function buildFaces() {
    prism.innerHTML = '';
    categories.forEach((cat, i) => {
      const face = document.createElement('div');
      face.className = 'cat-face';
      face.dataset.index = i;

      // Содержимое грани: подкатегории по центру, под каждой — товары по 3 в ряд (только иконки)
      face.innerHTML = `
        <div class="cat-face-inner">
          ${cat.subcategories.map(sub => `
            <div class="sub-block">
              <div class="sub-title">${sub.name}</div>
              <div class="sub-products">
                ${sub.products.map(p => `
                  <div class="prod-icon" onclick="openProduct('${p.id}')">
                    ${p.thumbnail
                      ? `<img src="${p.thumbnail}" alt="${p.name}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=pi-ph>⬡</span>'">`
                      : `<span class="pi-ph">⬡</span>`
                    }
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
      prism.appendChild(face);
    });
    setPrismRadius();
    rotateTo(currentCat);
  }

  function setPrismRadius() {
    const W = wrap.offsetWidth;
    const r = Math.round(W / (2 * Math.sqrt(3)));
    wrap.style.setProperty('--cat-r', r + 'px');
    // Высота призмы = высота самой высокой грани
    // Задаём после рендера
    requestAnimationFrame(() => {
      let maxH = 0;
      prism.querySelectorAll('.cat-face').forEach(f => {
        maxH = Math.max(maxH, f.scrollHeight);
      });
      prism.style.height = maxH + 'px';
    });
  }

  function rotateTo(idx) {
    // грань 0 при rotateY(0), грань 1 при rotateY(-120deg), грань 2 при rotateY(-240deg)
    prism.style.transform = `rotateY(${-idx * 120}deg)`;
    titleEl.textContent = categories[idx].name;
    currentCat = idx;
  }

  btnNext.addEventListener('click', () => {
    rotateTo((currentCat + 1) % 3);
  });

  btnPrev.addEventListener('click', () => {
    rotateTo((currentCat + 2) % 3); // (currentCat - 1 + 3) % 3
  });

  window.addEventListener('resize', () => {
    setPrismRadius();
    rotateTo(currentCat);
  });

  buildFaces();
});

function openProduct(productId) {
  window.location.href = `product.html?id=${productId}`;
}
