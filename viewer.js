// viewer.js — Three.js 3D viewer + material picker + order modal
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── Material presets (процедурные, без PBR текстур) ──────────────────────────

const MATERIAL_TYPES = [
  { id: 'matte',       name: 'Матовый',     roughness: 0.95, metalness: 0.0, transmission: 0.0 },
  { id: 'gloss',       name: 'Глянец',      roughness: 0.05, metalness: 0.0, transmission: 0.0 },
  { id: 'silk',        name: 'Шёлк',        roughness: 0.40, metalness: 0.0, transmission: 0.0 },
  { id: 'transparent', name: 'Прозрачный',  roughness: 0.05, metalness: 0.0, transmission: 1.0 },
];

const COLORS = [
  { name: 'Белый',     hex: '#f2f2f2' },
  { name: 'Чёрный',   hex: '#1a1a1a' },
  { name: 'Серый',     hex: '#888888' },
  { name: 'Красный',   hex: '#c0392b' },
  { name: 'Синий',     hex: '#2980b9' },
  { name: 'Зелёный',   hex: '#27ae60' },
  { name: 'Жёлтый',   hex: '#f1c40f' },
  { name: 'Оранжевый', hex: '#e67e22' },
  { name: 'Бежевый',   hex: '#d4c5a9' },
];

// ── State ────────────────────────────────────────────────────────────────────

let currentMatType = MATERIAL_TYPES[0];
let currentColor   = COLORS[0];
let meshObjects    = [];
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
  const H = W; // square
  renderer.setSize(W, H);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(0, 0.5, 2.5);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

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

  // Stop auto-rotate on user interaction
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  // Resize
  const ro = new ResizeObserver(() => {
    const w = wrap.clientWidth;
    renderer.setSize(w, w);
    camera.aspect = 1;
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
  const loader = new GLTFLoader();
  const loader_el = document.getElementById('viewer-loader');

  // Remove previous model
  meshObjects.forEach(o => scene.remove(o));
  meshObjects = [];

  loader_el.style.display = 'flex';

  loader.load(
    url,
    (gltf) => {
      const model = gltf.scene;

      // Center and scale
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.8 / maxDim;

      model.position.sub(center.multiplyScalar(scale));
      model.scale.setScalar(scale);

      // Apply material
      model.traverse(child => {
        if (child.isMesh) {
          child.material = buildMaterial();
        }
      });

      scene.add(model);
      meshObjects.push(model);
      loader_el.style.display = 'none';
    },
    undefined,
    (err) => {
      console.warn('GLB load failed, using placeholder geometry:', err);
      usePlaceholder();
      loader_el.style.display = 'none';
    }
  );
}

// Fallback — показываем сферу если модели нет
function usePlaceholder() {
  meshObjects.forEach(o => scene.remove(o));
  meshObjects = [];

  const geo  = new THREE.TorusKnotGeometry(0.6, 0.22, 128, 32);
  const mesh = new THREE.Mesh(geo, buildMaterial());
  scene.add(mesh);
  meshObjects.push(mesh);
}

// ── Material builder ─────────────────────────────────────────────────────────

function buildMaterial() {
  const color = new THREE.Color(currentColor.hex);

  if (currentMatType.id === 'transparent') {
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness:      currentMatType.roughness,
      metalness:      currentMatType.metalness,
      transmission:   1.0,
      thickness:      0.5,
      ior:            1.45,
      transparent:    true,
      opacity:        1.0,
    });
  }

  if (currentMatType.id === 'silk') {
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness:  currentMatType.roughness,
      metalness:  currentMatType.metalness,
      sheen:      0.8,
      sheenRoughness: 0.3,
      sheenColor: new THREE.Color(0xffffff),
    });
  }

  return new THREE.MeshStandardMaterial({
    color,
    roughness: currentMatType.roughness,
    metalness: currentMatType.metalness,
  });
}

function applyMaterialToAll() {
  meshObjects.forEach(obj => {
    obj.traverse(child => {
      if (child.isMesh) {
        child.material.dispose();
        child.material = buildMaterial();
      }
    });
  });
}

// ── UI: material type tabs ───────────────────────────────────────────────────

function buildMatTypeTabs() {
  const container = document.getElementById('mat-type-tabs');
  container.innerHTML = '';

  MATERIAL_TYPES.forEach(mt => {
    const btn = document.createElement('button');
    btn.className = 'mat-type-btn' + (mt.id === currentMatType.id ? ' active' : '');
    btn.textContent = mt.name;
    btn.addEventListener('click', () => {
      currentMatType = mt;
      container.querySelectorAll('.mat-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyMaterialToAll();
      updateConfigDisplay();
    });
    container.appendChild(btn);
  });
}

// ── UI: color swatches ───────────────────────────────────────────────────────

function buildColorSwatches() {
  const container = document.getElementById('color-swatches');
  container.innerHTML = '';

  COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (c.name === currentColor.name ? ' active' : '');
    sw.style.background = c.hex;
    sw.title = c.name;
    sw.setAttribute('aria-label', c.name);
    sw.setAttribute('role', 'button');
    sw.addEventListener('click', () => {
      currentColor = c;
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      applyMaterialToAll();
      updateConfigDisplay();
    });
    container.appendChild(sw);
  });
}

// ── Config display ───────────────────────────────────────────────────────────

function updateConfigDisplay() {
  document.getElementById('cfg-material').textContent = currentMatType.name;
  document.getElementById('cfg-color').textContent    = currentColor.name;
}

// ── Order modal ───────────────────────────────────────────────────────────────

function initOrderModal(product, categoryName, subcategoryName) {
  const overlay   = document.getElementById('modal-overlay');
  const btnOrder  = document.getElementById('btn-order');
  const btnCancel = document.getElementById('btn-cancel');
  const btnConfirm = document.getElementById('btn-confirm');
  const phoneInput = document.getElementById('phone-input');

  btnOrder.addEventListener('click', () => {
    // Fill summary
    document.getElementById('modal-summary').innerHTML = `
      <strong>${product.name}</strong><br>
      ${categoryName} / ${subcategoryName}<br>
      Материал: <strong>${currentMatType.name}</strong><br>
      Цвет: <strong>${currentColor.name}</strong><br>
      Цена: <strong>${product.price.toLocaleString('ru-RU')} ₽</strong>
    `;
    phoneInput.value = '';
    overlay.classList.add('open');
  });

  btnCancel.addEventListener('click', () => overlay.classList.remove('open'));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });

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
      material:    currentMatType.name,
      color:       currentColor.name,
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

      // Show success
      document.getElementById('modal-inner').innerHTML = `
        <div class="modal-success">
          <div class="success-icon">✅</div>
          <h3>Заказ отправлен!</h3>
          <p>Мы свяжемся с вами по номеру <strong>${phone}</strong> в ближайшее время.</p>
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

  // Fill info
  document.title = `${product.name} — 3D Store`;
  document.getElementById('p-name').textContent  = product.name;
  document.getElementById('p-path').textContent  = `${category.name} / ${subcategory.name}`;
  document.getElementById('p-desc').textContent  = product.description;
  document.getElementById('p-price').textContent = `${product.price.toLocaleString('ru-RU')} ₽`;

  // Init 3D
  initScene();
  buildMatTypeTabs();
  buildColorSwatches();
  updateConfigDisplay();
  loadModel(product.model);

  // Order modal
  initOrderModal(product, category.name, subcategory.name);
});
