/**
 * Manages the Three.js scene, camera, renderer, and lighting
 */
export class SceneManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
    }

    /**
     * Initialize the scene manager
     */
    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupLights();
    }

    /**
     * Set up the Three.js scene
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
    }

    /**
     * Set up the camera
     */
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 0, 15);
    }

    /**
     * Set up the renderer
     */
    setupRenderer() {
        const canvas = document.getElementById('cymatic-canvas');
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    /**
     * Set up the camera controls
     */
    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 50;
        this.controls.minDistance = 5;
    }

    /**
     * Set up lighting for the scene
     */
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Point lights for each layer
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4];
        colors.forEach((color, index) => {
            const pointLight = new THREE.PointLight(color, 0.3, 10);
            pointLight.position.set(0, 0, index * 2);
            this.scene.add(pointLight);
        });
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Render the scene
     */
    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Reset camera position
     */
    resetCamera() {
        this.camera.position.set(0, 0, 15);
        this.controls.reset();
    }

    /**
     * Get the scene
     */
    getScene() {
        return this.scene;
    }

    /**
     * Get the camera
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Get the renderer
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * Get the controls
     */
    getControls() {
        return this.controls;
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.controls) {
            this.controls.dispose();
        }
    }
} 