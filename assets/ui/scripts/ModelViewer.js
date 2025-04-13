/**
 * ModelViewer class for rendering 3D models in the UI
 */
export class ModelViewer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element with ID ${canvasId} not found.`);
            return;
        }
        
        this.init();
    }
    
    init() {
        // Set up Three.js scene
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 5);
        
        // Set up renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        // Add orbit controls for interaction
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 10;
        this.controls.enablePan = false;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 2.0;
        
        // Add lighting
        this.addLights();
        
        // Create a placeholder cube initially
        this.createPlaceholder();
        
        // Set up animation loop
        this.animate = this.animate.bind(this);
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', this.onResize.bind(this));
        
        // Initialize GLTF loader
        this.loader = new THREE.GLTFLoader();
        
        // Current model
        this.currentModel = null;
        
        // Try to load the default model
        //this.loadModel('models/players/player.gltf');
    }
    
    addLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Main directional light (like sunlight)
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(5, 5, 5);
        mainLight.castShadow = true;
        this.scene.add(mainLight);
        
        // Front fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
        fillLight.position.set(-5, 0, 5);
        this.scene.add(fillLight);
        
        // Top light for better highlighting
        const topLight = new THREE.PointLight(0xffffff, 0.5);
        topLight.position.set(0, 5, 0);
        this.scene.add(topLight);
    }
    
    createPlaceholder() {
        // Create a group to hold all placeholder objects
        this.placeholderGroup = new THREE.Group();
        
        // Create a cube
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        
        // Create materials with different colors for each face
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0xff5eae }), // pink
            new THREE.MeshStandardMaterial({ color: 0x00ca9d }), // teal
            new THREE.MeshStandardMaterial({ color: 0xffee77 }), // yellow
            new THREE.MeshStandardMaterial({ color: 0x3498db }), // blue
            new THREE.MeshStandardMaterial({ color: 0xe74c3c }), // red
            new THREE.MeshStandardMaterial({ color: 0x2ecc71 })  // green
        ];
        
        const cube = new THREE.Mesh(geometry, materials);
        this.placeholderGroup.add(cube);
        
        // Add small spheres at the corners for decoration
        const sphereGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const sphereMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            metalness: 0.7,
            roughness: 0.2
        });
        
        // Add spheres at key positions
        const positions = [
            [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
            [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
        ];
        
        positions.forEach(pos => {
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.set(pos[0], pos[1], pos[2]);
            this.placeholderGroup.add(sphere);
        });
        
        // Add the group to the scene
        this.scene.add(this.placeholderGroup);
    }
    
    animate() {
        requestAnimationFrame(this.animate);
        
        // Rotate the placeholder slightly on each frame for a more dynamic effect
        if (this.placeholderGroup && this.placeholderGroup.visible) {
            this.placeholderGroup.rotation.y += 0.005;
            this.placeholderGroup.rotation.x += 0.002;
        }
        
        if (this.controls) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onResize() {
        if (!this.camera || !this.renderer || !this.canvas) return;
        
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    }
    
    /**
     * Replace {{CDN_ASSETS_URL}} with proper asset URL prefix
     * @param {string} path - Asset path
     * @returns {string} Full URL with prefix
     */
    getAssetUrl(path) {
        // If the path already includes the CDN placeholder or is an absolute URL, return as is
        if (path.includes('{{CDN_ASSETS_URL}}') || path.startsWith('http')) {
            return path;
        }
        
        // Add the CDN placeholder to the path
        return `assets/${path}`;
    }
    
    /**
     * Load and display a 3D model, with fallback to placeholder
     * @param {string} modelUrl - URL to the GLTF/GLB model
     */
    loadModel(modelUrl) {
        if (!this.loader || !this.scene) return;
        
        const fullUrl = this.getAssetUrl(modelUrl);
        console.log(`ModelViewer: Loading model from ${fullUrl}`);
        
        // Show placeholder while loading
        if (this.placeholderGroup) {
            this.placeholderGroup.visible = false;
        }
        
        // Remove previous model if exists
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
            this.currentModel = null;
        }
        
        // Load the model
        this.loader.load(
            fullUrl,
            (gltf) => {
                const model = gltf.scene;
                
                // Center the model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                // Get the max dimension to normalize scale
                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleFactor = 2 / maxDim;
                
                model.scale.multiplyScalar(scaleFactor);
                model.position.sub(center.multiplyScalar(scaleFactor));
                
                // Position slightly above origin for better view
                model.position.y -= 0.5;
                
                // Add model to scene
                this.scene.add(model);
                this.currentModel = model;
                
                // Hide placeholder
                if (this.placeholderGroup) {
                    this.placeholderGroup.visible = false;
                }
                
                // Set camera to look at model
                this.camera.lookAt(model.position);
                
                console.log('ModelViewer: Model loaded successfully');
            },
            (progress) => {
                const percentComplete = (progress.loaded / progress.total) * 100;
                console.log(`ModelViewer: Loading progress: ${percentComplete.toFixed(2)}%`);
            },
            (error) => {
                console.error('ModelViewer: Error loading model:', error);
                
                // Show placeholder if loading failed
                if (this.placeholderGroup) {
                    this.placeholderGroup.visible = true;
                }
            }
        );
    }
} 