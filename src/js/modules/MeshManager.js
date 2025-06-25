import { 
    createPlaneGeometry, 
    createSphereGeometry, 
    createWireframeMaterial, 
    createSolidMaterial, 
    createSphereMaterial 
} from '../utils/threeUtils.js';

/**
 * Manages the creation and management of cymatic meshes and vertex spheres
 */
export class MeshManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.meshes = [];
        this.geometries = [];
        this.vertexData = [];
        
        // Colors for each track
        this.colors = [
            0x667eea, // Synth - Blue
            0x764ba2, // Bassline - Purple
            0xf093fb, // Drums - Pink
            0xf5576c  // Hi-Hat - Red
        ];
        
        // Layer visibility state
        this.layerVisibility = [true, true, true, true];
        
        // Bind methods
        this.handleIsolateLayer = this.handleIsolateLayer.bind(this);
        this.handleShowAllLayers = this.handleShowAllLayers.bind(this);
    }

    /**
     * Initialize the mesh manager
     */
    init() {
        this.createCymaticMeshes();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for layer isolation events
        document.addEventListener('isolateLayer', this.handleIsolateLayer);
        document.addEventListener('showAllLayers', this.handleShowAllLayers);
    }

    /**
     * Handle layer isolation
     */
    handleIsolateLayer(event) {
        const { layerIndex } = event.detail;
        this.isolateLayer(layerIndex);
    }

    /**
     * Handle show all layers
     */
    handleShowAllLayers() {
        this.showAllLayers();
    }

    /**
     * Isolate a specific layer
     */
    isolateLayer(layerIndex) {
        this.layerVisibility = [false, false, false, false];
        this.layerVisibility[layerIndex] = true;
        this.updateLayerVisibility();
    }

    /**
     * Show all layers
     */
    showAllLayers() {
        this.layerVisibility = [true, true, true, true];
        this.updateLayerVisibility();
    }

    /**
     * Update layer visibility based on current state
     */
    updateLayerVisibility() {
        this.meshes.forEach((mesh, index) => {
            const layerIndex = Math.floor(index / 2); // Each layer has 2 meshes (wireframe + solid)
            mesh.visible = this.layerVisibility[layerIndex];
        });
        
        // Update vertex spheres visibility
        this.vertexData.forEach((layer, layerIndex) => {
            layer.spheres.forEach(sphere => {
                sphere.visible = this.layerVisibility[layerIndex];
            });
        });
    }

    /**
     * Create all cymatic meshes
     */
    createCymaticMeshes() {
        for (let i = 0; i < 4; i++) {
            this.createCymaticMesh(i);
        }
    }

    /**
     * Create a cymatic mesh for a specific layer
     */
    createCymaticMesh(layerIndex) {
        const geometry = createPlaneGeometry();
        
        // Create wireframe material
        const wireframeMaterial = createWireframeMaterial(
            this.colors[layerIndex], 
            this.visualizer.settings.wireframeOpacity
        );
        
        // Create solid material for vertex selection
        const solidMaterial = createSolidMaterial(this.colors[layerIndex]);
        
        // Create wireframe mesh
        const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
        wireframeMesh.position.z = layerIndex * 2;
        wireframeMesh.userData = { type: 'wireframe', layerIndex };
        this.visualizer.scene.add(wireframeMesh);
        
        // Create solid mesh for interaction
        const solidMesh = new THREE.Mesh(geometry, solidMaterial);
        solidMesh.position.z = layerIndex * 2;
        solidMesh.userData = { type: 'solid', layerIndex };
        this.visualizer.scene.add(solidMesh);
        
        this.meshes.push(wireframeMesh, solidMesh);
        this.geometries.push(geometry);
        
        // Store vertex data
        const positions = geometry.attributes.position.array;
        this.vertexData[layerIndex] = {
            original: [...positions],
            modified: new Float32Array(positions.length),
            spheres: []
        };
        
        // Create vertex spheres for visual indicators
        this.createVertexSpheres(layerIndex, geometry);
    }

    /**
     * Create vertex spheres for a specific layer
     */
    createVertexSpheres(layerIndex, geometry) {
        const positions = geometry.attributes.position.array;
        const spheres = [];
        
        for (let i = 0; i < positions.length; i += 3) {
            const sphereGeometry = createSphereGeometry(this.visualizer.settings.vertexSize);
            const sphereMaterial = createSphereMaterial(this.colors[layerIndex]);
            
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.set(positions[i], positions[i + 1], positions[i + 2] + layerIndex * 2);
            sphere.userData = { 
                vertexIndex: i, 
                layerIndex: layerIndex,
                originalPosition: new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2])
            };
            
            this.visualizer.scene.add(sphere);
            spheres.push(sphere);
        }
        
        this.vertexData[layerIndex].spheres = spheres;
    }

    /**
     * Update mesh settings based on new settings
     */
    updateSettings(newSettings) {
        // Update materials based on settings
        this.meshes.forEach((mesh, index) => {
            const layerIndex = Math.floor(index / 2); // Each layer has 2 meshes (wireframe + solid)
            
            if (mesh.userData.type === 'wireframe') {
                mesh.material.wireframe = newSettings.showWireframe;
                mesh.visible = newSettings.showWireframe && this.layerVisibility[layerIndex];
            } else {
                mesh.visible = this.layerVisibility[layerIndex];
            }
        });
        
        // Update vertex spheres visibility
        this.vertexData.forEach((layer, layerIndex) => {
            layer.spheres.forEach(sphere => {
                sphere.visible = newSettings.showVertices && this.layerVisibility[layerIndex];
            });
        });
    }

    /**
     * Update cymatic patterns based on audio data
     */
    updateCymaticPattern(time) {
        this.geometries.forEach((geometry, layerIndex) => {
            const positions = geometry.attributes.position.array;
            const { original, modified } = this.vertexData[layerIndex];
            const freq = this.visualizer.audioData.frequencies[layerIndex];
            const amplitude = this.visualizer.audioData.amplitudes[layerIndex];
            const phase = this.visualizer.audioData.phases[layerIndex];
            
            for (let i = 0; i < positions.length; i += 3) {
                const x = original[i];
                const y = original[i + 1];
                const distance = Math.sqrt(x * x + y * y);
                
                // Cymatic pattern calculation
                const cymaticZ = Math.sin(distance * freq * 0.01 + time * this.visualizer.settings.animationSpeed + phase) * amplitude * 0.5;
                
                // Combine cymatic pattern with manual modifications
                positions[i + 2] = original[i + 2] + cymaticZ + (modified[i + 2] || 0);
                
                // Update corresponding sphere
                const sphere = this.vertexData[layerIndex].spheres[i / 3];
                if (sphere) {
                    sphere.position.z = positions[i + 2] + layerIndex * 2;
                }
            }
            
            geometry.attributes.position.needsUpdate = true;
        });
        
        // Send vertex data updates to audio manager for live modulation
        this.sendVertexDataUpdate();
    }

    /**
     * Send vertex data updates to the audio manager for live audio parameter modulation
     */
    sendVertexDataUpdate() {
        // Only send updates if audio is playing
        if (this.visualizer.audioManager && this.visualizer.audioManager.isAudioPlaying()) {
            const vertexDataForAudio = this.vertexData.map(layer => ({
                original: layer.original,
                modified: layer.modified,
                currentPositions: this.geometries[this.vertexData.indexOf(layer)].attributes.position.array
            }));
            
            document.dispatchEvent(new CustomEvent('vertexDataUpdated', {
                detail: vertexDataForAudio
            }));
        }
    }

    /**
     * Reset all vertex modifications
     */
    reset() {
        this.vertexData.forEach((layer, layerIndex) => {
            layer.modified.fill(0);
            const geometry = this.geometries[layerIndex];
            const positions = geometry.attributes.position.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 2] = layer.original[i + 2];
                layer.spheres[i / 3].position.z = positions[i + 2] + layerIndex * 2;
            }
            
            geometry.attributes.position.needsUpdate = true;
        });
    }

    /**
     * Get all meshes
     */
    getMeshes() {
        return this.meshes;
    }

    /**
     * Get all geometries
     */
    getGeometries() {
        return this.geometries;
    }

    /**
     * Get vertex data
     */
    getVertexData() {
        return this.vertexData;
    }

    /**
     * Get colors
     */
    getColors() {
        return this.colors;
    }

    /**
     * Get layer visibility state
     */
    getLayerVisibility() {
        return this.layerVisibility;
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Remove event listeners
        document.removeEventListener('isolateLayer', this.handleIsolateLayer);
        document.removeEventListener('showAllLayers', this.handleShowAllLayers);
        
        // Dispose of geometries
        this.geometries.forEach(geometry => {
            geometry.dispose();
        });
        
        // Dispose of materials
        this.meshes.forEach(mesh => {
            if (mesh.material) {
                mesh.material.dispose();
            }
        });
        
        // Clear arrays
        this.meshes = [];
        this.geometries = [];
        this.vertexData = [];
    }
} 