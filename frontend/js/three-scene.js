(function () {
    const container = document.getElementById('hero3d');
    if (!container || typeof THREE === 'undefined') return;

    const ACCENTS = [0x6366f1, 0x8b5cf6, 0x06b6d4, 0xec4899];

    let scene, camera, renderer, centralGroup, orbitGroup, particles;
    let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0, clock;

    function createGlowMaterial(color) {
        return new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.7,
            metalness: 0.3,
            roughness: 0.25
        });
    }

    function createOrbitalShape(type, size, color) {
        let geometry;
        switch (type) {
            case 'ico': geometry = new THREE.IcosahedronGeometry(size, 0); break;
            case 'octa': geometry = new THREE.OctahedronGeometry(size, 0); break;
            case 'torus': geometry = new THREE.TorusGeometry(size, size * 0.4, 12, 24); break;
            default: geometry = new THREE.BoxGeometry(size, size, size);
        }
        return new THREE.Mesh(geometry, createGlowMaterial(color));
    }

    function init() {
        clock = new THREE.Clock();
        const width = container.clientWidth;
        const height = container.clientHeight;

        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xffffff, 14, 28);

        camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
        camera.position.set(0, 0, 8);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = false;
        container.appendChild(renderer.domElement);

        /* ===== Objek pusat: torus knot hitam + cincin wireframe ===== */
        centralGroup = new THREE.Group();

        const knotGeom = new THREE.TorusKnotGeometry(1, 0.32, 160, 32);
        const knotMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.7,
            roughness: 0.25
        });
        const knot = new THREE.Mesh(knotGeom, knotMat);
        centralGroup.add(knot);

        const edges = new THREE.EdgesGeometry(knotGeom);
        const lineMat = new THREE.LineBasicMaterial({
            color: 0x8b5cf6,
            transparent: true,
            opacity: 0.45
        });
        const wire = new THREE.LineSegments(edges, lineMat);
        wire.scale.set(1.55, 1.55, 1.55);
        centralGroup.add(wire);

        scene.add(centralGroup);

        /* ===== Bentuk-bentuk kecil yang mengorbit ===== */
        orbitGroup = new THREE.Group();
        const orbitConfigs = [
            { type: 'ico', size: 0.32, color: ACCENTS[0], radius: 2.5, speed: 0.6, y: 1.1 },
            { type: 'torus', size: 0.28, color: ACCENTS[1], radius: 3.1, speed: -0.45, y: -0.9 },
            { type: 'octa', size: 0.26, color: ACCENTS[2], radius: 2.0, speed: 0.9, y: -1.3 },
            { type: 'box', size: 0.3, color: ACCENTS[3], radius: 3.4, speed: -0.35, y: 0.6 },
            { type: 'ico', size: 0.2, color: ACCENTS[2], radius: 2.8, speed: 0.75, y: 1.6 },
            { type: 'torus', size: 0.2, color: ACCENTS[3], radius: 2.3, speed: -0.8, y: -1.7 },
            { type: 'octa', size: 0.34, color: ACCENTS[0], radius: 3.7, speed: 0.3, y: 0.2 },
            { type: 'box', size: 0.24, color: ACCENTS[1], radius: 1.7, speed: 1.1, y: -0.2 }
        ];

        orbitConfigs.forEach(cfg => {
            const mesh = createOrbitalShape(cfg.type, cfg.size, cfg.color);
            mesh.userData = {
                radius: cfg.radius,
                speed: cfg.speed,
                y: cfg.y,
                phase: Math.random() * Math.PI * 2
            };
            orbitGroup.add(mesh);
        });
        scene.add(orbitGroup);

        /* ===== Cahaya ===== */
        const key = new THREE.DirectionalLight(0xffffff, 1.2);
        key.position.set(4, 6, 5);
        scene.add(key);

        const rim = new THREE.DirectionalLight(0x8b5cf6, 0.8);
        rim.position.set(-5, -3, -4);
        scene.add(rim);

        scene.add(new THREE.AmbientLight(0xffffff, 0.35));

        /* ===== Partikel bintang dua warna ===== */
        const pCount = 700;
        const pGeom = new THREE.BufferGeometry();
        const posArray = new Float32Array(pCount * 3);
        const colorArray = new Float32Array(pCount * 3);

        for (let i = 0; i < pCount; i++) {
            posArray[i * 3] = (Math.random() - 0.5) * 26;
            posArray[i * 3 + 1] = (Math.random() - 0.5) * 18;
            posArray[i * 3 + 2] = (Math.random() - 0.5) * 12;

            const base = Math.random() < 0.7 ? new THREE.Color(0x8b5cf6) : new THREE.Color(0x06b6d4);
            const c = new THREE.Color(base).multiplyScalar(0.7 + Math.random() * 0.5);
            colorArray[i * 3] = c.r;
            colorArray[i * 3 + 1] = c.g;
            colorArray[i * 3 + 2] = c.b;
        }

        pGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        pGeom.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

        const pMat = new THREE.PointsMaterial({
            size: 0.06,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
        });
        particles = new THREE.Points(pGeom, pMat);
        scene.add(particles);

        animate();
    }

    function animate() {
        requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        centralGroup.rotation.y = t * 0.35;
        centralGroup.rotation.x = Math.sin(t * 0.2) * 0.2;
        centralGroup.position.y = Math.sin(t * 0.5) * 0.15;

        orbitGroup.children.forEach(mesh => {
            const d = mesh.userData;
            mesh.position.x = Math.cos(t * d.speed + d.phase) * d.radius;
            mesh.position.z = Math.sin(t * d.speed + d.phase) * d.radius;
            mesh.position.y = d.y + Math.sin(t * 1.5 + d.phase) * 0.3;
            mesh.rotation.x += 0.02;
            mesh.rotation.y += 0.03;
        });

        particles.rotation.y = t * 0.02;

        targetX = mouseX * 0.5;
        targetY = mouseY * 0.3;
        centralGroup.rotation.y += (targetX - centralGroup.rotation.y) * 0.02;
        centralGroup.rotation.x += (targetY - centralGroup.rotation.x) * 0.02;

        renderer.render(scene, camera);
    }

    function onPointerMove(e) {
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        mouseX = (x / window.innerWidth) * 2 - 1;
        mouseY = (y / window.innerHeight) * 2 - 1;
    }

    function onResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize);

    init();
})();