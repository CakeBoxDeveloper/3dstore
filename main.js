// main.js — горизонтальная призма каталога

document.addEventListener('DOMContentLoaded', async () => {
  const data       = await loadCatalog();
  const categories = data.categories; // 3 категории

  let currentCat = 0;

  const rotor   = document.getElementById('cat-rotor');
  const stage   = document.getElementById('cat-stage');
  const titleEl = document.getElementById('cat-title');
  const btnPrev = document.getElementById('cat-prev');
  const btnNext = document.getElementById('cat-next');

  // ── Строим грани ──────────────────────────────────────────────────────────

  function buildFaces() {
    rotor.innerHTML = '';

    categories.forEach((cat, i) => {
      const face = document.createElement('div');
      face.className = 'cat-face';
      face.dataset.index = i;

      face.innerHTML = `
        <div class="cat-face-inner">
          ${cat.subcategories.map(sub => `
            <div class="sub-block">
              <div class="sub-title">${sub.name}</div>
              <div class="sub-products">
                ${sub.products.map(p => `
                  <div class="prod-icon" onclick="openProduct('${p.id}')">
                    ${p.thumbnail
                      ? `<img src="${p.thumbnail}" alt="${p.name}" loading="lazy"
                           onerror="this.parentElement.innerHTML='<span class=pi-ph>⬡</span>'">`
                      : `<span class="pi-ph">⬡</span>`
                    }
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;

      rotor.appendChild(face);
    });
  }

  // ── Вычисляем translateZ для правильной призмы ────────────────────────────
  // Для равносторонней треугольной призмы, вращающейся вокруг центральной оси:
  // inradius = W / (2 * tan(60°)) = W / (2√3) ≈ W * 0.2887
  // где W — ширина грани (= ширина stage)

  function setPrismRadius() {
    const W = stage.offsetWidth;
    const r = Math.round(W / (2 * Math.sqrt(3)));
    stage.style.setProperty('--cat-r', r + 'px');
  }

  // ── Поворот ───────────────────────────────────────────────────────────────

  function rotateTo(idx) {
    rotor.style.transform = `rotateY(${-idx * 120}deg)`;
    titleEl.textContent   = categories[idx].name;
    currentCat = idx;
  }

  // ── Навигация ─────────────────────────────────────────────────────────────

  btnNext.addEventListener('click', () => rotateTo((currentCat + 1) % 3));
  btnPrev.addEventListener('click', () => rotateTo((currentCat + 2) % 3));

  // Свайп на мобильном
  let touchStartX = 0;
  stage.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      dx < 0
        ? rotateTo((currentCat + 1) % 3)
        : rotateTo((currentCat + 2) % 3);
    }
  });

  window.addEventListener('resize', () => {
    setPrismRadius();
    rotateTo(currentCat);
  });

  // ── Init ──────────────────────────────────────────────────────────────────

  buildFaces();
  setPrismRadius();
  rotateTo(0);
});

function openProduct(productId) {
  window.location.href = `product.html?id=${productId}`;
}
