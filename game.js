// Game variables
let scene, camera, renderer;
let plane;
let pillars = [];
let barriers = []; // Boundary barriers
let ground = null; // Ground mesh
let towerModel = null; // Tower GLB model for pillars
let goldenRing = null;
let directionalLight; // Main sun light that follows the plane
let keys = {};
let gameStarted = false;
let gameOver = false;

// Game settings
const PILLAR_HEIGHT = 20;
const PILLAR_WIDTH = 2;
const PILLAR_SPACING = 50;
const PILLAR_GAP = 20;
const INITIAL_SPEED = 0.5;
const MAX_SPEED = 5;
const MIN_SPEED = 0.1;

// ===== PLANE ROTATION CONTROL =====
// Adjust these values to rotate the plane permanently
// Values are in radians: Math.PI / 2 = 90 degrees, Math.PI = 180 degrees
const PLANE_PERMANENT_ROTATION = {
    x: 0,              // Pitch rotation (nose up/down)
    y: 0,              // Yaw rotation (turn left/right) - currently facing forward
    z: 0              // Roll rotation (tilt left/right)
};

// Plane model scale (adjust if your Blender model is too big or too small)
const PLANE_MODEL_SCALE = 1;  // 1 = original size, 0.5 = half size, 2 = double size
// ==================================

// Level system
const LEVELS = [
    { number: 1, distance: 3000, unlocked: true },
    { number: 2, distance: 6000, unlocked: false },
    { number: 3, distance: 9000, unlocked: false },
    { number: 4, distance: 12000, unlocked: false },
    { number: 5, distance: 15000, unlocked: false }
];

// ===== DEVELOPER SETTINGS =====
// Set to true to lock levels (must complete previous level to unlock)
// Set to false to unlock all levels for testing
const LOCK_LEVEL = true;
// ==============================

// Level themes
const LEVEL_THEMES = {
    1: { // Grass
        name: 'Grass',
        groundColor: '#3a9d23',
        groundVariation: { r: 58, g: 157, b: 35 },
        skyColor: 0x87CEEB, // Sky blue
        fogColor: 0x87CEEB,
        ambientLight: 0xffffff,
        skyBackground: 'grass.png' // No image, use solid color
    },
    2: { // Ice
        name: 'Ice',
        groundColor: '#d0e8f2',
        groundVariation: { r: 208, g: 232, b: 242 },
        skyColor: 0xb0d4e8, // Light blue-gray
        fogColor: 0xb0d4e8,
        ambientLight: 0xe0f0ff,
        skyBackground: 'ice.png' // No image, use solid color
    },
    3: { // Desert
        name: 'Desert',
        groundColor: '#d4a574',
        groundVariation: { r: 212, g: 165, b: 116 },
        skyColor: 0xffd89b, // Sandy yellow
        fogColor: 0xffd89b,
        ambientLight: 0xfff4e0,
        skyBackground: 'desert.png' // No image, use solid color
    },
    4: { // Halloween
        name: 'Halloween',
        groundColor: '#6b2d8f',
        groundVariation: { r: 107, g: 45, b: 143 },
        skyColor: 0x2a0845, // Dark purple
        fogColor: 0x2a0845,
        ambientLight: 0xff8800,
        skyBackground: 'halloween.png' // Halloween sky image
    },
    5: { // Above clouds
        name: 'Above Clouds',
        groundColor: '#ffffff',
        groundVariation: { r: 255, g: 255, b: 255 },
        skyColor: 0x4a90e2, // Bright sky blue
        fogColor: 0x4a90e2,
        ambientLight: 0xffffff,
        skyBackground: 'clouds.png' // No image, use solid color
    }
};

// Game state
let currentLevel = 1;
let levelDistance = LEVELS[0].distance;
let speed = INITIAL_SPEED;
let score = 0;
let distance = 0;
let planeRotation = { x: 0, y: 0, z: 0 };
let planePosition = { x: 0, y: 5, z: 0 };
let cameraAngle = 0; // Camera rotation angle around the plane (in radians)
let firstPersonView = false; // Toggle for first-person camera view

// Initialize the game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 50, 20000);
    scene.background = new THREE.Color(0x87CEEB); // Default sky blue

    // Create camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        25000
    );
    camera.position.set(0, 7, -10);
    camera.lookAt(0, 5, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Main directional light (sun)
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;

    // Configure shadow properties for better quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.bias = -0.0001;

    scene.add(directionalLight);

    // Add point lights for atmosphere
    const pointLight1 = new THREE.PointLight(0x00d4ff, 1, 50);
    pointLight1.position.set(-10, 10, 20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00ff88, 1, 50);
    pointLight2.position.set(10, 10, 20);
    scene.add(pointLight2);

    // Create plane
    createPlane();

    // Load tower model for pillars (will generate pillars after loading)
    loadTowerModel();

    // Create ground with level theme
    createGround(currentLevel);

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('main-menu-btn').addEventListener('click', returnToMainMenu);

    // Level selection listeners
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', selectLevel);
    });

    // Initialize level button states
    updateLevelButtons();

    // Start animation loop
    animate();
}

// Create the plane
function createPlane() {
    const loader = new THREE.GLTFLoader();

    // Load the Blender model
    loader.load(
        'Untitled.glb',
        function (gltf) {
            // Get the loaded model
            const planeModel = gltf.scene;

            // Enable shadows for all meshes in the model
            planeModel.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Scale the model if needed (adjust this value based on your model size)
            planeModel.scale.set(PLANE_MODEL_SCALE, PLANE_MODEL_SCALE, PLANE_MODEL_SCALE);

            // Set position
            planeModel.position.set(planePosition.x, planePosition.y, planePosition.z);

            // Apply permanent rotation from configuration
            planeModel.rotation.x = PLANE_PERMANENT_ROTATION.x;
            planeModel.rotation.y = PLANE_PERMANENT_ROTATION.y;
            planeModel.rotation.z = PLANE_PERMANENT_ROTATION.z;

            // Add to scene
            scene.add(planeModel);
            plane = planeModel;

            console.log('Plane model loaded successfully!');
        },
        function (xhr) {
            // Loading progress
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            // Error handling
            console.error('Error loading plane model:', error);
            alert('Failed to load plane model. Check console for details.');
        }
    );
}

// Load tower model for pillars
function loadTowerModel() {
    // Select model based on current level
    let modelFile;
    switch (currentLevel) {
        case 1:
            modelFile = 'log.glb';
            break;
        case 2:
            modelFile = 'tower.glb';
            break;
        case 3:
            modelFile = 'cactus.glb';
            break;
        case 4:
            modelFile = 'dead_tree.glb';
            break;
        case 5:
            modelFile = 'tower.glb';
            break;
        default:
            modelFile = 'log.glb'; // Fallback
    }

    const loader = new THREE.GLTFLoader();
    loader.load(
        modelFile,
        function (gltf) {
            // Store the loaded model
            towerModel = gltf.scene;

            // Fix materials and enable shadows for all meshes in the model
            towerModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // Fix material properties for better lighting
                    if (child.material) {
                        // Ensure the material responds to lights properly
                        child.material.needsUpdate = true;

                        // If the material is too dark, adjust its properties
                        if (child.material.color) {
                            // Brighten the color significantly
                            const color = child.material.color;
                            const brightness = (color.r + color.g + color.b) / 3;

                            // If the color is dark, brighten it significantly
                            if (brightness < 0.3) {
                                // Multiply by 5 to make it much brighter
                                child.material.color.multiplyScalar(5);
                            } else if (brightness < 0.5) {
                                // Still brighten moderately dark colors
                                child.material.color.multiplyScalar(2);
                            }
                        }

                        // Adjust metalness and roughness for better appearance
                        if (child.material.metalness !== undefined) {
                            // Reduce metalness to make it less reflective
                            child.material.metalness = 0.1;
                        }

                        if (child.material.roughness !== undefined) {
                            // Increase roughness for better diffuse lighting
                            child.material.roughness = 0.9;
                        }

                        // Add emissive glow to make it visible even in shadows
                        if (child.material.emissive && child.material.color) {
                            // Make it emit light based on its color
                            child.material.emissive.copy(child.material.color);
                            child.material.emissive.multiplyScalar(0.3); // 30% emissive
                            child.material.emissiveIntensity = 0.5;
                        }
                    }
                }
            });

            console.log('Tower model loaded successfully');

            // Remove all old pillars from the scene before generating new ones
            pillars.forEach(pillar => {
                scene.remove(pillar);
                // Also dispose of geometries and materials to free memory
                pillar.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            });
            pillars = [];

            // Remove old barriers
            barriers.forEach(barrier => scene.remove(barrier));
            barriers = [];

            // Remove old golden ring
            if (goldenRing) {
                scene.remove(goldenRing);
                goldenRing = null;
            }

            // Generate pillars NOW that the model is loaded
            generatePillars();

            // Create boundary barriers
            createBarriers();

            // Create golden ring at the end
            createGoldenRing();
        },
        function (xhr) {
            // Loading progress
            console.log('Tower: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            // Error handling
            console.error('Error loading tower model:', error);
            alert('Failed to load tower model. Using default pillars.');

            // Generate pillars with fallback boxes
            generatePillars();
            createBarriers();
            createGoldenRing();
        }
    );
}


// Create ground based on level theme
function createGround(level = 1) {
    // Remove existing ground if it exists
    if (ground) {
        scene.remove(ground);
        ground.geometry.dispose();
        ground.material.dispose();
        ground = null;
    }

    const theme = LEVEL_THEMES[level];

    // Create a texture based on the level theme
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base color
    ctx.fillStyle = theme.groundColor;
    ctx.fillRect(0, 0, 512, 512);

    // Add texture variation based on level
    if (level === 1) { // Grass
        // Add grass texture variation
        for (let i = 0; i < 8000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const shade = Math.random() * 0.3 + 0.7;
            const green = Math.floor(theme.groundVariation.g * shade);
            const red = Math.floor(theme.groundVariation.r * shade);
            const blue = Math.floor(theme.groundVariation.b * shade);
            ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
            ctx.fillRect(x, y, 2, 2);
        }

        // Add darker patches for realism
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 20 + 10;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(45, 122, 31, 0.3)');
            gradient.addColorStop(1, 'rgba(45, 122, 31, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
    } else if (level === 2) { // Ice
        // Add ice cracks and texture
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const length = Math.random() * 50 + 20;
            const angle = Math.random() * Math.PI * 2;
            ctx.strokeStyle = 'rgba(180, 220, 240, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
            ctx.stroke();
        }

        // Add sparkle effect
        for (let i = 0; i < 3000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x, y, 1, 1);
        }
    } else if (level === 3) { // Desert
        // Add sand texture
        for (let i = 0; i < 10000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const shade = Math.random() * 0.2 + 0.8;
            const r = Math.floor(theme.groundVariation.r * shade);
            const g = Math.floor(theme.groundVariation.g * shade);
            const b = Math.floor(theme.groundVariation.b * shade);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x, y, 1, 1);
        }

        // Add sand dunes (wavy patterns)
        for (let i = 0; i < 30; i++) {
            const y = Math.random() * 512;
            ctx.strokeStyle = 'rgba(200, 150, 100, 0.2)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x < 512; x += 10) {
                ctx.lineTo(x, y + Math.sin(x * 0.1) * 5);
            }
            ctx.stroke();
        }
    } else if (level === 4) { // Halloween
        // Add dark purple texture with spooky patterns
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const shade = Math.random() * 0.3 + 0.7;
            const r = Math.floor(theme.groundVariation.r * shade);
            const g = Math.floor(theme.groundVariation.g * shade);
            const b = Math.floor(theme.groundVariation.b * shade);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x, y, 2, 2);
        }

        // Add orange glowing cracks
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 15 + 5;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(255, 136, 0, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 136, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
    } else if (level === 5) { // Above clouds
        // Create fluffy cloud texture
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 40 + 20;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.5, 'rgba(240, 240, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(220, 220, 240, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add soft shadows for depth
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 30 + 10;
            ctx.fillStyle = 'rgba(200, 200, 220, 0.2)';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const groundTexture = new THREE.CanvasTexture(canvas);
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(100, 160);

    const groundGeometry = new THREE.PlaneGeometry(10000, 16000, 100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: groundTexture,
        roughness: level === 2 ? 0.2 : 0.8, // Ice is smoother
        metalness: level === 2 ? 0.3 : 0.1, // Ice is more reflective
        side: THREE.DoubleSide
    });

    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    ground.position.y = 0;
    ground.position.z = 8000; // Move ground forward so it extends from 0 to 16000
    ground.receiveShadow = true;
    scene.add(ground);
}

// Create a pillar at a specific position
function createPillar(xPosition, zPosition) {
    const pillarGroup = new THREE.Group();

    // Check if tower model is loaded
    if (towerModel) {
        // Clone the tower model
        const towerClone = towerModel.clone();

        // Enable shadows for all meshes in the cloned model
        towerClone.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Position the tower
        towerClone.position.set(xPosition, 0, zPosition);

        // You can adjust the scale if needed
        // towerClone.scale.set(1, 1, 1);

        pillarGroup.add(towerClone);
    } else {
        // Fallback to default pillar if model not loaded yet
        const pillarGeometry = new THREE.BoxGeometry(PILLAR_WIDTH, PILLAR_HEIGHT, PILLAR_WIDTH);
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.7,
            metalness: 0.3
        });

        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(xPosition, PILLAR_HEIGHT / 2, zPosition);
        pillar.castShadow = true;
        pillar.receiveShadow = true;

        // Add a glowing top
        const topGeometry = new THREE.BoxGeometry(PILLAR_WIDTH + 0.2, 0.5, PILLAR_WIDTH + 0.2);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.7
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.set(xPosition, PILLAR_HEIGHT + 0.25, zPosition);
        top.castShadow = true;
        top.receiveShadow = true;

        pillarGroup.add(pillar);
        pillarGroup.add(top);
    }

    pillarGroup.position.set(0, 0, 0);
    pillarGroup.userData = { xPosition, zPosition, passed: false };

    scene.add(pillarGroup);
    pillars.push(pillarGroup);
}

// Generate random pillars across the map
function generatePillars() {
    // Generate pillars scattered across a wide area
    // Start at 60m to give player a safe zone at the beginning
    for (let z = 60; z < levelDistance - 100; z += PILLAR_SPACING) {
        // Random number of pillars per row (1-3)
        const numPillars = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < numPillars; i++) {
            // Random X position across the width
            const xPosition = (Math.random() - 0.5) * 80; // -40 to 40
            createPillar(xPosition, z);
        }
    }
}

// Create invisible barrier walls to constrain plane movement
function createBarriers() {
    // Remove existing barriers if any
    barriers.forEach(barrier => scene.remove(barrier));
    barriers = [];

    const BARRIER_X_POSITION = 42; // Slightly beyond the pillar spawn area (-40 to 40)
    const barrierHeight = 100; // Tall enough to prevent flying over
    const barrierDepth = levelDistance; // Extends the full length of the level

    // Create left barrier
    const leftBarrierGeometry = new THREE.BoxGeometry(1, barrierHeight, barrierDepth);
    const barrierMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0, // Completely invisible
        roughness: 0.5,
        metalness: 0.5
    });
    const leftBarrier = new THREE.Mesh(leftBarrierGeometry, barrierMaterial);
    leftBarrier.position.set(-BARRIER_X_POSITION, barrierHeight / 2, barrierDepth / 2);
    leftBarrier.visible = false; // Make invisible
    leftBarrier.userData = { isBarrier: true, xPosition: -BARRIER_X_POSITION };
    scene.add(leftBarrier);
    barriers.push(leftBarrier);

    // Create right barrier
    const rightBarrierGeometry = new THREE.BoxGeometry(1, barrierHeight, barrierDepth);
    const rightBarrier = new THREE.Mesh(rightBarrierGeometry, barrierMaterial);
    rightBarrier.position.set(BARRIER_X_POSITION, barrierHeight / 2, barrierDepth / 2);
    rightBarrier.visible = false; // Make invisible
    rightBarrier.userData = { isBarrier: true, xPosition: BARRIER_X_POSITION };
    scene.add(rightBarrier);
    barriers.push(rightBarrier);
}

// Create golden ring at the end of the level
function createGoldenRing() {
    // Remove existing ring if any
    if (goldenRing) {
        scene.remove(goldenRing);
    }

    const ringGroup = new THREE.Group();

    // Outer ring
    const outerGeometry = new THREE.TorusGeometry(8, 0.5, 16, 32);
    const outerMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700, // Gold
        emissive: 0xFFD700,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.9
    });
    const outerRing = new THREE.Mesh(outerGeometry, outerMaterial);
    outerRing.rotation.y = Math.PI;
    outerRing.castShadow = true;
    outerRing.receiveShadow = true;
    ringGroup.add(outerRing);

    // Inner safe zone indicator
    const innerGeometry = new THREE.TorusGeometry(6, 0.3, 16, 32);
    const innerMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00, // Green
        emissive: 0x00ff00,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.6,
        roughness: 0.4,
        metalness: 0.6
    });
    const innerRing = new THREE.Mesh(innerGeometry, innerMaterial);
    innerRing.rotation.y = Math.PI;
    innerRing.castShadow = true;
    innerRing.receiveShadow = true;
    ringGroup.add(innerRing);

    // Position at the end of the level
    ringGroup.position.set(0, 8, levelDistance - 50);
    ringGroup.userData = { zPosition: levelDistance - 50 };

    scene.add(ringGroup);
    goldenRing = ringGroup;
}

// Update scene theme based on level
function updateSceneTheme(level = 1) {
    const theme = LEVEL_THEMES[level];

    // Update sky background (image or solid color)
    if (theme.skyBackground) {
        // Load sky background image
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            theme.skyBackground,
            function (texture) {
                // Create a large plane for the sky background at the horizon
                // Remove old sky plane if it exists
                const oldSkyPlane = scene.getObjectByName('skyBackgroundPlane');
                if (oldSkyPlane) {
                    scene.remove(oldSkyPlane);
                }

                // Create a huge plane positioned at the horizon
                const skyGeometry = new THREE.PlaneGeometry(50000, 10000);
                const skyMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                const skyPlane = new THREE.Mesh(skyGeometry, skyMaterial);
                skyPlane.name = 'skyBackgroundPlane';

                // Position it far away at the horizon, at ground level
                skyPlane.position.set(0, 5000, 15000); // High up and far away
                skyPlane.rotation.x = 0; // Vertical

                scene.add(skyPlane);

                // Set scene background to theme color as fallback
                scene.background = new THREE.Color(theme.skyColor);
            },
            undefined,
            function (error) {
                console.error('Error loading sky background:', error);
                // Fallback to solid color
                scene.background = new THREE.Color(theme.skyColor);
            }
        );
    } else {
        // No image, use solid color
        scene.background = new THREE.Color(theme.skyColor);

        // Remove sky plane if it exists
        const oldSkyPlane = scene.getObjectByName('skyBackgroundPlane');
        if (oldSkyPlane) {
            scene.remove(oldSkyPlane);
        }
    }

    // Update fog
    scene.fog = new THREE.Fog(theme.fogColor, 50, 20000);

    // Update ambient light color
    const ambientLight = scene.children.find(child => child.type === 'AmbientLight');
    if (ambientLight) {
        ambientLight.color = new THREE.Color(theme.ambientLight);
    }
}


// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle key down
function onKeyDown(event) {
    const key = event.key.toLowerCase();
    keys[key] = true;

    // Toggle first-person view with 'C' key
    if (key === 'c' && plane) {
        firstPersonView = !firstPersonView;

        // Make plane invisible in first-person, visible in third-person
        plane.visible = !firstPersonView;
    }
}

// Handle key up
function onKeyUp(event) {
    keys[event.key.toLowerCase()] = false;
}

// Select level
function selectLevel(event) {
    const levelNum = parseInt(event.target.dataset.level);
    const level = LEVELS[levelNum - 1];

    // Only check if locked when LOCK_LEVEL is true
    if (LOCK_LEVEL && !level.unlocked) {
        alert(`Level ${levelNum} is locked! Complete level ${levelNum - 1} first.`);
        return;
    }

    currentLevel = levelNum;
    levelDistance = level.distance;

    // Apply level theme before starting
    updateSceneTheme(currentLevel);
    createGround(currentLevel);

    // Remove old pillars
    pillars.forEach(pillar => scene.remove(pillar));
    pillars = [];

    // Reload tower model for the selected level (will generate pillars, barriers, and golden ring)
    loadTowerModel();

    // Hide start screen
    document.getElementById('start-screen').classList.add('hidden');

    // Start the game
    gameStarted = true;
    gameOver = false;
}

// Start game
function startGame() {
    gameStarted = true;
    document.getElementById('start-screen').classList.add('hidden');
    updateLevelDisplay();
}

// Restart game
function restartGame() {
    // Check if we're continuing to next level (button says "Continue")
    const restartBtn = document.getElementById('restart-btn');
    const gameOverTitle = document.getElementById('game-over').querySelector('h1');

    if (restartBtn.textContent === 'Continue' && currentLevel < LEVELS.length) {
        // Advance to next level
        currentLevel++;
        levelDistance = LEVELS[currentLevel - 1].distance;
    }

    // Reset button text and title color for next time
    restartBtn.textContent = 'Restart Game';
    gameOverTitle.textContent = 'Game Over!';
    gameOverTitle.style.color = '';

    // Reset game state
    gameOver = false;
    gameStarted = true;
    speed = INITIAL_SPEED;
    score = 0;
    distance = 0;
    planePosition = { x: 0, y: 5, z: 0 };
    planeRotation = { x: 0, y: 0, z: 0 };
    cameraAngle = 0; // Reset camera angle
    firstPersonView = false; // Reset to third-person view

    // Reset plane position and rotation
    plane.position.set(0, 5, 0);
    // Apply permanent rotation from configuration
    plane.rotation.set(
        PLANE_PERMANENT_ROTATION.x,
        PLANE_PERMANENT_ROTATION.y,
        PLANE_PERMANENT_ROTATION.z
    );
    // Ensure plane is visible
    plane.visible = true;

    // Remove all pillars
    pillars.forEach(pillar => scene.remove(pillar));
    pillars = [];

    // Update level theme (sky, fog, ambient light)
    updateSceneTheme(currentLevel);

    // Recreate ground with level theme
    createGround(currentLevel);

    // Reload tower model for the new level (will generate pillars after loading)
    loadTowerModel();

    // Hide game over screen
    document.getElementById('game-over').classList.add('hidden');

    // Update UI
    updateUI();
    updateLevelDisplay();
}

// Return to main menu
function returnToMainMenu() {
    // Reset game state
    gameOver = false;
    gameStarted = false;
    speed = INITIAL_SPEED;
    score = 0;
    distance = 0;
    planePosition = { x: 0, y: 5, z: 0 };
    planeRotation = { x: 0, y: 0, z: 0 };
    cameraAngle = 0; // Reset camera angle
    firstPersonView = false; // Reset to third-person view

    // Reset plane position
    if (plane) {
        plane.position.set(0, 5, 0);
        plane.rotation.set(
            PLANE_PERMANENT_ROTATION.x,
            PLANE_PERMANENT_ROTATION.y,
            PLANE_PERMANENT_ROTATION.z
        );
        // Ensure plane is visible
        plane.visible = true;
    }

    // Remove all pillars
    pillars.forEach(pillar => scene.remove(pillar));
    pillars = [];

    // Hide game over screen
    document.getElementById('game-over').classList.add('hidden');

    // Show start screen with level selection
    document.getElementById('start-screen').classList.remove('hidden');

    // Update level buttons
    updateLevelButtons();
}

// Update game state
function update() {
    if (!gameStarted || gameOver) return;

    // Handle speed controls
    if (keys['w']) {
        speed = Math.min(speed + 0.01, MAX_SPEED);
    }
    if (keys['s']) {
        speed = Math.max(speed - 0.01, MIN_SPEED);
    }

    // Handle steering (D = right, A = left)
    if (keys['d']) {
        planePosition.x -= 0.3;
        planeRotation.z = Math.min(planeRotation.z + 0.02, 0.3);
    } else if (keys['a']) {
        planePosition.x += 0.3;
        planeRotation.z = Math.max(planeRotation.z - 0.02, -0.3);
    } else {
        // Return to neutral
        planeRotation.z *= 0.9;
    }

    // Handle pitch (up/down)
    if (keys['arrowup']) {
        planePosition.y = Math.max(planePosition.y - 0.1, 1);
        planeRotation.x = Math.min(planeRotation.x + 0.02, 0.3);
    } else if (keys['arrowdown']) {
        planePosition.y = Math.min(planePosition.y + 0.1, 15);
        planeRotation.x = Math.max(planeRotation.x - 0.02, -0.3);
    } else {
        // Return to neutral
        planeRotation.x *= 0.9;
    }

    // Handle camera rotation around the plane (left/right arrows)
    if (keys['arrowright']) {
        cameraAngle += 0.02; // Rotate camera clockwise around plane
    } else if (keys['arrowleft']) {
        cameraAngle -= 0.02; // Rotate camera counter-clockwise around plane
    }

    // Update plane position and rotation
    plane.position.x = planePosition.x;
    plane.position.y = planePosition.y;
    plane.rotation.z = planeRotation.z;
    plane.rotation.x = planeRotation.x;

    // Move plane forward
    planePosition.z += speed;
    plane.position.z = planePosition.z;

    // Update distance
    distance += speed;

    // Check which pillars have been passed
    pillars.forEach((pillar) => {
        if (!pillar.userData.passed && pillar.userData.zPosition < plane.position.z) {
            pillar.userData.passed = true;
            score += 10;
        }
    });

    // Check collisions
    checkCollisions();

    // Generate more pillars if needed
    const furthestPillar = pillars.reduce((max, p) =>
        p.userData.zPosition > max ? p.userData.zPosition : max, 0);

    if (furthestPillar < plane.position.z + 200) {
        // Generate more pillars ahead
        for (let z = furthestPillar + PILLAR_SPACING; z < plane.position.z + 500; z += PILLAR_SPACING) {
            const numPillars = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numPillars; i++) {
                const xPosition = (Math.random() - 0.5) * 80;
                createPillar(xPosition, z);
            }
        }
    }

    // Remove pillars that are far behind the plane
    for (let i = pillars.length - 1; i >= 0; i--) {
        if (pillars[i].userData.zPosition < plane.position.z - 100) {
            scene.remove(pillars[i]);
            pillars.splice(i, 1);
        }
    }

    // Check if plane reached the golden ring
    if (goldenRing && plane.position.z >= goldenRing.userData.zPosition - 2 &&
        plane.position.z <= goldenRing.userData.zPosition + 2) {

        // Check if plane is in the center of the ring (within inner green circle)
        const distanceFromCenter = Math.sqrt(
            Math.pow(plane.position.x - goldenRing.position.x, 2) +
            Math.pow(plane.position.y - goldenRing.position.y, 2)
        );

        if (distanceFromCenter <= 6) {
            // Success! Passed through the ring
            completeLevel();
        } else if (distanceFromCenter > 6 && distanceFromCenter < 8) {
            // Hit the outer ring - game over
            endGame();
        }
    }

    // Check if plane passed the ring without going through it
    if (goldenRing && plane.position.z > goldenRing.userData.zPosition + 10) {
        endGame();
    }

    // Update camera based on view mode
    if (firstPersonView) {
        // First-person view (nose-mounted camera)
        // Position camera at the front tip of the plane
        camera.position.x = plane.position.x;
        camera.position.y = plane.position.y;
        camera.position.z = plane.position.z + 3; // At the nose tip

        // Look forward in the direction the plane is moving
        camera.lookAt(
            plane.position.x,
            plane.position.y,
            plane.position.z + 100 // Look far ahead
        );
    } else {
        // Third-person orbital view
        const cameraDistance = 12; // Distance from plane
        const cameraHeight = 3; // Height above plane

        // Calculate camera position using polar coordinates
        camera.position.x = plane.position.x + Math.sin(cameraAngle) * cameraDistance;
        camera.position.y = plane.position.y + cameraHeight;
        camera.position.z = plane.position.z - Math.cos(cameraAngle) * cameraDistance;

        // Always look at the plane
        camera.lookAt(plane.position.x, plane.position.y, plane.position.z);
    }

    // Update directional light to follow plane (keeps shadows visible)
    directionalLight.position.set(
        plane.position.x + 50,
        100,
        plane.position.z + 50
    );
    directionalLight.target.position.set(
        plane.position.x,
        0,
        plane.position.z
    );
    directionalLight.target.updateMatrixWorld();

    // Update UI
    updateUI();
}

// Check for collisions
function checkCollisions() {
    // Plane bounding box (accounting for wings)
    const planeBox = {
        minX: plane.position.x - 3, // Wing span
        maxX: plane.position.x + 3,
        minY: plane.position.y - 0.5,
        maxY: plane.position.y + 0.5,
        minZ: plane.position.z - 1,
        maxZ: plane.position.z + 1
    };

    pillars.forEach(pillar => {
        const pillarX = pillar.userData.xPosition;
        const pillarZ = pillar.userData.zPosition;

        // Pillar bounding box
        const pillarBox = {
            minX: pillarX - PILLAR_WIDTH / 2,
            maxX: pillarX + PILLAR_WIDTH / 2,
            minY: 0,
            maxY: PILLAR_HEIGHT,
            minZ: pillarZ - PILLAR_WIDTH / 2,
            maxZ: pillarZ + PILLAR_WIDTH / 2
        };

        // Check for 3D box collision (AABB collision detection)
        const collisionX = planeBox.maxX >= pillarBox.minX && planeBox.minX <= pillarBox.maxX;
        const collisionY = planeBox.maxY >= pillarBox.minY && planeBox.minY <= pillarBox.maxY;
        const collisionZ = planeBox.maxZ >= pillarBox.minZ && planeBox.minZ <= pillarBox.maxZ;

        // If all three axes overlap, there's a collision
        if (collisionX && collisionY && collisionZ) {
            endGame();
        }
    });

    // Check barrier collisions - constrain position instead of ending game
    const BARRIER_X_LIMIT = 42; // Match the barrier position
    const PLANE_HALF_WIDTH = 3; // Half of plane's wing span

    // Constrain plane within barriers (like hitting a wall)
    if (planePosition.x - PLANE_HALF_WIDTH < -BARRIER_X_LIMIT) {
        planePosition.x = -BARRIER_X_LIMIT + PLANE_HALF_WIDTH;
        plane.position.x = planePosition.x;
    } else if (planePosition.x + PLANE_HALF_WIDTH > BARRIER_X_LIMIT) {
        planePosition.x = BARRIER_X_LIMIT - PLANE_HALF_WIDTH;
        plane.position.x = planePosition.x;
    }

    // Check ground collision
    if (plane.position.y < 0.5) {
        endGame();
    }
}

// End game
function endGame() {
    gameOver = true;
    gameStarted = false;

    // Reset button text to "Restart Game" for game over
    const restartBtn = document.getElementById('restart-btn');
    restartBtn.textContent = 'Restart Game';

    // Reset title color to default
    const gameOverDiv = document.getElementById('game-over');
    const gameOverTitle = gameOverDiv.querySelector('h1');
    gameOverTitle.textContent = 'Game Over!';
    gameOverTitle.style.color = '';

    document.getElementById('final-score').textContent = score;
    document.getElementById('final-distance').textContent = Math.floor(distance);
    document.getElementById('game-over').classList.remove('hidden');
}

// Update UI
function updateUI() {
    document.getElementById('speed-display').textContent = Math.floor(speed * 100);
    document.getElementById('score-display').textContent = score;
    document.getElementById('distance-display').textContent = Math.floor(distance);
    updateLevelDisplay();
}

// Update level display
function updateLevelDisplay() {
    const levelInfo = document.getElementById('level-info');
    if (levelInfo) {
        const remaining = Math.max(0, levelDistance - Math.floor(distance));
        levelInfo.textContent = `Level ${currentLevel} - ${remaining}m to goal`;
    }
}

// Complete level
function completeLevel() {
    gameOver = true;
    gameStarted = false;

    // Unlock next level
    if (currentLevel < LEVELS.length) {
        LEVELS[currentLevel].unlocked = true;
        updateLevelButtons();
    }

    // Show completion message
    const gameOverDiv = document.getElementById('game-over');
    const gameOverTitle = gameOverDiv.querySelector('h1');
    gameOverTitle.textContent = currentLevel === LEVELS.length ? 'All Levels Complete!' : 'Level Complete!';
    gameOverTitle.style.color = '#00ff88';

    // Change button text to "Continue"
    const restartBtn = document.getElementById('restart-btn');
    restartBtn.textContent = 'Continue';

    document.getElementById('final-score').textContent = score;
    document.getElementById('final-distance').textContent = Math.floor(distance);
    gameOverDiv.classList.remove('hidden');

    // Player must click "Continue" button to advance to next level
    // No auto-advance
}

// Update level buttons
function updateLevelButtons() {
    document.querySelectorAll('.level-btn').forEach((btn, index) => {
        // If LOCK_LEVEL is false, unlock all levels for testing
        if (!LOCK_LEVEL || LEVELS[index].unlocked) {
            btn.classList.remove('locked');
            btn.disabled = false;
        } else {
            btn.classList.add('locked');
            btn.disabled = true;
        }
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

// Initialize the game when the page loads
window.addEventListener('load', init);
