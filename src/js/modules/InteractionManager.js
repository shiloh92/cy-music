import { screenToNormalized, createRaycastPlane } from '../utils/threeUtils.js';

/**
 * Manages all mouse and touch interactions for the Cymatic Visualizer
 */
export class InteractionManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.raycaster = null;
        this.mouse = null;
        this.selectedVertex = null;
        this.selectedMeshIndex = -1;
        
        // Keyboard movement properties
        this.moveSpeed = 0.1;
        this.keysPressed = new Set();
        
        // Group pull mode properties
        this.groupPullMode = false;
        this.groupPullRadius = 2.0; // Radius of influence for group pull
        this.groupPullStrength = 0.3; // How strongly nearby vertices are affected
        this.groupPullDecay = 0.8; // How quickly the effect decays with distance
        
        // Bind methods to preserve context
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
    }

    /**
     * Initialize the interaction manager
     */
    init() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for mouse and keyboard interactions
     */
    setupEventListeners() {
        const canvas = this.visualizer.renderer.domElement;
        
        // Mouse events for vertex selection
        canvas.addEventListener('mousedown', this.onMouseDown);
        
        // Touch events for mobile vertex selection
        canvas.addEventListener('touchstart', this.onTouchStart);
        
        // Keyboard events for vertex movement
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
    }

    /**
     * Handle mouse down events for vertex selection
     */
    onMouseDown(event) {
        event.preventDefault();
        this.updateMousePosition(event);
        this.selectVertex();
    }

    /**
     * Handle touch start events for vertex selection
     */
    onTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            this.updateTouchPosition(event.touches[0]);
            this.selectVertex();
        }
    }

    /**
     * Handle key down events for vertex movement
     */
    onKeyDown(event) {
        // Prevent shortcuts when typing in input fields
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        const key = event.code;
        this.keysPressed.add(key);
        
        // Handle WASD movement for selected vertex
        if (this.selectedVertex && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(key)) {
            event.preventDefault();
            this.moveVertex(key);
        }
    }

    /**
     * Handle key up events
     */
    onKeyUp(event) {
        const key = event.code;
        this.keysPressed.delete(key);
    }

    /**
     * Move the selected vertex based on key pressed
     */
    moveVertex(key) {
        if (!this.selectedVertex) return;
        
        const layerIndex = this.selectedVertex.layerIndex;
        const vertexIndex = this.selectedVertex.index;
        const geometry = this.visualizer.geometries[layerIndex];
        const positions = geometry.attributes.position.array;
        const modified = this.visualizer.vertexData[layerIndex].modified;
        
        // Get current position
        const currentX = positions[vertexIndex];
        const currentY = positions[vertexIndex + 1];
        const currentZ = positions[vertexIndex + 2];
        
        let newX = currentX;
        let newY = currentY;
        let newZ = currentZ;
        
        // Calculate movement based on key
        switch (key) {
            case 'KeyW': // Move up (Y+)
                newY += this.moveSpeed;
                break;
            case 'KeyS': // Move down (Y-)
                newY -= this.moveSpeed;
                break;
            case 'KeyA': // Move left (X-)
                newX -= this.moveSpeed;
                break;
            case 'KeyD': // Move right (X+)
                newX += this.moveSpeed;
                break;
        }
        
        // Update the selected vertex position
        positions[vertexIndex] = newX;
        positions[vertexIndex + 1] = newY;
        positions[vertexIndex + 2] = newZ;
        
        // Calculate displacement from original for selected vertex
        const originalX = this.visualizer.vertexData[layerIndex].original[vertexIndex];
        const originalY = this.visualizer.vertexData[layerIndex].original[vertexIndex + 1];
        const originalZ = this.visualizer.vertexData[layerIndex].original[vertexIndex + 2];
        
        modified[vertexIndex] = newX - originalX;
        modified[vertexIndex + 1] = newY - originalY;
        modified[vertexIndex + 2] = newZ - originalZ;
        
        // Update selected vertex sphere position
        this.selectedVertex.sphere.position.set(newX, newY, newZ + this.selectedVertex.layerIndex * 2);
        
        // Apply group pull effect if enabled
        if (this.groupPullMode) {
            this.applyGroupPullEffect(layerIndex, vertexIndex, newX, newY, newZ);
        }
        
        // Update geometry
        geometry.attributes.position.needsUpdate = true;
        
        // Send audio data to audio manager
        this.updateAudioFromVertex(layerIndex, vertexIndex, modified[vertexIndex + 2], {
            x: newX,
            y: newY,
            z: newZ
        });
        
        // Notify UI of vertex movement
        document.dispatchEvent(new CustomEvent('vertexMoved', {
            detail: {
                layerIndex,
                vertexIndex,
                position: { x: newX, y: newY, z: newZ }
            }
        }));
    }

    /**
     * Apply group pull effect to nearby vertices
     */
    applyGroupPullEffect(layerIndex, selectedVertexIndex, selectedX, selectedY, selectedZ) {
        const geometry = this.visualizer.geometries[layerIndex];
        const positions = geometry.attributes.position.array;
        const original = this.visualizer.vertexData[layerIndex].original;
        const modified = this.visualizer.vertexData[layerIndex].modified;
        const spheres = this.visualizer.vertexData[layerIndex].spheres;
        
        // Calculate movement vector of the selected vertex
        const movementX = selectedX - original[selectedVertexIndex];
        const movementY = selectedY - original[selectedVertexIndex + 1];
        const movementZ = selectedZ - original[selectedVertexIndex + 2];
        
        // Apply ripple effect to nearby vertices
        for (let i = 0; i < positions.length; i += 3) {
            if (i === selectedVertexIndex) continue; // Skip the selected vertex
            
            const vertexX = original[i];
            const vertexY = original[i + 1];
            const vertexZ = original[i + 2];
            
            // Calculate distance from selected vertex
            const distance = Math.sqrt(
                Math.pow(vertexX - original[selectedVertexIndex], 2) +
                Math.pow(vertexY - original[selectedVertexIndex + 1], 2) +
                Math.pow(vertexZ - original[selectedVertexIndex + 2], 2)
            );
            
            // Only affect vertices within the pull radius
            if (distance <= this.groupPullRadius) {
                // Calculate influence based on distance (closer = stronger effect)
                const influence = Math.pow(1 - (distance / this.groupPullRadius), this.groupPullDecay);
                const pullStrength = this.groupPullStrength * influence;
                
                // Apply ripple effect with wave-like motion
                const waveOffset = Math.sin(distance * 2) * 0.1; // Creates wave pattern
                const timeOffset = Date.now() * 0.001; // Time-based animation
                const waveEffect = Math.sin(distance * 3 + timeOffset) * 0.05;
                
                // Calculate new position with ripple effect
                const newX = vertexX + (movementX * pullStrength) + (waveEffect * influence);
                const newY = vertexY + (movementY * pullStrength) + (waveOffset * influence);
                const newZ = vertexZ + (movementZ * pullStrength);
                
                // Update vertex position
                positions[i] = newX;
                positions[i + 1] = newY;
                positions[i + 2] = newZ;
                
                // Update modification tracking
                modified[i] = newX - vertexX;
                modified[i + 1] = newY - vertexY;
                modified[i + 2] = newZ - vertexZ;
                
                // Update corresponding sphere position
                const sphereIndex = i / 3;
                if (spheres[sphereIndex]) {
                    spheres[sphereIndex].position.set(
                        newX, 
                        newY, 
                        newZ + this.selectedVertex.layerIndex * 2
                    );
                }
            }
        }
    }

    /**
     * Toggle group pull mode
     */
    toggleGroupPullMode() {
        this.groupPullMode = !this.groupPullMode;
        return this.groupPullMode;
    }

    /**
     * Set group pull mode
     */
    setGroupPullMode(enabled) {
        this.groupPullMode = enabled;
    }

    /**
     * Get group pull mode state
     */
    getGroupPullMode() {
        return this.groupPullMode;
    }

    /**
     * Update mouse position from event
     */
    updateMousePosition(event) {
        const coords = screenToNormalized(
            event.clientX, 
            event.clientY, 
            window.innerWidth, 
            window.innerHeight
        );
        this.mouse.x = coords.x;
        this.mouse.y = coords.y;
    }

    /**
     * Update touch position from touch event
     */
    updateTouchPosition(touch) {
        const coords = screenToNormalized(
            touch.clientX, 
            touch.clientY, 
            window.innerWidth, 
            window.innerHeight
        );
        this.mouse.x = coords.x;
        this.mouse.y = coords.y;
    }

    /**
     * Select a vertex based on mouse position
     */
    selectVertex() {
        this.raycaster.setFromCamera(this.mouse, this.visualizer.camera);
        
        // Get layer visibility state from mesh manager
        const layerVisibility = this.visualizer.meshManager.getLayerVisibility();
        
        // Filter spheres to only include those from visible layers
        const visibleSpheres = this.visualizer.vertexData.flatMap((layer, layerIndex) => {
            return layerVisibility[layerIndex] ? layer.spheres : [];
        });
        
        // Check intersection with only visible vertex spheres
        const sphereIntersects = this.raycaster.intersectObjects(visibleSpheres);
        
        if (sphereIntersects.length > 0) {
            const sphere = sphereIntersects[0].object;
            
            // If we're already selecting this vertex, don't change anything
            if (this.selectedVertex && 
                this.selectedVertex.index === sphere.userData.vertexIndex &&
                this.selectedVertex.layerIndex === sphere.userData.layerIndex) {
                return true;
            }
            
            // Clear previous selection
            this.clearVertexSelection();
            
            this.selectedVertex = {
                index: sphere.userData.vertexIndex,
                layerIndex: sphere.userData.layerIndex,
                sphere: sphere
            };
            this.selectedMeshIndex = sphere.userData.layerIndex;
            
            // Highlight selected vertex
            sphere.material.color.setHex(0xffffff);
            sphere.scale.setScalar(1.5);
            
            // Change cursor to indicate selection
            this.visualizer.renderer.domElement.style.cursor = 'pointer';
            
            // Notify UI of vertex selection
            document.dispatchEvent(new CustomEvent('vertexSelected', {
                detail: {
                    layerIndex: this.selectedVertex.layerIndex,
                    vertexIndex: this.selectedVertex.index
                }
            }));
            
            return true; // Indicate that a vertex was selected
        }
        
        return false; // No vertex selected
    }

    /**
     * Clear the currently selected vertex
     */
    clearVertexSelection() {
        if (this.selectedVertex) {
            // Reset sphere appearance
            this.selectedVertex.sphere.material.color.setHex(this.visualizer.colors[this.selectedVertex.layerIndex]);
            this.selectedVertex.sphere.scale.setScalar(1.0);
            this.selectedVertex = null;
            this.selectedMeshIndex = -1;
            
            // Reset cursor
            this.visualizer.renderer.domElement.style.cursor = 'default';
            
            // Notify UI of vertex deselection
            document.dispatchEvent(new CustomEvent('vertexDeselected'));
        }
    }

    /**
     * Update audio parameters based on vertex modification
     */
    updateAudioFromVertex(layerIndex, vertexIndex, displacement, position) {
        const audioData = {
            layerIndex,
            vertexIndex,
            displacement: Math.abs(displacement),
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            }
        };
        
        // Emit event for audio manager
        document.dispatchEvent(new CustomEvent('vertexModified', { 
            detail: audioData 
        }));
    }

    /**
     * Get the currently selected vertex
     */
    getSelectedVertex() {
        return this.selectedVertex;
    }

    /**
     * Check if currently dragging
     */
    isDraggingVertex() {
        return false; // No longer dragging, using keyboard controls
    }

    /**
     * Reset all vertices to their original positions
     */
    resetVertices() {
        // Clear vertex selection
        this.clearVertexSelection();
        
        // Reset all vertex positions to original
        for (let layerIndex = 0; layerIndex < this.visualizer.vertexData.length; layerIndex++) {
            const geometry = this.visualizer.geometries[layerIndex];
            const positions = geometry.attributes.position.array;
            const original = this.visualizer.vertexData[layerIndex].original;
            const modified = this.visualizer.vertexData[layerIndex].modified;
            const spheres = this.visualizer.vertexData[layerIndex].spheres;
            
            // Reset positions to original values
            for (let i = 0; i < positions.length; i++) {
                positions[i] = original[i];
                modified[i] = 0; // Clear modifications
            }
            
            // Update sphere positions
            for (let i = 0; i < spheres.length; i++) {
                const sphere = spheres[i];
                const vertexIndex = sphere.userData.vertexIndex * 3;
                sphere.position.set(
                    original[vertexIndex],
                    original[vertexIndex + 1],
                    original[vertexIndex + 2]
                );
            }
            
            // Update geometry
            geometry.attributes.position.needsUpdate = true;
        }
        
        // Notify UI of reset
        document.dispatchEvent(new CustomEvent('verticesReset'));
        
        console.log('All vertices reset to original positions');
    }

    /**
     * Clean up event listeners
     */
    dispose() {
        const canvas = this.visualizer.renderer.domElement;
        
        canvas.removeEventListener('mousedown', this.onMouseDown);
        canvas.removeEventListener('touchstart', this.onTouchStart);
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
    }
} 