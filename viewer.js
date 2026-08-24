// viewer.js — Three.js 3D viewer + combined material slider + order modal
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

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

// По умолчанию — средний материал в списке
let currentMat = MATERIALS[Math.floor(MATERIALS.length / 2)];
let meshObjects = [];
let proceduralMode = false;
let scene, camera, renderer, controls;

// ── Grid background (ShaderMaterial) ─────────────────────────────────────────

function createGridBackground() {
  const geo = new THREE.PlaneGeometry(20, 20);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor1: { value: new THREE.Color(0x111418) }, // тёмный фон
      uColor2: { value: new THREE.Color(0x303840) }, // заметные линии
      uScale:  { value: 14.0 },
      uWidth:  { value: 0.03 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uScale;
      uniform float uWidth;
      varying vec2 vUv;
      void main() {
        vec2 grid = fract(vUv * uScale);
        float line = step(1.0 - uWidth, grid.x) + step(1.0 - uWidth, grid.y);
        line = clamp(line, 0.0, 1.0);
        vec3 col = mix(uColor1, uColor2, line);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = -3.5;
  mesh.renderOrder = -1;
  return mesh;
}

// ── HDR environment ───────────────────────────────────────────────────────────

function loadHDR() {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  new RGBELoader()
    .setDataType(THREE.FloatType)
    .load(
      'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr',
      (hdrTex) => {
        const envMap = pmrem.fromEquirectangular(hdrTex).texture;
        scene.environment = envMap;
        hdrTex.dispose();
        pmrem.dispose();
      },
      undefined,
      () => { /* fallback — без HDR, просто lights */ }
    );
}

// ── Init scene ───────────────────────────────────────────────────────────────

function initScene() {
  const canvas = document.getElementById('viewer-canvas');
  const wrap   = canvas.parentElement;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0); // прозрачный фон — видна только сетка
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const W = wrap.clientWidth;
  renderer.setSize(W, W);

  scene = new THREE.Scene();
  // Фон — только сетка, без scene.background
  scene.add(createGridBackground());

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
  controls.enablePan = false;   // запрет перемещения
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
      const scale  = 1.2 / Math.max(size.x, size.y, size.z);
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
    new THREE.TorusKnotGeometry(0.45, 0.16, 128, 32),
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

// ── Material slider + fade edges ─────────────────────────────────────────────

// Типы материалов для подписи на чипе
const MAT_TYPE_LABEL = {
  'standard': { roughness_hi: 'PLA',  roughness_lo: 'PETG' },
  'silk':     'TPU',
  'clear':    'PETG-T',
};

function getMatTypeLabel(mat) {
  if (mat.type === 'silk')  return 'TPU';
  if (mat.type === 'clear') return 'PETG-T';
  // standard: матовый = PLA, глянец = PETG
  return mat.roughness > 0.5 ? 'PLA' : 'PETG';
}

function buildMaterialSlider() {
  const slider = document.getElementById('material-slider');
  const wrap   = document.getElementById('slider-wrap');
  const outer  = document.getElementById('slider-outer');
  slider.innerHTML = '';

  MATERIALS.forEach(mat => {
    const card = document.createElement('button');
    card.className = 'mat-chip' + (mat.id === currentMat.id ? ' active' : '');
    card.setAttribute('aria-label', `${mat.label} ${mat.sublabel}`);
    // Новый стиль: сплошной цвет + подпись типа по центру
    card.innerHTML = `
      <span class="mat-chip-color" style="background:${mat.hex}">
        <span class="mat-chip-type">${getMatTypeLabel(mat)}</span>
      </span>
    `;
    card.addEventListener('click', () => {
      currentMat = mat;
      slider.querySelectorAll('.mat-chip').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      applyMaterialToAll();
    });
    slider.appendChild(card);
  });

  function updateFade() {
    const { scrollLeft, scrollWidth, clientWidth } = wrap;
    outer.classList.toggle('at-start', scrollLeft < 8);
    outer.classList.toggle('at-end',   scrollLeft + clientWidth >= scrollWidth - 8);
  }

  wrap.addEventListener('scroll', updateFade, { passive: true });
  requestAnimationFrame(() => {
    const mid = (wrap.scrollWidth - wrap.clientWidth) / 2;
    wrap.scrollLeft = mid;
    updateFade();
  });
}

// ── Валидация украинского номера ─────────────────────────────────────────────
function isValidUAPhone(raw) {
  const digits = raw.replace(/[\s\-().+]/g, '');
  // 10 цифр с 0, или 12 с 380 — жёсткий лимит символов
  return /^0\d{9}$/.test(digits) || /^380\d{9}$/.test(digits);
}

// ── WebGL GlassButton ─────────────────────────────────────────────────────────

async function initGlassButton(product, categoryName, subcategoryName) {
  const { GlassButton } = await import('./button-gl.js');

  const container = document.getElementById('order-btn-container');
  if (!container) return;

  const priceStr = product.price.toLocaleString('uk-UA') + ' ₴';

  const btn = new GlassButton(container, {
    onPhoneSubmit: async (phone) => {
      btn.goToSuccess();
      try {
        await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: product.name, productId: product.id,
            category: categoryName, subcategory: subcategoryName,
            material: `${currentMat.label} · ${currentMat.sublabel}`,
            color: currentMat.sublabel, price: product.price, phone,
            procedural: proceduralMode,
          }),
        });
      } catch (e) { console.error(e); }
      setTimeout(() => btn.goToOrder(), 4000);
    }
  });

  btn.setLabel('Заказати', `за ${priceStr}`);
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
  document.getElementById('p-name').textContent = product.name;

  // Размеры рядом с названием
  const sizesEl = document.getElementById('p-sizes');
  if (sizesEl && product.sizes) sizesEl.textContent = product.sizes;

  // Кнопка: "Заказати" + "за *цена* ₴"
  const priceStr = product.price.toLocaleString('uk-UA') + ' ₴';
  const btnLabel = document.getElementById('btn-order-label');
  const btnPrice = document.getElementById('btn-order-price');
  if (btnLabel) btnLabel.textContent = 'Заказати';
  if (btnPrice) btnPrice.textContent = `за ${priceStr}`;

  initScene();
  loadHDR();
  buildMaterialSlider();
  loadModel(product.model);
  initGlassButton(product, category.name, subcategory.name);

  const procToggle = document.getElementById('proc-toggle');
  if (procToggle) {
    procToggle.addEventListener('change', () => {
      proceduralMode = procToggle.checked;
    });
  }
});
