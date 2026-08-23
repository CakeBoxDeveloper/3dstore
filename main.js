// main.js — горизонтальная призма каталога

document.addEventListener('DOMContentLoaded', async () => {
  const data       = await loadCatalog();
  const categories = data.categories;

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

  // ── Размеры: ширина и высота задаются явно ────────────────────────────────
  // translateZ = W / (2√3) для правильной треугольной призмы rotateY

  function updateLayout() {
    const stageRect = stage.getBoundingClientRect();
    const W = stageRect.width;
    const H = stageRect.height;
    const r = Math.round(W / (2 * Math.sqrt(3)));

    // Задаём размеры ротора явно
    rotor.style.width  = W + 'px';
    rotor.style.height = H + 'px';

    // CSS переменная для translateZ граней
    stage.style.setProperty('--cat-r', r + 'px');

    // Каждая грань тоже явного размера
    rotor.querySelectorAll('.cat-face').forEach(f => {
      f.style.width  = W + 'px';
      f.style.height = H + 'px';
    });
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

  // Свайп
  let touchStartX = 0;
  stage.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      dx < 0 ? rotateTo((currentCat + 1) % 3) : rotateTo((currentCat + 2) % 3);
    }
  });

  window.addEventListener('resize', () => {
    updateLayout();
    rotateTo(currentCat);
  });

  // ── Init ──────────────────────────────────────────────────────────────────

  buildFaces();
  // Ждём следующий frame чтобы stage имел размеры
  requestAnimationFrame(() => {
    updateLayout();
    rotateTo(0);
  });
});

function openProduct(productId) {
  window.location.href = `product.html?id=${productId}`;
}
