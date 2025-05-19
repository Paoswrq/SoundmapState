import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import {getAudioDataFrequency, getPitch, getLoudness } from "./core.js";

let rgb = null;
let frequency = null;
let loudness = null;

let scene = null;
let camera = null;
let renderer = null;
let geometry = null;
let material = null;
let cube = [];
let color = null;
let vFOV = null;
let visibleHeight = null;
let visibleWidth = null;
let nowTime = null;
let basePosition = null;
let lookAtTarget = null;

let blockInitialized = false;
let resizeHandler = null;

let sharedMaterial = null; 

let planeGeo = null;
let planeGeo2 = null;
let planeMaterial = null; 
let planeMaterial2 = null;
let plane = null; 
let plane2 = null;

let light = null; 
let ambient = null; 

export function Block() {
    if (blockInitialized) return;
    blockInitialized = true;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    geometry = new THREE.BoxGeometry(1, 1, 1);

    light = new THREE.DirectionalLight( 0xffffff, 1 );
    light.position.set( 5, -8, 25 ); 
    light.castShadow = true; 
    scene.add( light );

    ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    light.shadow.mapSize.width = 512; 
    light.shadow.mapSize.height = 512;
    light.shadow.camera.near = 0.5; 
    light.shadow.camera.far = 500; 

    planeGeo = new THREE.PlaneGeometry(10,100);
    planeGeo2 = new THREE.PlaneGeometry(100,100);
    planeMaterial = new THREE.MeshStandardMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
    planeMaterial2 = new THREE.MeshStandardMaterial( {color: 0xffffff, side: THREE.DoubleSide } ); 
    plane = new THREE.Mesh(planeGeo, planeMaterial); 
    plane2 = new THREE.Mesh(planeGeo2, planeMaterial2);
    plane.renderOrder = 2; 
    plane2.renderOrder = 1; 
    plane.receiveShadow = true;
    plane2.receiveShadow = true; 
    scene.add(plane); 
    scene.add(plane2); 

    plane2.position.z = -0.1; 

    basePosition = new THREE.Vector3(0, -5, 1);
    lookAtTarget = new THREE.Vector3(0, 0, 0);
    camera.position.copy(basePosition);
    camera.lookAt(lookAtTarget);

    vFOV = camera.fov * (Math.PI / 180);
    visibleHeight = 2 * Math.tan(vFOV / 2) * camera.position.z;
    visibleWidth = visibleHeight * camera.aspect;

    nowTime = Date.now();

    function update() {
        rgb = getPitch().color;
        frequency = getAudioDataFrequency();
        loudness = getLoudness();
    }

    function determineRange() {
        
        switch (true) {
            case frequency < 10: //frequency < 250:
                return 1;
            case frequency < 50: //frequency <= 2000:
                return 2;
            default:
                return 3;
        }
    }

    function callCube() {
        const safeLoudness = Math.max(loudness, 0.05); // prevent division by near-zero
        if (Date.now() - nowTime > 1000 / (safeLoudness * 0.05)) {
            createNewCube();
            nowTime = Date.now();
        }
    }
    
    sharedMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff, 
      emissive: 0xffffff,
      shininess: 1
    });

    function createNewCube() {
        sharedMaterial.color.setRGB(rgb[0]/255, rgb[1]/255, rgb[2]/255);
        sharedMaterial.emissive.setRGB(rgb[0]/255, rgb[1]/255, rgb[2]/255);
        const newCube = new THREE.Mesh(geometry, sharedMaterial);
        newCube.lookAt(camera.position);
        newCube.position.z = 1; 
        newCube.position.x = (Math.random() - 0.5) * visibleWidth;

        let p = getPitch().pitch;

        if (p < 130) {
          newCube.position.x = (Math.random() - 0.5) * visibleWidth * 0.3;
        } else if (p < 400) {
          newCube.position.x = (Math.random() - 0.5) * visibleWidth * 0.3 + visibleWidth * 0.3;
        } else {
          newCube.position.x = (Math.random() - 0.5) * visibleWidth * 0.3 + visibleWidth * 0.6;
        }

        newCube.position.y = visibleHeight * 10;
        newCube.castShadow = true;
        newCube.receiveShadow = true;
        scene.add(newCube);
        cube.push(newCube);
    }

    function animate() {
        update();
        callCube();

        plane2.material.color.setRGB((255-rgb[0])/255, (255-rgb[1])/255, (255-rgb[2])/255);

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

            cube[i].position.y -= 0.1 * ((loudness + 1) * 0.1);
            if (cube[i].position.y <= -visibleHeight * 10) {
                scene.remove(cube[i]);
                cube[i].geometry.dispose();
                cube[i].material.dispose();
                cube.splice(i, 1);
                i--;
            }
        }

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

    resizeHandler = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', resizeHandler);
}

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
    material = null;
}
