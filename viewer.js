// viewer.js — Three.js 3D viewer + combined material slider + order modal
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── Материалы = финиш + цвет ─────────────────────────────────────────────────
// Каждый объект — один вариант в слайдере

const MATERIALS = [
  // Матовые
  { id: 'matte-white',    label: 'Матовый',   sublabel: 'Белый',     hex: '#f2f2f2', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-black',    label: 'Матовый',   sublabel: 'Чёрный',    hex: '#222222', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-gray',     label: 'Матовый',   sublabel: 'Серый',     hex: '#888888', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-red',      label: 'Матовый',   sublabel: 'Красный',   hex: '#c0392b', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-blue',     label: 'Матовый',   sublabel: 'Синий',     hex: '#2980b9', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-green',    label: 'Матовый',   sublabel: 'Зелёный',   hex: '#27ae60', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-beige',    label: 'Матовый',   sublabel: 'Бежевый',   hex: '#d4c5a9', roughness: 0.95, metalness: 0, type: 'standard' },
  // Глянец
  { id: 'gloss-white',    label: 'Глянец',    sublabel: 'Белый',     hex: '#f5f5f5', roughness: 0.05, metalness: 0, type: 'standard' },
  { id: 'gloss-black',    label: 'Глянец',    sublabel: 'Чёрный',    hex: '#111111', roughness: 0.05, metalness: 0, type: 'standard' },
  { id: 'gloss-red',      label: 'Глянец',    sublabel: 'Красный',   hex: '#e74c3c', roughness: 0.05, metalness: 0, type: 'standard' },
  { id: 'gloss-blue',     label: 'Глянец',    sublabel: 'Синий',     hex: '#3498db', roughness: 0.05, metalness: 0, type: 'standard' },
  { id: 'gloss-yellow',   label: 'Глянец',    sublabel: 'Жёлтый',    hex: '#f1c40f', roughness: 0.05, metalness: 0, type: 'standard' },
  // Шёлк
  { id: 'silk-white',     label: 'Шёлк',      sublabel: 'Белый',     hex: '#f0ede8', roughness: 0.4,  metalness: 0, type: 'silk' },
  { id: 'silk-gold',      label: 'Шёлк',      sublabel: 'Золото',    hex: '#c9a84c', roughness: 0.4,  metalness: 0, type: 'silk' },
  { id: 'silk-rose',      label: 'Шёлк',      sublabel: 'Розовый',   hex: '#e8a0a0', roughness: 0.4,  metalness: 0, type: 'silk' },
  { id: 'silk-mint',      label: 'Шёлк',      sublabel: 'Мятный',    hex: '#a8d8c0', roughness: 0.4,  metalness: 0, type: 'silk' },
  // Прозрачный
  { id: 'clear',          label: 'Прозрачный',sublabel: 'Чистый',    hex: '#e8f4ff', roughness: 0.02, metalness: 0, type: 'clear' },
  { id: 'clear-smoke',    label: 'Прозрачный',sublabel: 'Дымчатый',  hex: '#555566', roughness: 0.05, metalness: 0, type: 'clear' },
  { id: 'clear-amber',    label: 'Прозрачный',sublabel: 'Янтарный',  hex: '#d4820a', roughness: 0.02, metalness: 0, type: 'clear' },
  { id: 'clear-teal',     label: 'Прозрачный',sublabel: 'Бирюза',    hex: '#1abc9c', roughness: 0.02, metalness: 0, type: 'clear' },
];

// ── State ────────────────────────────────────────────────────────────────────

let currentMat = MATERIALS[0];
let meshObjects = [];
let scene, camera, renderer, controls;

// ── Init scene ───────────────────────────────────────────────────────────────

function initScene() {
  const canvas = document.getElementById('viewer-canvas');
  const wrap   = canvas.parentElement;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const W = wrap.clientWidth;
  renderer.setSize(W, W);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(0, 0.5, 2.5);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(3, 5, 3);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xaaccff, 0.8);
  fill.position.set(-3, 2, -2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffeedd, 0.5);
  rim.position.set(0, -3, -3);
  scene.add(rim);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.5;
  controls.maxDistance = 10;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  const ro = new ResizeObserver(() => {
    const w = wrap.clientWidth;
    renderer.setSize(w, w);
    camera.updateProjectionMatrix();
  });
  ro.observe(wrap);

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// ── Load model ───────────────────────────────────────────────────────────────

function loadModel(url) {
  const loader_el = document.getElementById('viewer-loader');
  meshObjects.forEach(o => scene.remove(o));
  meshObjects = [];
  loader_el.style.display = 'flex';

  new GLTFLoader().load(
    url,
    (gltf) => {
      const model = gltf.scene;
      const box   = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      const scale  = 1.8 / Math.max(size.x, size.y, size.z);
      model.position.sub(center.multiplyScalar(scale));
      model.scale.setScalar(scale);
      model.traverse(c => { if (c.isMesh) c.material = buildMaterial(); });
      scene.add(model);
      meshObjects.push(model);
      loader_el.style.display = 'none';
    },
    undefined,
    (err) => {
      console.warn('GLB failed, using placeholder:', err);
      usePlaceholder();
      loader_el.style.display = 'none';
    }
  );
}

function usePlaceholder() {
  meshObjects.forEach(o => scene.remove(o));
  meshObjects = [];
  const mesh = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.6, 0.22, 128, 32),
    buildMaterial()
  );
  scene.add(mesh);
  meshObjects.push(mesh);
}

// ── Material builder ─────────────────────────────────────────────────────────

function buildMaterial() {
  const color = new THREE.Color(currentMat.hex);

  if (currentMat.type === 'clear') {
    return new THREE.MeshPhysicalMaterial({
      color, roughness: currentMat.roughness, metalness: 0,
      transmission: 1.0, thickness: 0.5, ior: 1.45,
      transparent: true, opacity: 1.0,
    });
  }
  if (currentMat.type === 'silk') {
    return new THREE.MeshPhysicalMaterial({
      color, roughness: currentMat.roughness, metalness: 0,
      sheen: 0.8, sheenRoughness: 0.3,
      sheenColor: new THREE.Color(0xffffff),
    });
  }
  return new THREE.MeshStandardMaterial({
    color, roughness: currentMat.roughness, metalness: currentMat.metalness,
  });
}

function applyMaterialToAll() {
  meshObjects.forEach(obj => {
    obj.traverse(c => {
      if (c.isMesh) { c.material.dispose(); c.material = buildMaterial(); }
    });
  });
}

// ── Material slider ───────────────────────────────────────────────────────────

function buildMaterialSlider() {
  const slider = document.getElementById('material-slider');
  slider.innerHTML = '';

  MATERIALS.forEach(mat => {
    const card = document.createElement('button');
    card.className = 'mat-chip' + (mat.id === currentMat.id ? ' active' : '');
    card.setAttribute('aria-label', `${mat.label} ${mat.sublabel}`);
    card.innerHTML = `
      <span class="mat-chip-swatch" style="background:${mat.hex}"></span>
      <span class="mat-chip-label">${mat.label}</span>
      <span class="mat-chip-sub">${mat.sublabel}</span>
    `;
    card.addEventListener('click', () => {
      currentMat = mat;
      slider.querySelectorAll('.mat-chip').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      applyMaterialToAll();
    });
    slider.appendChild(card);
  });
}

// ── Order modal ───────────────────────────────────────────────────────────────

function initOrderModal(product, categoryName, subcategoryName) {
  const overlay    = document.getElementById('modal-overlay');
  const btnOrder   = document.getElementById('btn-order');
  const btnCancel  = document.getElementById('btn-cancel');
  const btnConfirm = document.getElementById('btn-confirm');
  const phoneInput = document.getElementById('phone-input');

  btnOrder.addEventListener('click', () => {
    document.getElementById('modal-summary').innerHTML = `
      <strong>${product.name}</strong><br>
      ${categoryName} / ${subcategoryName}<br>
      Материал: <strong>${currentMat.label} · ${currentMat.sublabel}</strong><br>
      Цена: <strong>${product.price.toLocaleString('ru-RU')} ₽</strong>
    `;
    phoneInput.value = '';
    overlay.classList.add('open');
  });

  btnCancel.addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });

  btnConfirm.addEventListener('click', async () => {
    const phone = phoneInput.value.trim();
    if (!phone) {
      phoneInput.focus();
      phoneInput.style.borderColor = '#e74c3c';
      setTimeout(() => { phoneInput.style.borderColor = ''; }, 1500);
      return;
    }

    btnConfirm.disabled = true;
    btnConfirm.textContent = 'Отправка…';

    const payload = {
      product:     product.name,
      productId:   product.id,
      category:    categoryName,
      subcategory: subcategoryName,
      material:    `${currentMat.label} · ${currentMat.sublabel}`,
      color:       currentMat.sublabel,
      price:       product.price,
      phone,
    };

    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Server error');

      document.getElementById('modal-inner').innerHTML = `
        <div class="modal-success">
          <div class="success-icon">✅</div>
          <h3>Заказ отправлен!</h3>
          <p>Свяжемся с вами по номеру <strong>${phone}</strong> в ближайшее время.</p>
          <button class="btn-order" onclick="document.getElementById('modal-overlay').classList.remove('open')">Закрыть</button>
        </div>
      `;
    } catch (err) {
      btnConfirm.disabled = false;
      btnConfirm.textContent = 'Отправить заказ';
      alert('Ошибка отправки. Попробуйте ещё раз.');
    }
  });
}

// ── Main init ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const params    = new URLSearchParams(location.search);
  const productId = params.get('id');

  if (!productId) {
    document.querySelector('.product-page').innerHTML = '<p style="padding:40px;color:#888">Товар не найден.</p>';
    return;
  }

  await loadCatalog();
  const found = findProduct(productId);

  if (!found) {
    document.querySelector('.product-page').innerHTML = '<p style="padding:40px;color:#888">Товар не найден.</p>';
    return;
  }

  const { product, category, subcategory } = found;

  document.title = `${product.name} — 3D Store`;
  document.getElementById('p-name').textContent  = product.name;
  document.getElementById('p-path').textContent  = `${category.name} / ${subcategory.name}`;
  document.getElementById('p-desc').textContent  = product.description;
  document.getElementById('p-price').textContent = `${product.price.toLocaleString('ru-RU')} ₽`;

  initScene();
  buildMaterialSlider();
  loadModel(product.model);
  initOrderModal(product, category.name, subcategory.name);
});
