(function () {
    const container = document.getElementById('hero3d');
    if (!container || typeof THREE === 'undefined') return;

    let scene, camera, renderer, group, particles;
    let mouseX = 0, mouseY = 0;

    function init() {
        const width = container.clientWidth;
        const height = container.clientHeight;

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(0, 0, 6);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        group = new THREE.Group();

        const geom = new THREE.TorusKnotGeometry(1, 0.3, 128, 32);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.4,
            roughness: 0.3,
            wireframe: false
        });
        const knot = new THREE.Mesh(geom, mat);
        knot.scale.set(1.4, 1.4, 1.4);
        group.add(knot);

        const edges = new THREE.EdgesGeometry(geom);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x888888 });
        const wireframe = new THREE.LineSegments(edges, lineMat);
        wireframe.scale.set(2.05, 2.05, 2.05);
        group.add(wireframe);

        scene.add(group);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        scene.add(light);

        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);

        const pCount = 400;
        const pGeom = new THREE.BufferGeometry();
        const posArray = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount * 3; i += 3) {
            posArray[i] = (Math.random() - 0.5) * 24;
            posArray[i + 1] = (Math.random() - 0.5) * 16;
            posArray[i + 2] = (Math.random() - 0.5) * 10;
        }
        pGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const pMat = new THREE.PointsMaterial({ color: 0x999999, size: 0.04, transparent: true, opacity: 0.8 });
        particles = new THREE.Points(pGeom, pMat);
        scene.add(particles);

        animate();
    }

    function animate() {
        requestAnimationFrame(animate);

        group.rotation.x += 0.004;
        group.rotation.y += 0.006;

        group.rotation.y += mouseX * 0.001;
        group.rotation.x += mouseY * 0.001;

        particles.rotation.y += 0.0005;

        renderer.render(scene, camera);
    }

    function onMouseMove(e) {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    }

    function onResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    init();
})();