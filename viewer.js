// viewer.js — Three.js 3D viewer + combined material slider + order modal
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
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
  // Убрана — фон вьювера полностью прозрачный
  return null;
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
  renderer.setClearColor(0x000000, 0); // полностью прозрачный фон
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

  const W = wrap.clientWidth;
  renderer.setSize(W, W);

  scene = new THREE.Scene();
  // Нет фона, нет сетки — чистый прозрачный канвас
  const bg = createGridBackground();
  if (bg) scene.add(bg);

  // Стол — большая плоскость, края растворяются, принимает тени
  const tableGeo = new THREE.PlaneGeometry(12, 12);
  const tableMat = new THREE.ShaderMaterial({
    uniforms: {
      uBase:  { value: new THREE.Color(0x1a5c5c) },
      uGrid:  { value: new THREE.Color(0xffffff) },
      uScale: { value: 20.0 },
      uWidth: { value: 0.025 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
      uniform vec3 uBase;
      uniform vec3 uGrid;
      uniform float uScale;
      uniform float uWidth;
      varying vec2 vUv;
      void main() {
        vec2 g     = fract(vUv * uScale);
        float line = clamp(step(1.0-uWidth,g.x)+step(1.0-uWidth,g.y),0.0,1.0);
        vec3 col   = mix(uBase, mix(uBase,uGrid,0.28), line);
        float d    = length(vUv - 0.5) * 2.0;
        float alpha = 1.0 - smoothstep(0.45, 1.0, d);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false,
  });
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.rotation.x  = -Math.PI / 2;
  table.position.y  = -0.82;
  table.receiveShadow = true;
  scene.add(table);

  camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(0, 0.5, 2.5);

  // Освещение: источник строго сверху + равномерный ambient
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const top = new THREE.DirectionalLight(0xffffff, 1.4);
  top.position.set(1, 8, 3);
  top.castShadow = true;
  top.shadow.mapSize.width  = 2048;
  top.shadow.mapSize.height = 2048;
  top.shadow.camera.near = 0.1;
  top.shadow.camera.far  = 30;
  top.shadow.camera.left   = -5;
  top.shadow.camera.right  =  5;
  top.shadow.camera.top    =  5;
  top.shadow.camera.bottom = -5;
  top.shadow.bias           = -0.0005;
  top.shadow.normalBias     =  0.02;
  scene.add(top);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.5;
  controls.maxDistance = 10;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  controls.enablePan = false;
  // Ограничение по вертикали: сверху до горизонта (не ниже стола)
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI / 2;
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

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  gltfLoader.load(
    url,
    (gltf) => {
      const model = gltf.scene;
      const box   = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      const scale  = 1.2 / Math.max(size.x, size.y, size.z);
      model.position.sub(center.multiplyScalar(scale));
      model.scale.setScalar(scale);
      model.traverse(c => {
        if (c.isMesh) {
          c.material    = buildMaterial();
          c.castShadow  = true;
          c.receiveShadow = true;
        }
      });

      // Ставим модель на стол: нижняя точка bbox = y стола (-0.82)
      const box2   = new THREE.Box3().setFromObject(model);
      const bottom = box2.min.y;
      model.position.y += (-0.82 - bottom);
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
  mesh.castShadow    = true;
  mesh.receiveShadow = true;
  mesh.position.y    = -0.82 + 0.45; // стоит на столе
  scene.add(mesh);
  meshObjects.push(mesh);
}

// ── Material builder ─────────────────────────────────────────────────────────

function buildMaterial() {
  const color = new THREE.Color(currentMat.hex);

  if (currentMat.type === 'clear') {
    return new THREE.MeshPhysicalMaterial({
      color, roughness: 0.0, metalness: 0,
      transmission: 1.0, thickness: 0.5, ior: 1.45,
      transparent: true, opacity: 1.0,
    });
  }
  if (currentMat.type === 'silk') {
    return new THREE.MeshPhysicalMaterial({
      color, roughness: 0.4, metalness: 0,
      sheen: 0.6, sheenRoughness: 0.4,
      sheenColor: new THREE.Color(0xffffff),
    });
  }
  // Плоский без бликов — MeshLambertMaterial
  return new THREE.MeshLambertMaterial({ color });
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

// ── 3D Призма-кнопка ─────────────────────────────────────────────────────────

function initFlipOrder(product, categoryName, subcategoryName) {
  const sceneEl    = document.getElementById('order-scene');
  const rotor      = document.getElementById('order-rotor');
  const faceOrder  = document.getElementById('face-order');
  const facePhone  = document.getElementById('face-phone');
  const phoneInput = document.getElementById('phone-input');
  const btnLabel   = document.getElementById('btn-order-label');
  const btnPrice   = document.getElementById('btn-order-price');

  // Заполняем текст кнопки
  if (btnLabel) btnLabel.textContent = 'Заказати';
  if (btnPrice) btnPrice.textContent = `за ${product.price.toLocaleString('uk-UA')} ₴`;

  let base = 0;

  function spinTo(face) {
    const target = base + face * 120;
    rotor.style.transform = `translateZ(-17px) rotateX(${target}deg)`;
  }

  function isValid(raw) {
    const d = raw.replace(/[\s\-().+]/g, '');
    return /^0\d{9}$/.test(d) || /^380\d{9}$/.test(d);
  }

  faceOrder.addEventListener('click', () => {
    spinTo(1);
    setTimeout(() => phoneInput.focus(), 500);
  });

  phoneInput.addEventListener('input', () => {
    if (phoneInput.value.length > 13) phoneInput.value = phoneInput.value.slice(0, 13);
    if (isValid(phoneInput.value.trim())) sendOrder();
  });

  phoneInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && isValid(phoneInput.value.trim())) sendOrder();
  });

  phoneInput.addEventListener('blur', () => {
    setTimeout(() => {
      const match = rotor.style.transform.match(/rotateX\((-?\d+)deg\)/);
      if (match && ((parseInt(match[1]) % 360 + 360) % 360) === 120) {
        spinTo(0); phoneInput.value = '';
      }
    }, 200);
  });

  document.addEventListener('pointerdown', e => {
    if (!sceneEl.contains(e.target)) phoneInput.blur();
  });

  async function sendOrder() {
    const phone = phoneInput.value.trim();
    spinTo(2);
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
    } catch(e) { console.error(e); }
    setTimeout(() => { base += 360; spinTo(0); phoneInput.value = ''; }, 4000);
  }
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

  document.title = `${product.name} — PRISM`;
  document.getElementById('p-name').textContent = product.name;

  // Размеры рядом с названием
  const sizesEl = document.getElementById('p-sizes');
  if (sizesEl && product.sizes) sizesEl.textContent = product.sizes;

  // Кнопка "следующая модель" — находим следующий товар в той же подкатегории
  const btnNext = document.getElementById('btn-next-model');
  if (btnNext) {
    // Собираем все товары из той же категории
    const allProducts = [];
    for (const cat of window.CatalogData.categories) {
      for (const sub of cat.subcategories) {
        for (const p of sub.products) allProducts.push(p.id);
      }
    }
    const currentIdx = allProducts.indexOf(product.id);
    const nextId     = allProducts[(currentIdx + 1) % allProducts.length];
    btnNext.addEventListener('click', () => {
      location.href = `product.html?id=${nextId}`;
    });
  }

  // Кнопка: текст передаётся в PrismButton через initPrismButton
  const priceStr = product.price.toLocaleString('uk-UA') + ' ₴';

  initScene();
  buildMaterialSlider();
  loadModel(product.model);
  initFlipOrder(product, category.name, subcategory.name);

  const procToggle = document.getElementById('proc-toggle');
  if (procToggle) {
    procToggle.addEventListener('change', () => {
      proceduralMode = procToggle.checked;
    });
  }
});
