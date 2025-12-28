// Game variables
let scene, camera, renderer;
let plane;
let pillars = [];
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
    scene.background = new THREE.Color(0x87CEEB); // Sky blue

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

    // Create ground
    createGround();

    // Generate pillars across the map
    generatePillars();

    // Create golden ring at the end
    createGoldenRing();

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

// Create ground
function createGround() {
    // Create a realistic grass texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base grass color
    ctx.fillStyle = '#3a9d23';
    ctx.fillRect(0, 0, 512, 512);

    // Add grass texture variation
    for (let i = 0; i < 8000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const shade = Math.random() * 0.3 + 0.7;
        const green = Math.floor(157 * shade);
        const red = Math.floor(58 * shade);
        const blue = Math.floor(35 * shade);
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

    const grassTexture = new THREE.CanvasTexture(canvas);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(100, 160);

    const groundGeometry = new THREE.PlaneGeometry(10000, 16000, 100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    ground.position.y = 0;
    ground.position.z = 8000; // Move ground forward so it extends from 0 to 16000
    ground.receiveShadow = true;
    scene.add(ground);
}

// Create a pillar at a specific position
function createPillar(xPosition, zPosition) {
    const pillarGroup = new THREE.Group();

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
    pillarGroup.position.set(0, 0, 0);
    pillarGroup.userData = { xPosition, zPosition, passed: false };

    scene.add(pillarGroup);
    pillars.push(pillarGroup);
}

// Generate random pillars across the map
function generatePillars() {
    // Generate pillars scattered across a wide area
    for (let z = 20; z < levelDistance - 100; z += PILLAR_SPACING) {
        // Random number of pillars per row (1-3)
        const numPillars = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < numPillars; i++) {
            // Random X position across the width
            const xPosition = (Math.random() - 0.5) * 80; // -40 to 40
            createPillar(xPosition, z);
        }
    }
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

    if (!level.unlocked) {
        alert(`Level ${levelNum} is locked! Complete level ${levelNum - 1} first.`);
        return;
    }

    currentLevel = levelNum;
    levelDistance = level.distance;
    startGame();
}

// Start game
function startGame() {
    gameStarted = true;
    document.getElementById('start-screen').classList.add('hidden');
    updateLevelDisplay();
}

// Restart game
function restartGame() {
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

    // Generate new pillars
    generatePillars();

    // Recreate golden ring
    createGoldenRing();

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

    // Auto-advance to next level after a delay
    if (currentLevel < LEVELS.length) {
        setTimeout(() => {
            gameOverDiv.classList.add('hidden');
            currentLevel++;
            levelDistance = LEVELS[currentLevel - 1].distance;
            restartGame();
        }, 3000);
    }
}

// Update level buttons
function updateLevelButtons() {
    document.querySelectorAll('.level-btn').forEach((btn, index) => {
        if (LEVELS[index].unlocked) {
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
