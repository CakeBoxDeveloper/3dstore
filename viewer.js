// viewer.js — Three.js 3D viewer + combined material slider + order modal
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// ── Материалы = финиш + цвет ─────────────────────────────────────────────────
// Каждый объект — один вариант в слайдере

const MATERIALS = [
  // Матовые (PLA)
  { id: 'matte-white',       label: 'Матовый',    sublabel: 'Белый',           hex: '#f2f2f2', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-black',       label: 'Матовый',    sublabel: 'Чёрный',          hex: '#222222', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-gray',        label: 'Матовый',    sublabel: 'Серый',           hex: '#888888', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-red',         label: 'Матовый',    sublabel: 'Красный',         hex: '#c0392b', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-orange-red',  label: 'Матовый',    sublabel: 'Оранжево-красный',hex: '#c0521a', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-orange',      label: 'Матовый',    sublabel: 'Оранжевый',       hex: '#d4621a', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-yellow',      label: 'Матовый',    sublabel: 'Жёлтый',          hex: '#d4b800', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-blue',        label: 'Матовый',    sublabel: 'Синий',           hex: '#2980b9', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-green',       label: 'Матовый',    sublabel: 'Зелёный',         hex: '#27ae60', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-dark-green',  label: 'Матовый',    sublabel: 'Тёмно-зелёный',   hex: '#1a5c30', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-khaki',       label: 'Матовый',    sublabel: 'Хаки',            hex: '#556b2f', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-dark-teal',   label: 'Матовый',    sublabel: 'Тёмно-бирюзовый', hex: '#1a5c52', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-beige',       label: 'Матовый',    sublabel: 'Бежевый',         hex: '#d4c5a9', roughness: 0.95, metalness: 0, type: 'standard' },
  { id: 'matte-cream',       label: 'Матовый',    sublabel: 'Кремовый',        hex: '#f5f0e0', roughness: 0.95, metalness: 0, type: 'standard' },
  // Глянец (PETG)
  { id: 'gloss-white',       label: 'Глянец',     sublabel: 'Белый',           hex: '#f5f5f5', roughness: 0.05, metalness: 0, type: 'standard' },
  { id: 'gloss-black',       label: 'Глянец',     sublabel: 'Чёрный',          hex: '#111111', roughness: 0.05, metalness: 0, type: 'standard' },
  { id: 'gloss-red',         label: 'Глянец',     sublabel: 'Красный',         hex: '#e74c3c', roughness: 0.05, metalness: 0, type: 'standard' },
  { id: 'gloss-burgundy',    label: 'Глянец',     sublabel: 'Бордовый',        hex: '#7b1a2a', roughness: 0.05, metalness: 0, type: 'standard' },
  { id: 'gloss-blue',        label: 'Глянец',     sublabel: 'Синий',           hex: '#3498db', roughness: 0.05, metalness: 0, type: 'standard' },
  { id: 'gloss-yellow',      label: 'Глянец',     sublabel: 'Жёлтый',          hex: '#f1c40f', roughness: 0.05, metalness: 0, type: 'standard' },
  // Прозрачный (PETG-T)
  { id: 'clear',             label: 'Прозрачный', sublabel: 'Чистый',          hex: '#e8f4ff', roughness: 0.02, metalness: 0, type: 'clear' },
  { id: 'clear-smoke',       label: 'Прозрачный', sublabel: 'Дымчатый',        hex: '#555566', roughness: 0.05, metalness: 0, type: 'clear' },
  { id: 'clear-amber',       label: 'Прозрачный', sublabel: 'Янтарный',        hex: '#d4820a', roughness: 0.02, metalness: 0, type: 'clear' },
  { id: 'clear-teal',        label: 'Прозрачный', sublabel: 'Бирюза',          hex: '#1abc9c', roughness: 0.02, metalness: 0, type: 'clear' },
  // Воск (WAX) — свечные изделия без текстуры печати
  { id: 'wax-white',         label: 'Воск',       sublabel: 'Белый',           hex: '#f8f6f0', roughness: 0.55, metalness: 0, type: 'wax' },
  { id: 'wax-cream',         label: 'Воск',       sublabel: 'Кремовый',        hex: '#f3e8d2', roughness: 0.55, metalness: 0, type: 'wax' },
  { id: 'wax-honey',         label: 'Воск',       sublabel: 'Медовый / Натур', hex: '#e8b86d', roughness: 0.55, metalness: 0, type: 'wax' },
  { id: 'wax-black',         label: 'Воск',       sublabel: 'Чёрный',          hex: '#222222', roughness: 0.55, metalness: 0, type: 'wax' },
  { id: 'wax-red',           label: 'Воск',       sublabel: 'Красный',         hex: '#b82b2b', roughness: 0.55, metalness: 0, type: 'wax' },
  { id: 'wax-sage',          label: 'Воск',       sublabel: 'Шалфей / Олива',  hex: '#7d8c75', roughness: 0.55, metalness: 0, type: 'wax' },
  { id: 'wax-lavender',      label: 'Воск',       sublabel: 'Лаванда',         hex: '#a394b8', roughness: 0.55, metalness: 0, type: 'wax' },
  { id: 'wax-terracotta',    label: 'Воск',       sublabel: 'Терракот',        hex: '#c06c52', roughness: 0.55, metalness: 0, type: 'wax' },
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
  const loader_el  = document.getElementById('viewer-loader');
  const progress_el = document.getElementById('viewer-progress');
  meshObjects.forEach(o => scene.remove(o));
  meshObjects = [];
  loader_el.style.display = 'flex';
  if (progress_el) progress_el.style.width = '0%';

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  gltfLoader.load(
    url,
    (gltf) => {
      const model  = gltf.scene;

      // Шаг 1: масштабируем модель по размеру
      const box0   = new THREE.Box3().setFromObject(model);
      const size   = box0.getSize(new THREE.Vector3());
      const scale  = 1.2 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);

      // Шаг 2: пересчитываем bounding box после масштабирования и центрируем по X и Z
      const box1   = new THREE.Box3().setFromObject(model);
      const center = box1.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      // Y пока не трогаем — поставим на стол ниже

      model.traverse(c => {
        if (c.isMesh) {
          c.material      = buildMaterial();
          c.castShadow    = true;
          c.receiveShadow = true;
        }
      });

      // Шаг 3: ставим нижнюю грань модели точно на стол
      const box2   = new THREE.Box3().setFromObject(model);
      const bottom = box2.min.y;
      model.position.y += (-0.82 - bottom);
      scene.add(model);
      meshObjects.push(model);

      // controls.target — середина модели по Y, X и Z всегда 0 (модель отцентрирована)
      const box3 = new THREE.Box3().setFromObject(model);
      const midY = (box3.min.y + box3.max.y) / 2;
      controls.target.set(0, midY, 0);
      controls.update();

      if (progress_el) progress_el.style.width = '100%';
      setTimeout(() => { loader_el.style.display = 'none'; }, 150);
    },
    (xhr) => {
      if (progress_el && xhr.total) {
        progress_el.style.width = `${Math.round(xhr.loaded / xhr.total * 100)}%`;
      }
    },
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

// ── Процедурная текстура слоёв FDM (world-space шейдер) ─────────────────────
// Работает через onBeforeCompile — патчит стандартный шейдер Three.js
// Слои всегда горизонтальные в мировом пространстве, независимо от UV

function applyFDMLayer(material) {
  const LAYER_HEIGHT = 0.003; // тоньше слои
  const STRENGTH     = 0.25;  // мягче рельеф

  material.onBeforeCompile = (shader) => {
    // Передаём мировую позицию вершины во фрагментный шейдер
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vWorldPos = worldPosition.xyz;`
    );
    shader.vertexShader = 'varying vec3 vWorldPos;\n' + shader.vertexShader;

    shader.fragmentShader = 'varying vec3 vWorldPos;\n' + shader.fragmentShader;

    // Патчим нормаль в фрагментном шейдере — добавляем горизонтальную рябь
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       {
         // FDM layer lines — горизонтальная рябь по мировой Y
         float layer  = vWorldPos.y / ${LAYER_HEIGHT.toFixed(4)};
         float wave   = sin(layer * 3.14159);
         float slope  = cos(layer * 3.14159) * ${STRENGTH.toFixed(3)};
         // Добавляем наклон нормали вдоль мировой Y
         vec3 worldUp = normalize(vec3(0.0, 1.0, 0.0));
         // Проецируем на касательную плоскость
         vec3 perturb = normalize(worldUp - dot(worldUp, normal) * normal);
         normal = normalize(normal + perturb * slope);
       }`
    );
  };

  // Нужно для onBeforeCompile — material должен перекомпилироваться при смене
  material.customProgramCacheKey = () => 'fdm-layer-' + LAYER_HEIGHT + '-' + STRENGTH;
  return material;
}

const _layerTextures = null; // убрали DataTexture, используем шейдер

// ── Material builder ─────────────────────────────────────────────────────────

function buildMaterial() {
  const color = new THREE.Color(currentMat.hex);

  // Воск (WAX) — чистый полуматовый материал с мягким восковым отблеском, БЕЗ полосок FDM печати
  if (currentMat.type === 'wax') {
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.55,
      metalness: 0.0,
      clearcoat: 0.10,
      clearcoatRoughness: 0.35,
      sheen: 0.40,
      sheenColor: new THREE.Color(0xffffff),
      sheenRoughness: 0.30,
      transmission: 0.03,
      thickness: 0.25,
      ior: 1.48,
    });
  }

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
  // Матовый / глянец для 3D печати — MeshStandardMaterial с world-space FDM слоями
  return applyFDMLayer(new THREE.MeshStandardMaterial({
    color,
    roughness: currentMat.roughness,
    metalness: 0,
  }));
}

function applyMaterialToAll() {
  meshObjects.forEach(obj => {
    obj.traverse(c => {
      if (c.isMesh) { c.material.dispose(); c.material = buildMaterial(); }
    });
  });
}

// ── Material slider + fade edges ─────────────────────────────────────────────

function getMatTypeLabel(mat) {
  if (mat.type === 'wax')   return 'WAX';
  if (mat.type === 'silk')  return 'TPU';
  if (mat.type === 'clear') return 'PETG-T';
  // standard: матовый = PLA, глянец = PETG
  return mat.roughness > 0.5 ? 'PLA' : 'PETG';
}

function buildMaterialSlider(allowedColorIds = null, categoryId = null) {
  const slider = document.getElementById('material-slider');
  const wrap   = document.getElementById('slider-wrap');
  const outer  = document.getElementById('slider-outer');
  slider.innerHTML = '';

  const isWaxCat = categoryId === 'wax' || (categoryId && (categoryId.includes('wax') || categoryId.includes('свіч') || categoryId.includes('воск')));

  let list = MATERIALS;
  if (isWaxCat) {
    list = MATERIALS.filter(m => m.type === 'wax');
  }

  if (Array.isArray(allowedColorIds) && allowedColorIds.length > 0) {
    const filtered = MATERIALS.filter(m => allowedColorIds.includes(m.id));
    if (filtered.length > 0) {
      list = filtered;
    }
  }

  // Если категория Воск, гарантируем что все выбранные материалы имеют тип wax
  if (isWaxCat) {
    list = list.map(m => m.type === 'wax' ? m : { ...m, type: 'wax' });
  }

  // Выбираем первый из списка
  if (list.length > 0) {
    currentMat = list[0];
  }

  list.forEach(mat => {
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

function initFlipOrder(product, categoryName, subcategoryName) {
  const sceneEl    = document.getElementById('order-scene');
  const rotor      = document.getElementById('order-rotor');
  const faceOrder  = document.getElementById('face-order');
  const facePhone  = document.getElementById('face-phone');
  const phoneInput = document.getElementById('phone-input');
  const btnLabel   = document.getElementById('btn-order-label');
  const btnPrice   = document.getElementById('btn-order-price');

  if (btnLabel) btnLabel.textContent = 'Замовити';
  if (btnPrice) btnPrice.textContent = `за ${product.price.toLocaleString('uk-UA')} ₴`;

  // Текущее состояние: 0=заказати, 1=телефон, 2=успех
  let currentFace = 0;
  let totalAngle  = 0; // накопленный угол

  function spinTo(face) {
    // Всегда крутим вперёд к нужной грани
    const targetAngle = totalAngle + ((face - currentFace + 3) % 3) * 120;
    totalAngle  = targetAngle;
    currentFace = face;
    rotor.style.transform = `translateZ(-17px) rotateX(${totalAngle}deg)`;
  }

  function isValid(raw) {
    const d = raw.replace(/[\s\-().+]/g, '');
    return /^0\d{9}$/.test(d) || /^380\d{9}$/.test(d);
  }

  let sending = false; // блокируем двойную отправку

  faceOrder.addEventListener('click', () => {
    if (currentFace !== 0) return;
    spinTo(1);
    setTimeout(() => phoneInput.focus(), 500);
  });

  phoneInput.addEventListener('input', () => {
    if (phoneInput.value.length > 13) phoneInput.value = phoneInput.value.slice(0, 13);
    if (!sending && isValid(phoneInput.value.trim())) sendOrder();
  });

  phoneInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !sending && isValid(phoneInput.value.trim())) sendOrder();
  });

  phoneInput.addEventListener('blur', () => {
    setTimeout(() => {
      if (currentFace === 1) { spinTo(0); phoneInput.value = ''; }
    }, 200);
  });

  document.addEventListener('pointerdown', e => {
    if (!sceneEl.contains(e.target)) phoneInput.blur();
  });

  async function sendOrder() {
    if (sending) return;
    sending = true;
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
    setTimeout(() => {
      phoneInput.value = '';
      spinTo(0);
      sending = false;
    }, 4000);
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

  // ── Флип-призма навигации ────────────────────────────────────────────────
  // Собираем список всех товаров из каталога
  const allProducts = [];
  for (const cat of window.CatalogData.categories) {
    if (cat.products) {
      for (const p of cat.products) allProducts.push(p);
    }
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        if (sub.products) for (const p of sub.products) allProducts.push(p);
      }
    }
  }

  const total    = allProducts.length;

  const rotor   = document.getElementById('nav-flip-rotor');
  const labelA  = document.getElementById('nav-label-a');
  const labelB  = document.getElementById('nav-label-b');

  // Накапливаем угол — не сбрасываем, крутим в одну сторону
  let navAngle  = 0;
  let navCurIdx = allProducts.findIndex(p => p.id === product.id);
  // Какая грань сейчас видна: 0=A (angle=0,180,...), 1=B (angle=-180,-360,...)
  // A видна при чётных полуоборотах (0, -360, ...), B при нечётных (-180, -540, ...)
  let navStep   = 0; // чётный = грань A спереди, нечётный = грань B

  if (labelA) labelA.textContent = product.name;

  function navFlip(dir) {
    if (total < 2) return;

    const nextIdx  = ((navCurIdx + dir) % total + total) % total;
    const nextProd = allProducts[nextIdx];

    // Шаг вперёд — всегда -180 (вверх). Шаг назад — всегда +180 (вниз)
    navAngle += dir > 0 ? -180 : 180;
    navStep++;

    // Записываем в скрытую грань до начала анимации
    const hiddenLabel = (navStep % 2 === 1) ? labelB : labelA;
    if (hiddenLabel) hiddenLabel.textContent = nextProd.name;

    if (rotor) rotor.style.transform = `translateZ(-22px) rotateX(${navAngle}deg)`;

    navCurIdx = nextIdx;

    history.pushState({ productId: nextProd.id }, '', `?id=${nextProd.id}`);
    document.title = `${nextProd.name} — PRISM`;

    const nameEl  = document.getElementById('p-name');
    const sizesEl = document.getElementById('p-sizes');
    if (nameEl)  nameEl.textContent  = nextProd.name;
    if (sizesEl) sizesEl.textContent = nextProd.sizes || '';

    buildMaterialSlider(nextProd.colors);
    loadModel(nextProd.model);

    const btnPrice = document.getElementById('btn-order-price');
    if (btnPrice) btnPrice.textContent = `за ${nextProd.price.toLocaleString('uk-UA')} ₴`;
  }

  // Стрелки на обеих гранях
  ['nav-prev', 'nav-prev-b'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => navFlip(-1));
  });
  ['nav-next', 'nav-next-b'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => navFlip(1));
  });

  // Свайп
  const navWrap = document.getElementById('nav-flip-wrap');
  if (navWrap) {
    let touchStartY = 0;
    navWrap.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
    navWrap.addEventListener('touchend', e => {
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dy) > 30) navFlip(dy < 0 ? 1 : -1);
    });
  }

  // Кнопка: текст передаётся в PrismButton через initPrismButton
  const priceStr = product.price.toLocaleString('uk-UA') + ' ₴';

  initScene();
  buildMaterialSlider(product.colors, category ? category.id : null);
  loadModel(product.model);
  initFlipOrder(product, category.name, subcategory ? subcategory.name : '');

  const procToggle = document.getElementById('proc-toggle');
  if (procToggle) {
    procToggle.addEventListener('change', () => {
      proceduralMode = procToggle.checked;
    });
  }
});
