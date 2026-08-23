document.addEventListener('DOMContentLoaded', async () => {
  const data       = await loadCatalog();
  const categories = data.categories;
  let current = 0;

  const track   = document.getElementById('cat-track');
  const titleEl = document.getElementById('cat-title');
  const btnPrev = document.getElementById('cat-prev');
  const btnNext = document.getElementById('cat-next');

  // Строим грани
  categories.forEach((cat) => {
    const face = document.createElement('div');
    face.className = 'cat-face';
    face.innerHTML = cat.subcategories.map(sub => `
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
    `).join('');
    track.appendChild(face);
  });

  function goTo(idx) {
    current = ((idx % 3) + 3) % 3;
    // трек = 3 грани по 100% каждая, сдвигаем на -current * (100/3)%
    track.style.transform = `translateX(${-current * (100 / 3)}%)`;
    titleEl.textContent = categories[current].name;
  }

  btnNext.addEventListener('click', () => goTo(current + 1));
  btnPrev.addEventListener('click', () => goTo(current - 1));

  // Свайп
  let tx = 0;
  track.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) dx < 0 ? goTo(current + 1) : goTo(current - 1);
  });

  goTo(0);
});

function openProduct(id) {
  location.href = `product.html?id=${id}`;
}
