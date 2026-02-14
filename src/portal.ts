import * as THREE from 'three';

export class PortalScene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private globe: THREE.Mesh;
    private globeCore: THREE.Mesh;
    private rings: THREE.Group;
    private particles: THREE.Points;
    private cursorParticles: THREE.Points;
    private mouse: THREE.Vector2 = new THREE.Vector2();
    private targetMouse: THREE.Vector2 = new THREE.Vector2();
    private clock: THREE.Clock = new THREE.Clock();
    private animationId: number = 0;
    private isDestroyed: boolean = false;
    private isTransitioning: boolean = false;

    // Uniforms for shaders
    private globeMaterial!: THREE.ShaderMaterial;
    private coreMaterial!: THREE.ShaderMaterial;
    private particleMaterial!: THREE.ShaderMaterial;

    constructor(private canvas: HTMLCanvasElement) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 5);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.globe = new THREE.Mesh();
        this.globeCore = new THREE.Mesh();
        this.rings = new THREE.Group();
        this.particles = new THREE.Points();
        this.cursorParticles = new THREE.Points();

        this.init();
        this.setupEvents();
    }

    private init() {
        // ─── GLOBE (outer shell) ───
        const globeGeo = new THREE.SphereGeometry(1.2, 64, 64);
        this.globeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                mouseInfluence: { value: new THREE.Vector2(0, 0) },
                glowIntensity: { value: 0.5 },
            },
            vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        uniform float time;
        uniform vec2 mouseInfluence;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;
          
          // Subtle vertex displacement from mouse
          vec3 displaced = position;
          float mouseEffect = sin(position.x * 3.0 + mouseInfluence.x * 2.0) * 
                             cos(position.y * 3.0 + mouseInfluence.y * 2.0) * 0.03;
          displaced += normal * mouseEffect;
          
          // Breathing effect
          displaced += normal * sin(time * 0.8) * 0.02;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
            fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        uniform float time;
        uniform float glowIntensity;
        
        void main() {
          // Fresnel effect for glass-like edges
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
          
          // Neon blue base with purple accents
          vec3 baseColor = vec3(0.0, 0.83, 1.0); // neon blue
          vec3 accentColor = vec3(0.66, 0.33, 0.97); // electric purple
          vec3 pinkAccent = vec3(1.0, 0.18, 0.47); // cyber pink
          
          // Animated color mixing
          float colorMix = sin(vUv.x * 6.28 + time * 0.5) * 0.5 + 0.5;
          float pinkMix = sin(vUv.y * 12.56 + time * 0.7) * 0.5 + 0.5;
          vec3 color = mix(baseColor, accentColor, colorMix * 0.4);
          color = mix(color, pinkAccent, pinkMix * 0.1);
          
          // Energy lines
          float lines = sin(vUv.y * 40.0 + time * 2.0) * 0.5 + 0.5;
          lines = smoothstep(0.85, 1.0, lines);
          
          float vertLines = sin(vUv.x * 30.0 - time * 1.5) * 0.5 + 0.5;
          vertLines = smoothstep(0.9, 1.0, vertLines);
          
          float lineGlow = max(lines, vertLines) * 0.45;
          
          // Combine
          float alpha = fresnel * 0.6 + lineGlow * 0.4;
          color = color * (fresnel + lineGlow) * glowIntensity;
          
          gl_FragColor = vec4(color, alpha * 0.8);
        }
      `,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.globe = new THREE.Mesh(globeGeo, this.globeMaterial);
        this.scene.add(this.globe);

        // ─── GLOBE CORE (emissive inner sphere) ───
        const coreGeo = new THREE.SphereGeometry(0.7, 32, 32);
        this.coreMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                intensity: { value: 1.0 },
            },
            vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        uniform float time;
        uniform float intensity;
        
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          
          vec3 coreColor = vec3(0.0, 0.6, 1.0);
          vec3 pulseColor = vec3(0.5, 0.2, 0.9);
          
          float pulse = sin(time * 1.5) * 0.5 + 0.5;
          vec3 color = mix(coreColor, pulseColor, pulse * 0.3);
          
          // Inner glow
          float glow = 0.4 + pulse * 0.3;
          color *= glow * intensity;
          
          float alpha = (0.3 + fresnel * 0.5) * intensity;
          gl_FragColor = vec4(color, alpha);
        }
      `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.globeCore = new THREE.Mesh(coreGeo, this.coreMaterial);
        this.scene.add(this.globeCore);

        // ─── ORBITING DATA RINGS ───
        this.rings = new THREE.Group();
        const ringConfigs = [
            { radius: 1.8, tilt: 0.4, speed: 0.3, color: 0x00d4ff },
            { radius: 2.1, tilt: -0.6, speed: -0.2, color: 0xa855f7 },
            { radius: 2.4, tilt: 0.2, speed: 0.15, color: 0xff2d78 },
        ];

        ringConfigs.forEach((config) => {
            const ringGeo = new THREE.TorusGeometry(config.radius, 0.008, 8, 200);
            const ringMat = new THREE.MeshBasicMaterial({
                color: config.color,
                transparent: true,
                opacity: 0.25,
                blending: THREE.AdditiveBlending,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = config.tilt;
            ring.userData = { speed: config.speed, baseTilt: config.tilt };
            this.rings.add(ring);

            // Add data dots on ring
            const dotCount = 20;
            for (let i = 0; i < dotCount; i++) {
                const angle = (i / dotCount) * Math.PI * 2;
                const dotGeo = new THREE.SphereGeometry(0.02, 8, 8);
                const dotMat = new THREE.MeshBasicMaterial({
                    color: config.color,
                    transparent: true,
                    opacity: 0.4,
                    blending: THREE.AdditiveBlending,
                });
                const dot = new THREE.Mesh(dotGeo, dotMat);
                dot.position.x = Math.cos(angle) * config.radius;
                dot.position.z = Math.sin(angle) * config.radius;
                ring.add(dot);
            }
        });

        this.scene.add(this.rings);

        // ─── COSMIC PARTICLES ───
        const particleCount = 1200;
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            // Spread particles in a wide sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 4 + Math.random() * 18;

            positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = r * Math.cos(phi);

            sizes[i] = Math.random() * 1.5 + 0.3;

            // Color: mix of blue, purple, pink
            const colorChoice = Math.random();
            if (colorChoice < 0.5) {
                colors[i3] = 0; colors[i3 + 1] = 0.83; colors[i3 + 2] = 1;
            } else if (colorChoice < 0.8) {
                colors[i3] = 0.66; colors[i3 + 1] = 0.33; colors[i3 + 2] = 0.97;
            } else {
                colors[i3] = 1; colors[i3 + 1] = 0.18; colors[i3 + 2] = 0.47;
            }
        }

        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        this.particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
            },
            vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float pixelRatio;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          
          // Gentle floating
          pos.x += sin(time * 0.3 + position.y * 0.5) * 0.1;
          pos.y += cos(time * 0.2 + position.x * 0.5) * 0.1;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * pixelRatio * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
            fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, d);
          alpha *= 0.4;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.particles = new THREE.Points(particleGeo, this.particleMaterial);
        this.scene.add(this.particles);

        // ─── CURSOR-FOLLOWING PARTICLES ───
        const cursorParticleCount = 30;
        const cursorPositions = new Float32Array(cursorParticleCount * 3);
        const cursorSizes = new Float32Array(cursorParticleCount);

        for (let i = 0; i < cursorParticleCount; i++) {
            cursorPositions[i * 3] = (Math.random() - 0.5) * 0.4;
            cursorPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
            cursorPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
            cursorSizes[i] = Math.random() * 1.2 + 0.5;
        }

        const cursorGeo = new THREE.BufferGeometry();
        cursorGeo.setAttribute('position', new THREE.BufferAttribute(cursorPositions, 3));
        cursorGeo.setAttribute('size', new THREE.BufferAttribute(cursorSizes, 1));

        const cursorMat = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                mousePos: { value: new THREE.Vector3() },
                pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
            },
            vertexShader: `
        attribute float size;
        uniform float time;
        uniform vec3 mousePos;
        uniform float pixelRatio;
        
        void main() {
          vec3 pos = position + mousePos;
          pos.x += sin(time * 2.0 + float(gl_VertexID) * 0.5) * 0.15;
          pos.y += cos(time * 1.5 + float(gl_VertexID) * 0.7) * 0.15;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * pixelRatio * (60.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
            fragmentShader: `
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, d);
          alpha *= 0.25;
          gl_FragColor = vec4(0.0, 0.83, 1.0, alpha);
        }
      `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.cursorParticles = new THREE.Points(cursorGeo, cursorMat);
        this.scene.add(this.cursorParticles);

        // ─── AMBIENT LIGHT ───
        const ambientLight = new THREE.AmbientLight(0x001133, 0.5);
        this.scene.add(ambientLight);

        // Start animation
        this.animate();

        // Hide loading after a short delay
        setTimeout(() => {
            const loader = document.getElementById('loading-overlay');
            if (loader) loader.classList.add('hidden');
        }, 1500);
    }

    private setupEvents() {
        window.addEventListener('mousemove', (e) => {
            this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        window.addEventListener('resize', () => {
            if (this.isDestroyed) return;
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    private animate = () => {
        if (this.isDestroyed) return;
        this.animationId = requestAnimationFrame(this.animate);

        const time = this.clock.getElapsedTime();

        // Smooth mouse lerp
        this.mouse.lerp(this.targetMouse, 0.05);

        // Update globe
        this.globe.rotation.y = time * 0.15 + this.mouse.x * 0.3;
        this.globe.rotation.x = Math.sin(time * 0.2) * 0.1 + this.mouse.y * 0.2;

        this.globeCore.rotation.y = -time * 0.2;
        this.globeCore.rotation.x = time * 0.1;

        // Update shader uniforms
        this.globeMaterial.uniforms.time.value = time;
        this.globeMaterial.uniforms.mouseInfluence.value.set(this.mouse.x, this.mouse.y);

        // Mouse proximity glow intensity
        const mouseDist = this.mouse.length();
        const glowTarget = 0.5 + mouseDist * 0.5;
        this.globeMaterial.uniforms.glowIntensity.value += (glowTarget - this.globeMaterial.uniforms.glowIntensity.value) * 0.05;

        this.coreMaterial.uniforms.time.value = time;
        this.particleMaterial.uniforms.time.value = time;

        // Rings rotation
        this.rings.children.forEach((ring) => {
            ring.rotation.y += ring.userData.speed * 0.01;
            ring.rotation.z = Math.sin(time * 0.3 + ring.userData.baseTilt) * 0.05;
        });

        // Particles slow rotation
        this.particles.rotation.y = time * 0.02;
        this.particles.rotation.x = Math.sin(time * 0.05) * 0.02;

        // Cursor particles follow mouse
        const mouseWorld = new THREE.Vector3(this.mouse.x * 3, this.mouse.y * 2, 0);
        (this.cursorParticles.material as THREE.ShaderMaterial).uniforms.mousePos.value.copy(mouseWorld);
        (this.cursorParticles.material as THREE.ShaderMaterial).uniforms.time.value = time;

        this.renderer.render(this.scene, this.camera);
    };

    public async transitionOut(): Promise<void> {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        return new Promise((resolve) => {
            const startTime = this.clock.getElapsedTime();
            const duration = 0.7;

            const transitionAnimate = () => {
                if (this.isDestroyed) { resolve(); return; }

                const elapsed = this.clock.getElapsedTime() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic

                // Zoom camera into globe
                this.camera.position.z = 5 - eased * 5.5;
                this.camera.fov = 60 + eased * 40;
                this.camera.updateProjectionMatrix();

                // Intensify glow
                this.globeMaterial.uniforms.glowIntensity.value = 0.5 + eased * 3;
                this.coreMaterial.uniforms.intensity.value = 1 + eased * 5;

                // Scale rings outward and fade
                this.rings.children.forEach((ring, i) => {
                    const s = 1 + eased * (2 + i * 0.5);
                    ring.scale.set(s, s, s);
                    (ring as THREE.Mesh).material && ((ring as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity !== undefined &&
                        (((ring as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - eased));
                });

                // Particles rush toward center
                const posAttr = this.particles.geometry.getAttribute('position');
                for (let i = 0; i < posAttr.count; i++) {
                    const x = posAttr.getX(i);
                    const y = posAttr.getY(i);
                    const z = posAttr.getZ(i);
                    posAttr.setX(i, x * (1 - eased * 0.02));
                    posAttr.setY(i, y * (1 - eased * 0.02));
                    posAttr.setZ(i, z * (1 - eased * 0.02));
                }
                posAttr.needsUpdate = true;

                this.renderer.render(this.scene, this.camera);

                if (progress < 1) {
                    requestAnimationFrame(transitionAnimate);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(transitionAnimate);
        });
    }

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
