// Air's scroll-linked sculpture. Geometry and lighting are prepared offline; visits do no font extrusion or HDR filtering.
import { BufferAttribute, BufferGeometry, CanvasTexture, CubeUVReflectionMapping, DirectionalLight, Group, LinearFilter, LinearSRGBColorSpace, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, NeutralToneMapping, PerspectiveCamera, PlaneGeometry, Scene, SRGBColorSpace, TextureLoader, WebGLRenderer } from 'three';

export type GlassOptions = {
  geometry: string;
  sky: string;
  fill: number;
  progressEl?: HTMLElement;
  still?: boolean;
  poster?: boolean;
};
type Span = { offset: number; length: number };
type BakedGeometry = {
  scale: number; width: number; height: number;
  meshes: { name: string; positions: Span; normals: Span & { type?: string }; indices: Span & { type: 'uint16' | 'uint32' } }[];
};
const clamp = (n: number) => Math.min(1, Math.max(0, n));

export async function mountGlassName(canvas: HTMLCanvasElement, o: GlassOptions) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.transmissionResolutionScale = 0.5;
  renderer.toneMapping = NeutralToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.z = 12;
  const loader = new TextureLoader();
  const [meta, bytes, lighting, skyPhoto] = await Promise.all([
    fetch(`${o.geometry}.json`).then(r => { if (!r.ok) throw new Error('Glass metadata unavailable'); return r.json(); }) as Promise<BakedGeometry>,
    fetch(`${o.geometry}.bin`).then(r => { if (!r.ok) throw new Error('Glass geometry unavailable'); return r.arrayBuffer(); }),
    loader.loadAsync('/3d/glass-light-v2.png'),
    loader.loadAsync(o.sky),
  ]);
  // This is already a CubeUV PMREM atlas, with linear radiance divided by 8 for compact PNG storage.
  lighting.mapping = CubeUVReflectionMapping;
  lighting.colorSpace = LinearSRGBColorSpace;
  lighting.flipY = false;
  lighting.minFilter = LinearFilter;
  lighting.magFilter = LinearFilter;
  lighting.generateMipmaps = false;
  scene.environment = lighting;

  const material = new MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.025, metalness: 0, transmission: 1, thickness: 1.2, ior: 1.5, clearcoat: 0.35, clearcoatRoughness: 0.02, envMapIntensity: 8, dispersion: 0.12, attenuationColor: 0xb0d0e0, attenuationDistance: 20 });
  const descriptorMaterial = material.clone();
  descriptorMaterial.thickness = 0.2;
  descriptorMaterial.transmission = .75;
  descriptorMaterial.color.set(0x80a8bc);
  const pivot = new Group();
  let descriptor: Mesh | undefined;
  for (const mesh of meta.meshes) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Int16Array(bytes, mesh.positions.offset, mesh.positions.length), 3, true));
    geometry.setAttribute('normal', new BufferAttribute(new Int16Array(bytes, mesh.normals.offset, mesh.normals.length), 3, true));
    geometry.setIndex(new BufferAttribute(mesh.indices.type === 'uint16'
      ? new Uint16Array(bytes, mesh.indices.offset, mesh.indices.length)
      : new Uint32Array(bytes, mesh.indices.offset, mesh.indices.length), 1));
    const object = new Mesh(geometry, mesh.name === 'descriptor' ? descriptorMaterial : material);
    object.scale.setScalar(meta.scale);
    if (mesh.name === 'descriptor') descriptor = object;
    pivot.add(object);
  }
  scene.add(pivot);
  const sun = new DirectionalLight(0xffffff, 2.5);
  sun.position.set(-4, 6, 7);
  const rim = new DirectionalLight(0xc9f1ff, 2);
  rim.position.set(4, 2, -5);
  scene.add(sun, rim);

  // A photographic sky is present only in the transmission pass; the final art canvas stays transparent.
  const paintedSky = document.createElement('canvas');
  const aspect = (canvas.clientWidth || innerWidth) / (canvas.clientHeight || innerHeight);
  paintedSky.width = aspect >= 1 ? 1024 : Math.round(1024 * aspect);
  paintedSky.height = aspect >= 1 ? Math.round(1024 / aspect) : 1024;
  const paint = paintedSky.getContext('2d')!;
  const dawn = paint.createLinearGradient(0, 0, 0, paintedSky.height);
  for (const [stop, color] of [[0, '#90bad7'], [.2, '#b3d4e7'], [.44, '#bfd2d3'], [.66, '#d2d2bf'], [.84, '#e3d2ad'], [1, '#f5d6a2']] as [number, string][]) dawn.addColorStop(stop, color); // token-exempt: Canvas counterpart of --dawn-gradient
  paint.fillStyle = dawn;
  paint.fillRect(0, 0, paintedSky.width, paintedSky.height);
  const clouds = document.createElement('canvas');
  clouds.width = paintedSky.width;
  clouds.height = paintedSky.height;
  const cloudPaint = clouds.getContext('2d')!;
  const photo = skyPhoto.image;
  const scale = Math.max(clouds.width / photo.width, clouds.height / photo.height);
  cloudPaint.drawImage(photo, (clouds.width - photo.width * scale) / 2, (clouds.height - photo.height * scale) / 2, photo.width * scale, photo.height * scale);
  cloudPaint.globalCompositeOperation = 'destination-in';
  const fade = cloudPaint.createLinearGradient(0, 0, 0, clouds.height);
  fade.addColorStop(0, 'white');
  fade.addColorStop(.38, 'white');
  fade.addColorStop(.95, 'transparent');
  cloudPaint.fillStyle = fade;
  cloudPaint.fillRect(0, 0, clouds.width, clouds.height);
  paint.globalCompositeOperation = 'screen';
  paint.globalAlpha = .7;
  paint.drawImage(clouds, 0, 0);
  const skyTexture = new CanvasTexture(paintedSky);
  skyTexture.colorSpace = SRGBColorSpace;
  skyPhoto.dispose();
  const sky = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: skyTexture, toneMapped: false, depthWrite: false }));
  sky.position.z = -12;
  sky.onBeforeRender = () => { sky.material.colorWrite = renderer.getRenderTarget() !== null; };
  scene.add(sky);

  let w = 1, h = 1, viewHeight = 1, baseScale = 1;
  const resize = () => {
    w = canvas.clientWidth || innerWidth;
    h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    viewHeight = 2 * Math.tan(camera.fov * Math.PI / 360) * camera.position.z;
    baseScale = viewHeight * camera.aspect * o.fill / meta.width;
    const backdropH = 2 * Math.tan(camera.fov * Math.PI / 360) * (camera.position.z - sky.position.z);
    sky.scale.set(backdropH * camera.aspect, backdropH, 1);
  };
  const progress = () => o.still ? 0 : clamp(Number(o.progressEl?.style.getPropertyValue('--air-p')) || 0);
  let lastP = -1;
  const draw = () => {
    const p = progress();
    lastP = p;
    const targetWidth = Number(o.progressEl?.style.getPropertyValue('--air-brand-width')) || 160;
    const targetX = Number(o.progressEl?.style.getPropertyValue('--air-brand-x')) || w / 2;
    const endScale = Math.min(.5, targetWidth / (w * o.fill));
    const scale = Math.exp(Math.log(endScale) * p);
    const travel = 1 - Math.pow(1 - p, 2);
    const startY = w <= 700 ? h * .56 : h * .62;
    const screenY = startY + (36 - startY) * travel;
    const lateral = 1 - Math.pow(1 - clamp((p - .45) / .35), 3);
    const screenX = w / 2 + (targetX - w / 2) * lateral;
    pivot.position.x = (screenX / w - .5) * viewHeight * camera.aspect;
    pivot.scale.setScalar(baseScale * scale);
    pivot.position.y = (.5 - screenY / h) * viewHeight;
    pivot.rotation.set(-.06 + Math.sin(p * Math.PI) * -.15, p * Math.PI * 2, Math.sin(p * Math.PI) * -.025);
    if (descriptor) descriptor.visible = o.poster || p < .58;
    renderer.render(scene, camera);
  };
  let frame = 0;
  let paused = false;
  let stopped = false;
  const schedule = () => {
    if (frame || paused || stopped || document.hidden || (progress() === 1 && lastP === 1)) return;
    frame = requestAnimationFrame(() => { frame = 0; draw(); });
  };
  const onResize = () => { lastP = -1; resize(); schedule(); };
  resize();
  await renderer.compileAsync(scene, camera);
  draw();
  if (!o.still) {
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', schedule);
  }
  return {
    pause: () => { paused = true; },
    resume: () => { paused = false; schedule(); },
    stop: () => { stopped = true; cancelAnimationFrame(frame); },
    render: schedule,
    renderer, scene, camera, pivot,
  };
}
