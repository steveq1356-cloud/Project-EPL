// In-browser 3D viewer for CAD exports: STL, OBJ, GLB/GLTF, 3MF, PLY, and STEP/IGES
// (via OpenCascade compiled to WebAssembly). Loaded lazily — three.js only downloads
// when a model is opened.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

// CAD formats are Z-up; three.js is Y-up. glTF is Y-up by spec, OBJ usually is.
const Z_UP = ['stl', '3mf', 'ply', 'step', 'stp', 'iges', 'igs'];

const VIEWS = {
  Iso: [1, 0.8, 1],
  Top: [0, 1, 0.0001],
  Front: [0, 0, 1],
  Right: [1, 0, 0],
};

let occtPromise;
async function loadOcct() {
  occtPromise ??= Promise.all([import('occt-import-js'), import('occt-import-js/dist/occt-import-js.wasm?url')]).then(([mod, wasm]) =>
    (mod.default ?? mod)({ locateFile: () => wasm.default }),
  );
  return occtPromise;
}

async function loadStepLike(buffer, ext) {
  const occt = await loadOcct();
  const bytes = new Uint8Array(buffer);
  const result = ext === 'iges' || ext === 'igs' ? occt.ReadIgesFile(bytes, null) : occt.ReadStepFile(bytes, null);
  if (!result.success) throw new Error('Could not read this STEP/IGES file');
  const group = new THREE.Group();
  for (const mesh of result.meshes) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.attributes.position.array, 3));
    if (mesh.attributes.normal) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.attributes.normal.array, 3));
    if (mesh.index) geometry.setIndex(new THREE.Uint32BufferAttribute(Uint32Array.from(mesh.index.array), 1));
    if (!mesh.attributes.normal) geometry.computeVertexNormals();
    const m = new THREE.Mesh(geometry);
    if (mesh.color) m.userData.color = new THREE.Color(...mesh.color);
    group.add(m);
  }
  return group;
}

async function loadModel(url, ext) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't download the file (${res.status})`);
  const buffer = await res.arrayBuffer();
  switch (ext) {
    case 'stl':
      return new THREE.Mesh(new STLLoader().parse(buffer));
    case 'ply':
      return new THREE.Mesh(new PLYLoader().parse(buffer));
    case 'obj':
      return new OBJLoader().parse(new TextDecoder().decode(buffer));
    case '3mf':
      return new ThreeMFLoader().parse(buffer);
    case 'glb':
    case 'gltf':
      return new Promise((resolve, reject) => new GLTFLoader().parse(buffer, url.replace(/[^/]+$/, ''), (g) => resolve(g.scene), reject));
    case 'step':
    case 'stp':
    case 'iges':
    case 'igs':
      return loadStepLike(buffer, ext);
    default:
      throw new Error(`.${ext} files can't be previewed`);
  }
}

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined;

export default function ModelViewer({ url, ext, name }) {
  const mountRef = useRef(null);
  const ctx = useRef({});
  const [status, setStatus] = useState('loading'); // loading | ready | error message
  const [info, setInfo] = useState(null);
  const [wire, setWire] = useState(false);
  const [edges, setEdges] = useState(true);
  const [section, setSection] = useState(100);
  const [zUp, setZUp] = useState(Z_UP.includes(ext));
  const [spin, setSpin] = useState(false);

  // Scene setup + model load.
  useEffect(() => {
    const mount = mountRef.current;
    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(1, 2, 1.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-1.5, 0.5, -1);
    scene.add(fill);

    const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e9);
    const pivot = new THREE.Group(); // holds the model; rotated for Z-up files
    scene.add(pivot);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    let frame;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (ctx.current.spin) pivot.rotation.y += 0.004;
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    ctx.current = { renderer, scene, camera, controls, clip, pivot, key };

    loadModel(url, ext)
      .then((object) => {
        if (disposed) return;
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(css('--model') ?? '#9fb6cc'),
          metalness: 0.15,
          roughness: 0.55,
          side: THREE.DoubleSide,
          clippingPlanes: [clip],
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });
        const edgeMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(css('--model-edge') ?? '#24384d'), clippingPlanes: [clip], transparent: true, opacity: 0.55 });
        let triangles = 0;
        const edgeLines = [];
        object.traverse((child) => {
          if (!child.isMesh) return;
          const ownColor = child.userData.color;
          child.material = ownColor ? material.clone() : material;
          if (ownColor) {
            child.material.color = ownColor;
            child.material.clippingPlanes = [clip]; // clone() copies the plane; share the live one
          }
          const g = child.geometry;
          triangles += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
          if (triangles < 2_000_000) {
            const line = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), edgeMaterial);
            child.add(line);
            edgeLines.push(line);
          }
        });
        pivot.add(object);
        Object.assign(ctx.current, { object, material, edgeLines, triangles });
        setStatus('ready');
      })
      .catch((e) => !disposed && setStatus(e.message));

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m?.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [url, ext]);

  // Orientation, framing, grid and dimensions — redone when the up axis changes.
  useEffect(() => {
    const c = ctx.current;
    if (status !== 'ready' || !c.object) return;
    c.pivot.rotation.set(zUp ? -Math.PI / 2 : 0, 0, 0);
    c.object.position.set(0, 0, 0);
    c.pivot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(c.object);
    const center = box.getCenter(new THREE.Vector3());
    // Sit the part on the grid, centered.
    c.pivot.position.set(-center.x, -box.min.y, -center.z);
    c.pivot.updateMatrixWorld(true);
    const placed = new THREE.Box3().setFromObject(c.object);
    const size = placed.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z) || 1;

    c.grid?.removeFromParent();
    const step = 10 ** Math.floor(Math.log10(span / 2));
    const gridSize = Math.ceil((span * 2) / step) * step;
    c.grid = new THREE.GridHelper(gridSize, Math.round(gridSize / step), new THREE.Color(css('--grid-strong') ?? '#8aa'), new THREE.Color(css('--grid-line') ?? '#ccd'));
    c.grid.material.transparent = true;
    c.grid.material.opacity = 0.5;
    c.scene.add(c.grid);

    c.bounds = placed;
    c.span = span;
    c.gridStep = step;
    // Dimensions in the file's own axes (X, Y, Z with Z up for CAD formats).
    setInfo({ x: size.x, y: zUp ? size.z : size.y, z: zUp ? size.y : size.z, triangles: c.triangles, gridStep: step });
    fit('Iso');
  }, [status, zUp]);

  useEffect(() => {
    const c = ctx.current;
    if (!c.material) return;
    c.object.traverse((o) => o.isMesh && (o.material.wireframe = wire));
  }, [wire, status]);

  useEffect(() => {
    ctx.current.edgeLines?.forEach((l) => (l.visible = edges && !wire));
  }, [edges, wire, status]);

  useEffect(() => {
    const c = ctx.current;
    if (!c.bounds) return;
    const h = c.bounds.min.y + ((c.bounds.max.y - c.bounds.min.y) * section) / 100;
    c.clip.constant = section >= 100 ? 1e9 : h;
  }, [section, status, info]);

  useEffect(() => {
    ctx.current.spin = spin;
  }, [spin]);

  function fit(view = 'Iso') {
    const c = ctx.current;
    if (!c.bounds) return;
    const center = c.bounds.getCenter(new THREE.Vector3());
    const radius = c.bounds.getBoundingSphere(new THREE.Sphere()).radius || 1;
    const dir = new THREE.Vector3(...VIEWS[view]).normalize();
    // A bounding sphere over-estimates flat parts, so frame a little tighter than it.
    const dist = (radius / Math.sin(THREE.MathUtils.degToRad(c.camera.fov / 2))) * 0.82;
    c.camera.position.copy(center).addScaledVector(dir, dist);
    c.camera.near = dist / 100;
    c.camera.far = dist * 100;
    c.camera.updateProjectionMatrix();
    c.controls.target.copy(center);
    c.controls.update();
  }

  function snapshot() {
    const a = document.createElement('a');
    a.href = ctx.current.renderer.domElement.toDataURL('image/png');
    a.download = `${name.replace(/\.[^.]+$/, '')}-view.png`;
    a.click();
  }

  const mm = (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(1));

  return (
    <div className="model-viewer">
      <div className="model-canvas" ref={mountRef}>
        {status === 'loading' && <div className="model-overlay">Loading {['step', 'stp', 'iges', 'igs'].includes(ext) ? 'STEP geometry (first time takes a few seconds)…' : 'model…'}</div>}
        {status !== 'loading' && status !== 'ready' && <div className="model-overlay error">{status}</div>}
      </div>
      {status === 'ready' && (
        <>
          <div className="model-toolbar" role="toolbar" aria-label="Viewer controls">
            <div className="btn-group">
              {Object.keys(VIEWS).map((v) => (
                <button key={v} className="btn btn-small" onClick={() => fit(v)}>
                  {v}
                </button>
              ))}
            </div>
            <div className="btn-group">
              <button className={`btn btn-small ${edges ? 'on' : ''}`} onClick={() => setEdges((e) => !e)} aria-pressed={edges}>
                Edges
              </button>
              <button className={`btn btn-small ${wire ? 'on' : ''}`} onClick={() => setWire((w) => !w)} aria-pressed={wire}>
                Wireframe
              </button>
              <button className={`btn btn-small ${spin ? 'on' : ''}`} onClick={() => setSpin((s) => !s)} aria-pressed={spin}>
                Spin
              </button>
              <button className={`btn btn-small ${zUp ? 'on' : ''}`} onClick={() => setZUp((z) => !z)} title="Switch between Z-up (CAD) and Y-up files">
                {zUp ? 'Z-up' : 'Y-up'}
              </button>
            </div>
            <label className="section-slider" title="Section cut — slice the part horizontally to see inside">
              <span className="label">Section</span>
              <input type="range" min="0" max="100" value={section} onChange={(e) => setSection(Number(e.target.value))} />
              <span className="mono small">{section >= 100 ? 'off' : `${section}%`}</span>
            </label>
            <button className="btn btn-small" onClick={snapshot} title="Save this view as a PNG">
              Snapshot
            </button>
          </div>
          {info && (
            <div className="model-info mono">
              <span>
                {mm(info.x)} × {mm(info.y)} × {mm(info.z)} mm
              </span>
              <span>{Math.round(info.triangles).toLocaleString()} triangles</span>
              <span>grid {info.gridStep} mm</span>
              <span className="muted">drag to orbit · right-drag to pan · scroll to zoom</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
