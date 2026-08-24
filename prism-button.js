/**
 * prism-button.js
 * Кнопка с голографическим шейдером на Three.js canvas.
 * Три состояния: 0=Заказати, 1=телефон, 2=успех
 * Текст рисуется через Canvas2D → WebGL texture
 */

const VERT = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
  vUv        = uv;
  vNormal    = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPos   = -mvPos.xyz;
  gl_Position = projectionMatrix * mvPos;
}
`;

const FRAG = `
uniform float uTime;
uniform float uAlpha;
uniform sampler2D uTex;
uniform float uAspect;  // W/H

varying vec2 vUv;

vec3 hue2rgb(float h) {
  h = mod(h, 1.0);
  vec3 c = abs(fract(h + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
  return clamp(c - 1.0, 0.0, 1.0);
}

void main() {
  // Расстояние от края с учётом aspect ratio
  // Нормализуем X на aspect чтобы порог был одинаковым в пикселях
  vec2 fromEdge = min(vUv, 1.0 - vUv);
  fromEdge.x *= uAspect;          // X-дистанция в "квадратных" единицах
  float edgePx  = 0.12;           // ширина радуги = 12% высоты кнопки
  float edgeDist = min(fromEdge.x, fromEdge.y * uAspect);
  float rim = 1.0 - smoothstep(0.0, edgePx * uAspect, edgeDist);

  // Радуга по краям
  float hue = mod(vUv.x * 0.5 + vUv.y * 0.3 + uTime * 0.1, 1.0);
  vec3 rainbow = hue2rgb(hue);

  // Тёмная основа
  vec3 base = vec3(0.07, 0.08, 0.11);
  vec3 col  = mix(base, rainbow, rim * 0.88);

  // Тонкая белая обводка по самому краю
  float border = 1.0 - smoothstep(0.0, edgePx * 0.25 * uAspect, edgeDist);
  col = mix(col, vec3(0.85), border * 0.45);

  // Текст
  vec4 tex = texture2D(uTex, vUv);
  col = mix(col, tex.rgb, tex.a * uAlpha);

  gl_FragColor = vec4(col, 1.0);
}
`;

import * as THREE from 'three';

export class PrismButton {
  constructor(container, { onFace0, onPhoneInput, onPhoneEnter } = {}) {
    this.container   = container;
    this.face        = 0;
    this.baseAngle   = 0;
    this.animAngle   = 0;
    this.targetAngle = 0;
    this.spinning    = false;
    this.texts       = ['', '', ''];
    this.onFace0     = onFace0;
    this.onPhoneInput = onPhoneInput;
    this.onPhoneEnter = onPhoneEnter;
    this._build();
    this._loop();
  }

  // ── Публичное API ──────────────────────────────────────────────────────────

  setFace0Text(line1, line2) {
    this.texts[0] = { line1, line2 };
    this._rebuildTex(0);
  }

  spinTo(face) {
    this.face        = face;
    this.baseAngle   = Math.round(this.baseAngle / 360) * 360 + face * 120;
    this.targetAngle = this.baseAngle;
    this.spinning    = true;
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  _build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W   = this.container.clientWidth  || 460;
    const H   = this.container.clientHeight || 52;

    // WebGL canvas
    this.canvas          = document.createElement('canvas');
    this.canvas.width    = W * dpr;
    this.canvas.height   = H * dpr;
    this.canvas.style.cssText = `
      position:absolute; inset:0;
      width:100%; height:100%;
      border-radius:4px; display:block; cursor:pointer;
    `;
    this.container.style.position = 'relative';
    this.container.appendChild(this.canvas);

    // Input для телефона
    this.phoneInput = document.createElement('input');
    this.phoneInput.type        = 'tel';
    this.phoneInput.inputMode   = 'tel';
    this.phoneInput.placeholder = '+380XXXXXXXXX';
    this.phoneInput.autocomplete = 'tel';
    this.phoneInput.style.cssText = `
      position:absolute; inset:0; width:100%; height:100%;
      background:transparent; border:none; outline:none;
      color:#fff; font-size:16px; font-family:inherit;
      text-align:center; letter-spacing:0.04em; display:none; z-index:10;
      padding:0;
    `;
    this.container.appendChild(this.phoneInput);

    // Three.js
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(W, H);

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, W / H, 0.01, 10);
    this.camera.position.z = 2.2;

    // Текстуры для трёх граней
    this.glTextures = [null, null, null];
    this._initTextures();

    // Шейдерный материал
    this.mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:  { value: 0 },
        uAlpha: { value: 1 },
        uTex:   { value: null }, // заполнится после _initTextures
      },
    });

    // Плоскость — размером на весь экран камеры
    const aspect = W / H;
    const planeH = 2 * Math.tan((35 * Math.PI / 180) / 2) * 2.2;
    const planeW = planeH * aspect;
    const geo    = new THREE.PlaneGeometry(planeW, planeH);
    this.mesh    = new THREE.Mesh(geo, this.mat);
    this.scene.add(this.mesh);

    // Начальное состояние — грань 0, текст сразу виден
    this.mat.uniforms.uTex.value   = this.glTextures[0];
    this.mat.uniforms.uAlpha.value = 1;

    // Клик
    this.canvas.addEventListener('click', () => this._onClick());
    this.phoneInput.addEventListener('input', () => {
      if (this.phoneInput.value.length > 13) this.phoneInput.value = this.phoneInput.value.slice(0, 13);
      if (this.onPhoneInput) this.onPhoneInput(this.phoneInput.value);
    });
    this.phoneInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && this.onPhoneEnter) this.onPhoneEnter(this.phoneInput.value);
    });
    this.phoneInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (this.face === 1) { this.spinTo(0); this.phoneInput.value = ''; }
      }, 200);
    });
    document.addEventListener('pointerdown', e => {
      if (!this.container.contains(e.target)) this.phoneInput.blur();
    });

    window.addEventListener('resize', () => this._onResize());
  }

  _initTextures() {
    ['', '', ''].forEach((_, i) => this._rebuildTex(i));
  }

  _rebuildTex(i) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    const cv  = document.createElement('canvas');
    cv.width  = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#fff';

    const fs = Math.round(14 * dpr);

    if (i === 0) {
      const t = this.texts[0];
      if (t && t.line1) {
        ctx.font = `700 ${fs}px system-ui,sans-serif`;
        if (t.line2) {
          ctx.fillText(t.line1, W/2, H/2 - fs * 0.55);
          ctx.font = `400 ${Math.round(11*dpr)}px system-ui,sans-serif`;
          ctx.fillStyle = 'rgba(200,240,160,0.9)';
          ctx.fillText(t.line2, W/2, H/2 + fs * 0.6);
        } else {
          ctx.fillText(t.line1, W/2, H/2);
        }
      } else {
        ctx.font = `700 ${fs}px system-ui,sans-serif`;
        ctx.fillText('Заказати', W/2, H/2);
      }
    } else if (i === 1) {
      ctx.font      = `400 ${fs}px system-ui,sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('+380XXXXXXXXX', W/2, H/2);
    } else {
      ctx.font      = `600 ${fs}px system-ui,sans-serif`;
      ctx.fillStyle = 'rgba(168,240,192,0.95)';
      ctx.fillText('Заявка прийнята!', W/2, H/2);
    }

    const gl  = this.renderer.getContext();
    if (!gl) return;
    const tex = new THREE.CanvasTexture(cv);
    if (this.glTextures[i]) this.glTextures[i].dispose();
    this.glTextures[i] = tex;
  }

  // ── Loop ───────────────────────────────────────────────────────────────────

  _loop() {
    const tick = (t) => {
      requestAnimationFrame(tick);
      const ts = t * 0.001;

      // Анимация поворота (плоскость вращается вокруг X — визуально)
      if (this.spinning) {
        const diff = this.targetAngle - this.animAngle;
        this.animAngle += diff * 0.14;
        if (Math.abs(diff) < 0.15) {
          this.animAngle = this.targetAngle;
          this.spinning  = false;
          const f = ((Math.round(this.animAngle) % 360) + 360) % 360 / 120;
          this.mat.uniforms.uTex.value  = this.glTextures[f] || this.glTextures[0];
          this.mat.uniforms.uAlpha.value = 1;
          this.phoneInput.style.display = (this.face === 1) ? 'block' : 'none';
          if (this.face === 1) setTimeout(() => this.phoneInput.focus(), 50);
        } else {
          this.mat.uniforms.uAlpha.value = 0.0; // скрываем текст во время вращения
        }

        // Наклоняем плоскость для имитации вращения призмы
        this.mesh.rotation.x = (this.animAngle * Math.PI / 180) * 0.3;
      }

      this.mat.uniforms.uTime.value = ts;
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(tick);
  }

  _onClick() {
    if (this.face === 0 && this.onFace0) this.onFace0();
  }

  _onResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W   = this.container.clientWidth;
    const H   = this.container.clientHeight || 52;
    this.renderer.setSize(W, H);
    this.canvas.style.width  = W + 'px';
    this.canvas.style.height = H + 'px';
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this._initTextures();
  }
}
