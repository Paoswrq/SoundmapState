// Import necessary libraries and audio analysis functions
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { getAudioDataFrequency, getPitch, getLoudness } from "./core.js";

// Global variables for visuals and audio data
let rgb = null;
let frequency = null;
let loudness = null;

// Three.js core components
let scene = null;
let camera = null;
let renderer = null;

// Geometry and materials
let geometry = null;
let sharedMaterial = null;
let cube = [];

// Camera and positioning
let vFOV = null;
let visibleHeight = null;
let visibleWidth = null;
let basePosition = null;
let lookAtTarget = null;

// Plane backgrounds
let planeGeo = null;
let planeGeo2 = null;
let planeMaterial = null;
let planeMaterial2 = null;
let plane = null;
let plane2 = null;

// Lighting
let light = null;
let ambient = null;

// Timing
let nowTime = null;

// State
let blockInitialized = false;
let resizeHandler = null;

// Initializes the 3D block animation
export function Block() {
    if (blockInitialized) return;
    blockInitialized = true;

    // Set up scene, camera, and renderer
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    geometry = new THREE.BoxGeometry(1, 1, 1); // Cube geometry

    // Add lights
    light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, -8, 25);
    light.castShadow = true;
    scene.add(light);

    ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    // Configure shadow settings
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500;

    // Add planes for floor/background
    planeGeo = new THREE.PlaneGeometry(10, 100);
    planeGeo2 = new THREE.PlaneGeometry(100, 100);
    planeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    planeMaterial2 = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    plane = new THREE.Mesh(planeGeo, planeMaterial);
    plane2 = new THREE.Mesh(planeGeo2, planeMaterial2);
    plane.renderOrder = 2;
    plane2.renderOrder = 1;
    plane.receiveShadow = true;
    plane2.receiveShadow = true;
    scene.add(plane);
    scene.add(plane2);
    plane2.position.z = -0.1;

    // Set initial camera position
    basePosition = new THREE.Vector3(0, -5, 1);
    lookAtTarget = new THREE.Vector3(0, 0, 0);
    camera.position.copy(basePosition);
    camera.lookAt(lookAtTarget);

    // Calculate visible area size
    vFOV = camera.fov * (Math.PI / 180);
    visibleHeight = 2 * Math.tan(vFOV / 2) * camera.position.z;
    visibleWidth = visibleHeight * camera.aspect;

    nowTime = Date.now();

    // Updates audio and color data
    function update() {
        rgb = getPitch().color;
        frequency = getAudioDataFrequency();
        loudness = getLoudness();
    }

    // Categorizes frequency into 3 ranges
    function determineRange() {
        switch (true) {
            case frequency < 10: return 1;
            case frequency < 50: return 2;
            default: return 3;
        }
    }

    // Controls how often new cubes are spawned
    function callCube() {
        const safeLoudness = Math.max(loudness, 0.05);
        if (Date.now() - nowTime > 1000 / (safeLoudness * 0.05)) {
            createNewCube();
            nowTime = Date.now();
        }
    }

    // Shared cube material with color/emissive brightness
    sharedMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        shininess: 1
    });

    // Creates a new cube and places it based on pitch
    function createNewCube() {
        sharedMaterial.color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
        sharedMaterial.emissive.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
        const newCube = new THREE.Mesh(geometry, sharedMaterial);
        newCube.lookAt(camera.position);
        newCube.position.z = 1;

        if(Math.random() < 0.5) {
            newCube.position.x = (Math.random() - 0.5) * visibleWidth - visibleWidth * 1.2;
        } else {
            newCube.position.x = (Math.random() - 0.5) * -visibleWidth + visibleWidth * 1.2;
        }
        
        newCube.position.y = visibleHeight * 15;
        newCube.castShadow = true;
        newCube.receiveShadow = true;
        scene.add(newCube);
        cube.push(newCube);
    }

    // Main animation loop
    function animate() {
        update();
        callCube();

        // Change background color based on inverse RGB
        plane2.material.color.setRGB((255 - rgb[0]) / 255, (255 - rgb[1]) / 255, (255 - rgb[2]) / 255);

        // Update each cube based on frequency range
        for (let i = 0; i < cube.length; i++) {
            const type = determineRange();

            if (type === 1) {
                let scale = 1.0 + (frequency / 256) * 2;
                let currentScale = cube[i].scale.x;
                let lerpedScale = currentScale + (scale - currentScale) * 0.1;
                cube[i].scale.set(lerpedScale, lerpedScale, lerpedScale);
            }

            if (type === 2) {
                let angle = (frequency / 256) * 0.01;
                cube[i].rotation.x += angle;
                cube[i].rotation.y += angle;
            }

            if (type === 3) {
                let intensity = (frequency / 256) * 0.5;
                cube[i].material.emissiveIntensity = intensity;
            }

            // Move cubes downward based on loudness
            cube[i].position.y -= 0.1 * ((loudness + 1) * 0.1);

            // Remove cube if it goes offscreen
            if (cube[i].position.y <= -visibleHeight * 10) {
                scene.remove(cube[i]);
                cube[i].geometry.dispose();
                cube[i].material.dispose();
                cube.splice(i, 1);
                i--;
            }
        }

        // Add subtle camera jitter for dynamic effect
        let time = performance.now() * 0.001;
        let strength = 0.15;
        let jitterX = Math.sin(time * 1.1) * strength;
        let jitterY = Math.cos(time * 1.3) * strength * 0.5;
        let jitterZ = Math.sin(time * 0.9 + 1.5) * strength;

        camera.position.set(
            basePosition.x + jitterX,
            basePosition.y + jitterY,
            basePosition.z + jitterZ
        );
        camera.lookAt(lookAtTarget);

        renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);

    // Handle window resizing
    resizeHandler = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resizeHandler);
}

// Clean up and remove everything
export function disposeBlock() {
    if (!blockInitialized) return;
    blockInitialized = false;

    renderer.setAnimationLoop(null);

    cube.forEach(c => {
        scene.remove(c);
        c.geometry.dispose();
        c.material.dispose();
    });
    cube = [];

    if (renderer && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }

    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }

    scene = null;
    camera = null;
    renderer = null;
    geometry = null;
    sharedMaterial = null;
}
