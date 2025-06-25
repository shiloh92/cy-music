import { SceneManager } from './SceneManager.js';
import { MeshManager } from './MeshManager.js';
import { InteractionManager } from './InteractionManager.js';

export class CymaticVisualizer {
    constructor(audioManager) {
        this.audioManager = audioManager;
        
        // Managers
        this.sceneManager = null;
        this.meshManager = null;
        this.interactionManager = null;
        
        // Audio data
        this.audioData = {
            frequencies: [528, 220, 110, 880], // Hz for synth, bassline, drum, hi-hat
            amplitudes: [0, 0, 0, 0],
            phases: [0, 0, 0, 0]
        };
        
        // Visual settings
        this.settings = {
            showWireframe: true,
            showVertices: true,
            animationSpeed: 1.0,
            vertexSize: 0.05,
            wireframeOpacity: 0.8
        };
    }

    async init() {
        // Initialize managers
        this.sceneManager = new SceneManager(this);
        this.sceneManager.init();
        
        this.meshManager = new MeshManager(this);
        this.meshManager.init();
        
        this.interactionManager = new InteractionManager(this);
        this.interactionManager.init();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Pass audio manager reference to mesh manager for live updates
        if (this.meshManager) {
            this.meshManager.visualizer.audioManager = this.audioManager;
        }
    }

    setupEventListeners() {
        // Listen for UI control changes
        document.addEventListener('visualizationSettingsChanged', (event) => {
            this.updateSettings(event.detail);
        });
        
        // Listen for group pull mode toggle
        document.addEventListener('toggleGroupPullMode', (event) => {
            this.interactionManager.setGroupPullMode(event.detail.enabled);
        });
    }

    updateAudioData(data) {
        this.audioData = { ...this.audioData, ...data };
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.meshManager.updateSettings(this.settings);
    }

    reset() {
        this.meshManager.reset();
        this.sceneManager.resetCamera();
        this.interactionManager.resetVertices();
    }

    resetVertices() {
        this.interactionManager.resetVertices();
    }

    render() {
        const time = performance.now() * 0.001;
        this.meshManager.updateCymaticPattern(time);
        this.sceneManager.render();
    }

    handleResize() {
        this.sceneManager.handleResize();
    }

    // Public API methods - delegate to managers
    getScene() {
        return this.sceneManager.getScene();
    }

    getCamera() {
        return this.sceneManager.getCamera();
    }

    getRenderer() {
        return this.sceneManager.getRenderer();
    }

    getSelectedVertex() {
        return this.interactionManager.getSelectedVertex();
    }

    // Getter properties for backward compatibility
    get scene() {
        return this.sceneManager.getScene();
    }

    get camera() {
        return this.sceneManager.getCamera();
    }

    get renderer() {
        return this.sceneManager.getRenderer();
    }

    get controls() {
        return this.sceneManager.getControls();
    }

    get meshes() {
        return this.meshManager.getMeshes();
    }

    get geometries() {
        return this.meshManager.getGeometries();
    }

    get vertexData() {
        return this.meshManager.getVertexData();
    }

    get colors() {
        return this.meshManager.getColors();
    }

    // Cleanup method
    dispose() {
        if (this.interactionManager) {
            this.interactionManager.dispose();
        }
        if (this.meshManager) {
            this.meshManager.dispose();
        }
        if (this.sceneManager) {
            this.sceneManager.dispose();
        }
    }
} 