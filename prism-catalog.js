/**
 * prism-catalog.js
 * Стеклянная призма — материал из glass.html (transmission, dispersion, iridescence).
 * Canvas в обычном flow, pointer-events:none — кнопки HTML работают поверх.
 * За призмой — маленькая тёмная плоскость для преломления, не видна снаружи.
 */

import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const SPIN_DURATION = 700;
// Размеры из glass.html
const R = 1.15;
const H = 2.8;

function easeInOut(t) {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
}

function createPrismGeometry(r, h) {
  const S  = r * Math.sin(Math.PI / 3);
  const Tx = 0,  Tz = -r;
  const Lx = -S, Lz = r * 0.5;
  const Rx =  S, Rz = r * 0.5;
  const y0 = -h/2, y1 = h/2;

  const pos=[], nor=[], uv=[];

  function quad(ax,ay,az, bx,by,bz, cx,cy,cz, dx,dy,dz) {
    const ux=bx-ax,uy=by-ay,uz=bz-az, vx=cx-ax,vy=cy-ay,vz=cz-az;
    let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
    const l=Math.sqrt(nx*nx+ny*ny+nz*nz); nx/=l;ny/=l;nz/=l;
    pos.push(ax,ay,az,bx,by,bz,cx,cy,cz, ax,ay,az,cx,cy,cz,dx,dy,dz);
    for(let i=0;i<6;i++) nor.push(nx,ny,nz);
    uv.push(0,1,1,1,1,0, 0,1,1,0,0,0);
  }
  function tri(ax,ay,az, bx,by,bz, cx,cy,cz) {
    const ux=bx-ax,uy=by-ay,uz=bz-az, vx=cx-ax,vy=cy-ay,vz=cz-az;
    let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
    const l=Math.sqrt(nx*nx+ny*ny+nz*nz); nx/=l;ny/=l;nz/=l;
    pos.push(ax,ay,az,bx,by,bz,cx,cy,cz);
    for(let i=0;i<3;i++) nor.push(nx,ny,nz);
    uv.push(0.5,1,0,0,1,0);
  }

  quad(Tx,y1,Tz, Lx,y1,Lz, Lx,y0,Lz, Tx,y0,Tz);
  quad(Lx,y1,Lz, Rx,y1,Rz, Rx,y0,Rz, Lx,y0,Lz);
  quad(Rx,y1,Rz, Tx,y1,Tz, Tx,y0,Tz, Rx,y0,Rz);
  tri(Tx,y1,Tz, Rx,y1,Rz, Lx,y1,Lz);
  tri(Tx,y0,Tz, Lx,y0,Lz, Rx,y0,Rz);

  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('normal',  new THREE.Float32BufferAttribute(nor,3));
  geo.setAttribute('uv',      new THREE.Float32BufferAttribute(uv,2));
  return geo;
}

export class PrismCatalog {
  constructor(containerEl, categories) {
    this.container  = containerEl;
    this.categories = categories.slice(0,3);
    this.onProductClick = null;
    this._faceIndex = 0;
    this._angleY    = 0;
    this._targetY   = 0;
    this._spinning  = false;
    this._spinStart = 0;
    this._spinFrom  = 0;
    this._init();
  }

  spinNext() { this._spin(1);  }
  spinPrev() { this._spin(-1); }

  dispose() {
    this._raf && cancelAnimationFrame(this._raf);
    this._ro?.disconnect();
    this._renderer?.dispose();
  }

  _spin(dir) {
    if (this._spinning) return;
    this._faceIndex = ((this._faceIndex+dir)%3+3)%3;
    this._spinFrom  = this._angleY;
    this._targetY   = this._angleY - dir*(Math.PI*2/3);
    this._spinStart = performance.now();
    this._spinning  = true;
  }

  _init() {
    const W = this.container.clientWidth  || 460;
    const H_px = this.container.clientHeight || 500;

    // Renderer — непрозрачный (нужен для transmission/dispersion)
    this._renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    this._renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this._renderer.setSize(W, H_px);
    this._renderer.setClearColor(0x000000, 1);
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.15;

    const canvas = this._renderer.domElement;
    // pointer-events:none — HTML кнопки поверх работают
    canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none;';
    this.container.appendChild(canvas);

    this._scene  = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(38, W/H_px, 0.05, 80);
    this._camera.position.set(0, 0.15, 6.2);

    // Тёмная плоскость ЗА призмой — нужна для transmission
    // Цвет совпадает с фоном сайта (#000), размер чуть больше призмы
    // Не видна снаружи призмы — фон сайта тоже чёрный
    const bgMat  = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), bgMat);
    bgMesh.position.z = -2;
    this._scene.add(bgMesh);

    // Освещение — как в glass.html
    this._scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key  = new THREE.DirectionalLight(0xf2f6ff, 2.4); key.position.set(4,6,5);   this._scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.7);  fill.position.set(-5,1,2); this._scene.add(fill);
    const rim  = new THREE.DirectionalLight(0xffc8a0, 1.1);  rim.position.set(-3,4,-4); this._scene.add(rim);

    // HDR env
    const pmrem = new THREE.PMREMGenerator(this._renderer);
    new RGBELoader().setDataType(THREE.FloatType).load(
      'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr',
      (hdr) => {
        this._scene.environment = pmrem.fromEquirectangular(hdr).texture;
        hdr.dispose(); pmrem.dispose();
      },
      undefined, ()=>{pmrem.dispose();}
    );

    // Материал точно из glass.html
    const glassMat = new THREE.MeshPhysicalMaterial({
      color:0xffffff, metalness:0, roughness:0.04,
      transmission:1, thickness:1.8, ior:1.52,
      reflectivity:0.5, dispersion:0.55,
      iridescence:0.35, iridescenceIOR:1.4,
      iridescenceThicknessRange:[120,420],
      clearcoat:1, clearcoatRoughness:0.05,
      attenuationColor:new THREE.Color(0xdcecff),
      attenuationDistance:4.5, envMapIntensity:1.35,
    });

    this._spinner = new THREE.Group();
    this._scene.add(this._spinner);
    this._spinner.add(new THREE.Mesh(createPrismGeometry(R, H), glassMat));

    // Resize
    this._ro = new ResizeObserver(()=>{
      const w=this.container.clientWidth, h=this.container.clientHeight;
      if(!w||!h) return;
      this._camera.aspect=w/h;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(w,h);
    });
    this._ro.observe(this.container);

    this._tick();
  }

  _tick() {
    this._raf = requestAnimationFrame(()=>{
      if(this._spinning) {
        const elapsed  = performance.now()-this._spinStart;
        const progress = Math.min(elapsed/SPIN_DURATION,1);
        this._angleY   = this._spinFrom+(this._targetY-this._spinFrom)*easeInOut(progress);
        this._spinner.rotation.y = this._angleY;
        if(progress>=1) this._spinning=false;
      }
      this._renderer.render(this._scene,this._camera);
      this._tick();
    });
  }
}
