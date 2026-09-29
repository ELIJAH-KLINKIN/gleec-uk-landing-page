// studio.js — the shared set for every product card's art: renderer, studio
// reflections, lights, materials and soft contact shadows, so the images read as
// one family. Each card's page (coins.html, ibans.html…) adds its objects and
// calls finish(camera). Rendered offline by render.mjs; nothing here ships.
import * as THREE from "three";

export { THREE };

const params = new URLSearchParams(location.search);
export const W = Number(params.get("w") || 1008);
export const H = Number(params.get("h") || 720);

export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; // keeps the brand purple purple
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

// A dark room with softboxes, used only for reflections.
function studio() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), new THREE.MeshBasicMaterial({ color: 0x34343c, side: THREE.BackSide })));
  const panel = (w, h, color, k, pos) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(16, 10, 0xffffff, 2.6, [0, 9, 3]); // big overhead softbox (what tilted faces see)
  panel(6, 6, 0xffffff, 3, [-6, 5, 6]); // key, front left
  panel(1.4, 9, 0xe6ebff, 3, [8, 1, 3]); // strip, right
  panel(12, 3.5, 0x8c41ff, 3.2, [0, -5, -7]); // brand kicker, low behind
  panel(8, 4, 0xffffff, 0.6, [0, 1, 10]); // front fill, soft
  return env;
}

export const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(studio(), 0.02).texture;
// Direct light for the non-metal parts. Scenes with big flat faces turned to the
// key (ibans) dim these, so their purple doesn't wash out.
const hemi = new THREE.HemisphereLight(0xffffff, 0x8c41ff, 0.9);
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(-3, 6, 5);
scene.add(hemi, key);
export const lights = { hemi, key };

const phys = (o) => new THREE.MeshPhysicalMaterial(o);
export const mats = {
  purple: phys({ color: 0x8c41ff, metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2 }),
  aluminium: phys({ color: 0xf2f3f7, metalness: 0.7, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.1 }),
  white: phys({ color: 0xffffff, metalness: 0, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 }),
  violet: phys({ color: 0x8c41ff, metalness: 0.5, roughness: 0.25, clearcoat: 1 }),
  // Secondary marks (a second line of text): quieter than the main accent.
  lilac: phys({ color: 0xd8c4ff, metalness: 0, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 }),
  softViolet: phys({ color: 0xb996ff, metalness: 0.3, roughness: 0.3, clearcoat: 1 }),
};

// Soft contact shadows: blurred ellipses on the floor (no shadow maps, no banding).
const blob = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.45, "rgba(0,0,0,0.45)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
})();
const shadowMat = new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false, opacity: 0.2, toneMapped: false });
export function contactShadow(x, z, w, d, floorY = -1.45) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), shadowMat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, floorY, z);
  scene.add(m);
}

// A rounded rectangle centred on the origin.
export function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// The default camera, slightly above and in front, so all cards share a viewpoint.
export function camera({ pos = [0.25, 2.9, 9.3], look = [0.25, 0.1, 0], fov = 26 } = {}) {
  const c = new THREE.PerspectiveCamera(fov, W / H, 0.1, 100);
  c.position.set(...pos);
  c.lookAt(...look);
  return c;
}

export function finish(cam) {
  window.renderArt = ({ shadow = 0.2, exposure = 1 } = {}) => {
    shadowMat.opacity = shadow;
    renderer.toneMappingExposure = exposure;
    renderer.render(scene, cam);
    return renderer.domElement.toDataURL("image/png");
  };
  window.ready = true;
}
