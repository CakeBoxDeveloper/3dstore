/**
 * button-gl.js
 * WebGL-кнопка на отдельном canvas с настоящим дисперсионным шейдером.
 * Три состояния (грани призмы) переключаются анимацией rotateX.
 * Текст рисуется через CanvasTexture поверх.
 *
 * Использование:
 *   const btn = new GlassButton(containerEl, { onFace0Click, onPhoneSubmit });
 *   btn.setState(0|1|2);
 *   btn.setLabel('Заказати', 'за 600 ₴');
 */

export class GlassButton {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    // Текущая грань: 0=заказати, 1=телефон, 2=успех
    this.faceIndex  = 0;
    this.baseAngle  = 0;    // накапливается для прокрутки вперёд
    this.animAngle  = 0;    // текущий анимируемый угол
    this.targetAngle = 0;
    this.animating  = false;

    this.label1 = 'Заказати';
    this.label2 = 'за ? ₴';
    this.phone  = '';

    this._build();
    this._animate();
  }

  // ── Публичный API ──────────────────────────────────────────────────────────

  setLabel(top, sub) {
    this.label1 = top;
    this.label2 = sub;
    this._updateTexture(0);
  }

  setState(face) {
    if (face === this.faceIndex) return;
    this.faceIndex   = face;
    this.baseAngle  += 120;
    this.targetAngle = this.baseAngle;
    this.animating   = true;
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  _build() {
    const W = this.container.clientWidth || 460;
    const H = 52;

    // WebGL canvas (рендер шейдера)
    this.glCanvas = document.createElement('canvas');
    this.glCanvas.width  = W * (window.devicePixelRatio || 1);
    this.glCanvas.height = H * (window.devicePixelRatio || 1);
    this.glCanvas.style.cssText = `
      position:absolute; inset:0;
      width:100%; height:100%;
      border-radius:4px;
      display:block;
    `;

    // Контейнер
    this.container.style.position = 'relative';
    this.container.style.height   = H + 'px';
    this.container.style.cursor   = 'pointer';
    this.container.appendChild(this.glCanvas);

    // Поле ввода телефона (поверх canvas, скрыто по умолчанию)
    this.phoneInput = document.createElement('input');
    this.phoneInput.type        = 'tel';
    this.phoneInput.inputMode   = 'tel';
    this.phoneInput.autocomplete = 'tel';
    this.phoneInput.placeholder = '+380XXXXXXXXX';
    this.phoneInput.style.cssText = `
      position:absolute; inset:0;
      width:100%; height:100%;
      background:transparent; border:none; outline:none;
      color:#fff; font-size:16px; font-family:inherit;
      text-align:center; letter-spacing:0.04em;
      padding:0 16px; display:none; z-index:10;
    `;
    this.container.appendChild(this.phoneInput);

    // Инициализируем WebGL
    this._initGL();

    // Создаём текстуры для трёх граней
    this.textures = [
      this._makeTexture(0),
      this._makeTexture(1),
      this._makeTexture(2),
    ];

    // События
    this.container.addEventListener('click', () => this._onClick());
    this.phoneInput.addEventListener('input', () => this._onPhoneInput());
    this.phoneInput.addEventListener('keydown', e => { if (e.key === 'Enter') this._onPhoneInput(true); });

    // Потеря фокуса → вернуться на грань 0
    this.phoneInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (this.faceIndex === 1) {
          this.setState(0);
          this.phone = '';
          this.phoneInput.value = '';
        }
      }, 200);
    });

    document.addEventListener('pointerdown', e => {
      if (!this.container.contains(e.target)) this.phoneInput.blur();
    });
  }

  // ── WebGL init ─────────────────────────────────────────────────────────────

  _initGL() {
    const gl = this.glCanvas.getContext('webgl2') ||
               this.glCanvas.getContext('webgl');
    if (!gl) return;
    this.gl = gl;

    // Полноэкранный квад
    const verts = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    // Шейдеры
    const vert = `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main() {
        vUv = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    // Фрагментный шейдер:
    // - Тёмный центр (почти чёрный)
    // - По краям дисперсия: сдвиг RGB зависит от расстояния от края + времени
    // - Белая тонкая каёмка по самому краю (имитация стекла)
    // - Поверх — текстура с надписью (alpha blending)
    const frag = `
      precision highp float;
      varying vec2 vUv;

      uniform float uTime;
      uniform float uAspect;   // W/H
      uniform sampler2D uTex;  // текстура с текстом
      uniform float uAlpha;    // прозрачность текстуры при переходе

      // Расстояние от ближайшего края (в UV, учитывая aspect)
      float edgeDist(vec2 uv) {
        vec2 d = min(uv, 1.0 - uv);
        // горизонтальный край ближе из-за aspect ratio
        d.x *= 1.0 / uAspect;
        return min(d.x, d.y);
      }

      // HSV → RGB
      vec3 hsv(float h, float s, float v) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(vec3(h) + K.xyz) * 6.0 - K.www);
        return v * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), s);
      }

      void main() {
        vec2 uv = vUv;
        float ed = edgeDist(uv);           // 0 = край, 0.5 = центр
        float rim = smoothstep(0.12, 0.0, ed);  // только ≤12% от края
        float vignette = smoothstep(0.0, 0.08, ed); // тёмный центр

        // Дисперсия: каждый цветовой канал сдвигается чуть по-разному
        float speed  = uTime * 0.18;
        float hue    = mod(speed + ed * 2.0, 1.0);  // радуга бежит от края к центру
        vec3  rainbow = hsv(hue, 1.0, 1.0);

        // Тёмная основа (почти чёрное стекло)
        vec3 base = vec3(0.02, 0.03, 0.06);

        // Дисперсионный блик по краям
        vec3 col = mix(base, rainbow, rim * 0.9);

        // Тонкая белая каёмка (край стекла)
        float border = smoothstep(0.015, 0.0, ed);
        col = mix(col, vec3(1.0), border * 0.35);

        // Текстура с надписью поверх
        vec4 texColor = texture2D(uTex, uv);
        col = mix(col, texColor.rgb, texColor.a * uAlpha);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const prog = this._compileProgram(vert, frag);
    if (!prog) return;
    this.prog = prog;

    gl.useProgram(prog);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this.uTime   = gl.getUniformLocation(prog, 'uTime');
    this.uAspect = gl.getUniformLocation(prog, 'uAspect');
    this.uTex    = gl.getUniformLocation(prog, 'uTex');
    this.uAlpha  = gl.getUniformLocation(prog, 'uAlpha');

    // WebGL текстуры для трёх граней (заполним позже)
    this.glTextures = [null, null, null];
  }

  _compileProgram(vsrc, fsrc) {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsrc);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('VS:', gl.getShaderInfoLog(vs)); return null;
    }
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsrc);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('FS:', gl.getShaderInfoLog(fs)); return null;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    return prog;
  }

  // ── Canvas2D текстуры с текстом ────────────────────────────────────────────

  _makeTexture(faceIdx) {
    const dpr = window.devicePixelRatio || 1;
    const W   = this.glCanvas.width;   // уже с DPR
    const H   = this.glCanvas.height;
    const c   = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const fs = Math.round(14 * dpr);

    if (faceIdx === 0) {
      ctx.font = `700 ${fs}px system-ui, sans-serif`;
      ctx.fillText(this.label1 + '  ' + this.label2, W/2, H/2);
    } else if (faceIdx === 1) {
      ctx.font = `400 ${fs}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText('+380XXXXXXXXX', W/2, H/2);
    } else {
      ctx.font = `600 ${fs}px system-ui, sans-serif`;
      ctx.fillStyle = '#a8f0c0';
      ctx.fillText('Заявка прийнята!', W/2, H/2);
    }

    // Создаём WebGL текстуру
    if (this.gl) {
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.glTextures[faceIdx] = tex;
    }
    return c;
  }

  _updateTexture(faceIdx) {
    // Перерисовываем текстуру для грани 0 (когда меняется текст кнопки)
    this._makeTexture(faceIdx);
  }

  // ── Render loop ────────────────────────────────────────────────────────────

  _animate() {
    const gl   = this.gl;
    const prog = this.prog;

    const loop = (time) => {
      requestAnimationFrame(loop);
      if (!gl || !prog) return;

      // Анимация угла
      if (this.animating) {
        const diff = this.targetAngle - this.animAngle;
        this.animAngle += diff * 0.12;
        if (Math.abs(diff) < 0.2) {
          this.animAngle = this.targetAngle;
          this.animating = false;
          // Показать/скрыть поле ввода
          this.phoneInput.style.display = (this.faceIndex === 1) ? 'block' : 'none';
          if (this.faceIndex === 1) setTimeout(() => this.phoneInput.focus(), 50);
        }
      }

      // Определяем какую грань показывать (текущий угол)
      const normalised = ((Math.round(this.animAngle) % 360) + 360) % 360;
      const showFace   = Math.round(normalised / 120) % 3;

      // alpha текстуры — полная когда анимация завершена
      const alpha = this.animating ? 0.0 : 1.0;

      gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
      gl.useProgram(prog);

      // Aspect ratio (W/H)
      const aspect = this.glCanvas.width / this.glCanvas.height;
      gl.uniform1f(this.uTime,   time * 0.001);
      gl.uniform1f(this.uAspect, aspect);
      gl.uniform1f(this.uAlpha,  alpha);
      gl.uniform1i(this.uTex, 0);

      // Биндим текстуру нужной грани
      const glTex = this.glTextures[showFace];
      if (glTex) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glTex);
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    requestAnimationFrame(loop);
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  _onClick() {
    if (this.faceIndex === 0) {
      this.setState(1);
    }
  }

  _onPhoneInput(force = false) {
    const val = this.phoneInput.value;
    if (val.length > 13) this.phoneInput.value = val.slice(0, 13);
    const digits = this.phoneInput.value.replace(/[\s\-().+]/g, '');
    const valid  = /^0\d{9}$/.test(digits) || /^380\d{9}$/.test(digits);
    if (valid || force) {
      this.phone = this.phoneInput.value.trim();
      if (this.callbacks.onPhoneSubmit) this.callbacks.onPhoneSubmit(this.phone);
    }
  }

  goToSuccess() { this.setState(2); }
  goToOrder()   { this.baseAngle += 360; this.targetAngle = this.baseAngle; this.animating = true; this.faceIndex = 0; }
}
