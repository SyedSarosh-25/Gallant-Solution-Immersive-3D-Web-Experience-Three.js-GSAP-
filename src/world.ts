import * as THREE from 'three';

export class WorldScene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private particles: THREE.Points;
    private gridFloor: THREE.Group;
    private floatingObjects: THREE.Group;
    private fogPlanes: THREE.Group;
    private clock: THREE.Clock = new THREE.Clock();
    private animationId: number = 0;
    private isDestroyed: boolean = false;
    private scrollProgress: number = 0;
    private mouse: THREE.Vector2 = new THREE.Vector2();
    private targetMouse: THREE.Vector2 = new THREE.Vector2();

    constructor(private canvas: HTMLCanvasElement) {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x050510, 0.04);

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
        this.camera.position.set(0, 2, 10);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;

        this.particles = new THREE.Points();
        this.gridFloor = new THREE.Group();
        this.floatingObjects = new THREE.Group();
        this.fogPlanes = new THREE.Group();

        this.init();
        this.setupEvents();
    }

    private init() {
        // ─── STAR FIELD ───
        const starCount = 2000;
        const starPositions = new Float32Array(starCount * 3);
        const starSizes = new Float32Array(starCount);
        const starColors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            starPositions[i3] = (Math.random() - 0.5) * 200;
            starPositions[i3 + 1] = (Math.random() - 0.5) * 100 + 10;
            starPositions[i3 + 2] = (Math.random() - 0.5) * 200 - 50;

            starSizes[i] = Math.random() * 1.2 + 0.2;

            const c = Math.random();
            if (c < 0.4) {
                starColors[i3] = 0; starColors[i3 + 1] = 0.7; starColors[i3 + 2] = 1;
            } else if (c < 0.7) {
                starColors[i3] = 0.6; starColors[i3 + 1] = 0.3; starColors[i3 + 2] = 0.9;
            } else if (c < 0.9) {
                starColors[i3] = 1; starColors[i3 + 1] = 0.2; starColors[i3 + 2] = 0.5;
            } else {
                starColors[i3] = 0.8; starColors[i3 + 1] = 0.85; starColors[i3 + 2] = 1;
            }
        }

        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
        starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

        const starMat = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
            },
            vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float time;
        uniform float pixelRatio;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          pos.x += sin(time * 0.1 + position.z * 0.01) * 0.5;
          pos.y += cos(time * 0.08 + position.x * 0.01) * 0.3;
          
          float twinkle = sin(time * 2.0 + float(gl_VertexID) * 1.37) * 0.5 + 0.5;
          vAlpha = 0.2 + twinkle * 0.4;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * pixelRatio * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
            fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, d);
          gl_FragColor = vec4(vColor, alpha * vAlpha);
        }
      `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.particles = new THREE.Points(starGeo, starMat);
        this.scene.add(this.particles);

        // ─── GRID FLOOR ───
        this.gridFloor = new THREE.Group();

        // Horizontal grid lines
        const gridMat = new THREE.LineBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.06,
            blending: THREE.AdditiveBlending,
        });

        const gridSize = 100;
        const gridDivisions = 50;
        for (let i = -gridDivisions; i <= gridDivisions; i++) {
            const points = [
                new THREE.Vector3(-gridSize, -3, i * (gridSize / gridDivisions)),
                new THREE.Vector3(gridSize, -3, i * (gridSize / gridDivisions)),
            ];
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(lineGeo, gridMat);
            this.gridFloor.add(line);

            const points2 = [
                new THREE.Vector3(i * (gridSize / gridDivisions), -3, -gridSize),
                new THREE.Vector3(i * (gridSize / gridDivisions), -3, gridSize),
            ];
            const lineGeo2 = new THREE.BufferGeometry().setFromPoints(points2);
            const line2 = new THREE.Line(lineGeo2, gridMat);
            this.gridFloor.add(line2);
        }

        this.scene.add(this.gridFloor);

        // ─── FLOATING HOLOGRAPHIC OBJECTS ───
        this.floatingObjects = new THREE.Group();

        // Floating shapes — more variety and density
        const shapeTypes = ['box', 'octahedron', 'icosahedron', 'dodecahedron', 'torusKnot'];
        for (let i = 0; i < 18; i++) {
            const size = 0.2 + Math.random() * 0.6;
            const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
            let geo: THREE.BufferGeometry;

            switch (shapeType) {
                case 'box':
                    geo = new THREE.BoxGeometry(size, size, size);
                    break;
                case 'octahedron':
                    geo = new THREE.OctahedronGeometry(size, 0);
                    break;
                case 'icosahedron':
                    geo = new THREE.IcosahedronGeometry(size, 0);
                    break;
                case 'dodecahedron':
                    geo = new THREE.DodecahedronGeometry(size, 0);
                    break;
                case 'torusKnot':
                    geo = new THREE.TorusKnotGeometry(size * 0.4, size * 0.12, 64, 8, 2, 3);
                    break;
                default:
                    geo = new THREE.BoxGeometry(size, size, size);
            }

            const colorPick = [0x00d4ff, 0xa855f7, 0xff2d78, 0x00ffaa][Math.floor(Math.random() * 4)];
            const mat = new THREE.MeshBasicMaterial({
                color: colorPick,
                wireframe: true,
                transparent: true,
                opacity: 0.08 + Math.random() * 0.08,
                blending: THREE.AdditiveBlending,
            });

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 40,
                Math.random() * 12 - 3,
                (Math.random() - 0.5) * 50 - 10,
            );
            mesh.userData = {
                startY: mesh.position.y,
                startX: mesh.position.x,
                floatSpeed: 0.2 + Math.random() * 0.6,
                rotSpeed: (Math.random() - 0.5) * 2.5,
                phase: Math.random() * Math.PI * 2,
                floatAmplitude: 0.3 + Math.random() * 0.8,
            };
            this.floatingObjects.add(mesh);
        }

        this.scene.add(this.floatingObjects);

        // ─── VOLUMETRIC FOG PLANES ───
        this.fogPlanes = new THREE.Group();

        for (let i = 0; i < 8; i++) {
            const fogGeo = new THREE.PlaneGeometry(80, 20);
            const fogMat = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color: { value: new THREE.Color([0x00d4ff, 0xa855f7, 0x001133, 0xff2d78, 0x00ffaa][i % 5]) },
                },
                vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
                fragmentShader: `
          uniform float time;
          uniform vec3 color;
          varying vec2 vUv;
          
          void main() {
            float d = length(vUv - vec2(0.5));
            float alpha = smoothstep(0.5, 0.0, d) * 0.03;
            alpha *= sin(time * 0.3 + vUv.x * 3.0) * 0.5 + 0.5;
            alpha *= sin(time * 0.2 + vUv.y * 2.0) * 0.3 + 0.7;
            gl_FragColor = vec4(color, alpha);
          }
        `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide,
            });

            const fog = new THREE.Mesh(fogGeo, fogMat);
            fog.position.set(
                (Math.random() - 0.5) * 30,
                Math.random() * 10 - 3,
                -8 - i * 12,
            );
            fog.rotation.y = Math.random() * 0.8 - 0.4;
            fog.rotation.x = Math.random() * 0.3 - 0.15;
            this.fogPlanes.add(fog);
        }

        this.scene.add(this.fogPlanes);

        // ─── LIGHTING ───
        const pointLight1 = new THREE.PointLight(0x00d4ff, 1.8, 60);
        pointLight1.position.set(5, 5, -5);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xa855f7, 1.2, 60);
        pointLight2.position.set(-5, 3, -10);
        this.scene.add(pointLight2);

        const pointLight3 = new THREE.PointLight(0xff2d78, 0.6, 40);
        pointLight3.position.set(0, 8, -20);
        this.scene.add(pointLight3);

        // Start animation
        this.animate();
    }

    private setupEvents() {
        const handleMove = (x: number, y: number) => {
            this.targetMouse.x = (x / window.innerWidth) * 2 - 1;
            this.targetMouse.y = -(y / window.innerHeight) * 2 + 1;
        };

        window.addEventListener('mousemove', (e) => {
            handleMove(e.clientX, e.clientY);
        });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                // Prevent scrolling interference with 3D movement
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        window.addEventListener('resize', () => {
            if (this.isDestroyed) return;
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            // Cap pixel ratio for mobile performance
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        });
    }

    public updateScroll(progress: number) {
        this.scrollProgress = progress;
    }

    private animate = () => {
        if (this.isDestroyed) return;
        this.animationId = requestAnimationFrame(this.animate);

        const time = this.clock.getElapsedTime();

        // Smooth mouse
        this.mouse.lerp(this.targetMouse, 0.03);

        // Camera responds to scroll
        const targetY = 2 - this.scrollProgress * 3;
        const targetZ = 10 - this.scrollProgress * 5;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.05;
        this.camera.position.z += (targetZ - this.camera.position.z) * 0.05;

        // Camera responds to mouse
        this.camera.position.x += (this.mouse.x * 1.5 - this.camera.position.x) * 0.02;
        this.camera.rotation.y = -this.mouse.x * 0.02;
        this.camera.rotation.x = this.mouse.y * 0.01;

        // Update star shader
        (this.particles.material as THREE.ShaderMaterial).uniforms.time.value = time;

        // Floating objects animation
        this.floatingObjects.children.forEach((obj) => {
            const ud = obj.userData;
            obj.position.y = ud.startY + Math.sin(time * ud.floatSpeed + ud.phase) * (ud.floatAmplitude || 0.5);
            obj.position.x = ud.startX + Math.cos(time * ud.floatSpeed * 0.5 + ud.phase) * 0.3;
            obj.rotation.x += ud.rotSpeed * 0.003;
            obj.rotation.y += ud.rotSpeed * 0.004;
            obj.rotation.z += ud.rotSpeed * 0.001;
        });

        // Grid scroll effect - subtle z movement
        this.gridFloor.position.z = -(time * 0.5) % 4;

        // Fog animation
        this.fogPlanes.children.forEach((fog) => {
            (fog as THREE.Mesh).material && ((fog as THREE.Mesh).material as THREE.ShaderMaterial).uniforms &&
                (((fog as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.time.value = time);
        });

        this.renderer.render(this.scene, this.camera);
    };

    public destroy() {
        this.isDestroyed = true;
        cancelAnimationFrame(this.animationId);
        this.renderer.dispose();
        this.scene.traverse((obj) => {
            if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
            if ((obj as THREE.Mesh).material) {
                const mat = (obj as THREE.Mesh).material;
                if (Array.isArray(mat)) mat.forEach(m => m.dispose());
                else mat.dispose();
            }
        });
    }
}
