export class UIManager {
    constructor(app) {
        this.app = app;
        this.isPlaying = false;
        this.settings = {
            masterVolume: 0.7,
            showWireframe: true,
            showVertices: true,
            animationSpeed: 1.0
        };
        this.lastVolume = 0.7;
        
        // UI Elements
        this.playPauseButton = null;
        this.resetButton = null;
        this.recordButton = null;
        this.masterVolumeSlider = null;
        this.showWireframeCheckbox = null;
        this.showVerticesCheckbox = null;
        this.liveVertexUpdatesCheckbox = null;
        this.groupPullModeCheckbox = null;
        this.animationSpeedSlider = null;
        this.vertexIdDisplay = null;
        this.layerIsolationButton = null;
        this.isolateLayerButton = null;
        this.showAllLayersButton = null;
        this.recordingStatusElement = null;
        this.recordingDurationElement = null;
        this.recordingDurationInterval = null;
        
        // Layer isolation state
        this.isLayerIsolated = false;
        this.isolatedLayerIndex = -1;
        
        // Callbacks
        this.onPlayPause = null;
        this.onReset = null;
        this.onVolumeChange = null;
        this.onBPMChange = null;
    }

    async init() {
        this.setupUI();
        this.setupEventListeners();
        this.updateDisplay();
        
        console.log('UIManager initialized successfully');
    }

    setupUI() {
        // Get UI elements
        this.playPauseButton = document.getElementById('playPause');
        this.resetButton = document.getElementById('reset');
        this.recordButton = document.getElementById('recordButton');
        this.masterVolumeSlider = document.getElementById('masterVolume');
        this.showWireframeCheckbox = document.getElementById('showWireframe');
        this.showVerticesCheckbox = document.getElementById('showVertices');
        this.liveVertexUpdatesCheckbox = document.getElementById('liveVertexUpdates');
        this.groupPullModeCheckbox = document.getElementById('groupPullMode');
        this.animationSpeedSlider = document.getElementById('animationSpeed');
        this.vertexIdDisplay = document.getElementById('vertex-id');
        this.layerIsolationButton = document.getElementById('layer-isolation-button');
        this.isolateLayerButton = document.getElementById('isolate-layer');
        this.showAllLayersButton = document.getElementById('show-all-layers');
        this.recordingStatusElement = document.getElementById('recording-status');
        this.recordingDurationElement = document.querySelector('.recording-duration');
    }

    setupEventListeners() {
        // Play/Pause button
        if (this.playPauseButton) {
            this.playPauseButton.addEventListener('click', () => {
                this.togglePlayPause();
            });
        }

        // Reset button
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => {
                this.reset();
            });
        }

        // Record button
        if (this.recordButton) {
            this.recordButton.addEventListener('click', () => {
                this.toggleRecording();
            });
        }

        // Master volume slider
        if (this.masterVolumeSlider) {
            this.masterVolumeSlider.addEventListener('input', (e) => {
                this.updateMasterVolume(parseFloat(e.target.value));
            });
        }

        // Visualization settings
        if (this.showWireframeCheckbox) {
            this.showWireframeCheckbox.addEventListener('change', (e) => {
                this.updateVisualizationSettings();
            });
        }

        if (this.showVerticesCheckbox) {
            this.showVerticesCheckbox.addEventListener('change', (e) => {
                this.updateVisualizationSettings();
            });
        }

        if (this.liveVertexUpdatesCheckbox) {
            this.liveVertexUpdatesCheckbox.addEventListener('change', (e) => {
                this.updateVisualizationSettings();
            });
        }

        if (this.groupPullModeCheckbox) {
            this.groupPullModeCheckbox.addEventListener('change', (e) => {
                this.updateVisualizationSettings();
            });
        }

        if (this.animationSpeedSlider) {
            this.animationSpeedSlider.addEventListener('input', (e) => {
                this.updateVisualizationSettings();
            });
        }

        // Vertex selection events
        document.addEventListener('vertexSelected', (event) => {
            this.updateVertexSelection(event.detail);
        });

        document.addEventListener('vertexDeselected', () => {
            this.clearVertexSelection();
        });

        document.addEventListener('vertexMoved', (event) => {
            this.updateVertexPosition(event.detail);
        });

        document.addEventListener('verticesReset', () => {
            this.clearVertexSelection();
            this.showNotification('All vertices reset to original positions', 'success');
        });

        // Layer isolation button events
        if (this.isolateLayerButton) {
            this.isolateLayerButton.addEventListener('click', () => {
                this.isolateCurrentLayer();
            });
        }

        if (this.showAllLayersButton) {
            this.showAllLayersButton.addEventListener('click', () => {
                this.showAllLayers();
            });
        }

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Prevent shortcuts when typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'KeyR':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.reset();
                    } else {
                        e.preventDefault();
                        this.toggleRecording();
                    }
                    break;
                case 'KeyM':
                    e.preventDefault();
                    this.toggleMute();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.increaseVolume();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.decreaseVolume();
                    break;
                case 'KeyH':
                    e.preventDefault();
                    this.toggleHelp();
                    break;
            }
        });
    }

    /**
     * Update vertex selection display
     */
    updateVertexSelection(detail) {
        if (this.vertexIdDisplay) {
            const trackNames = ['Synth', 'Bassline', 'Drums', 'Hi-Hat'];
            const trackName = trackNames[detail.layerIndex] || 'Track';
            const vertexId = `Vertex ${detail.vertexIndex} (${trackName})`;
            
            this.vertexIdDisplay.textContent = vertexId;
            this.vertexIdDisplay.parentElement.classList.add('fade-in');
            
            // Show layer isolation button
            this.showLayerIsolationButton(detail.layerIndex);
            
            // Show notification
            this.showNotification(`Selected ${vertexId}`, 'info');
        }
    }

    /**
     * Clear vertex selection display
     */
    clearVertexSelection() {
        if (this.vertexIdDisplay) {
            this.vertexIdDisplay.textContent = 'No vertex selected';
            this.vertexIdDisplay.parentElement.classList.remove('fade-in');
        }
        
        // Hide layer isolation button
        this.hideLayerIsolationButton();
    }

    /**
     * Show layer isolation button
     */
    showLayerIsolationButton(layerIndex) {
        if (this.layerIsolationButton) {
            this.layerIsolationButton.classList.remove('hidden');
            this.isolatedLayerIndex = layerIndex;
            
            // Show isolate button, hide show all button
            if (this.isolateLayerButton) {
                this.isolateLayerButton.classList.remove('hidden');
            }
            if (this.showAllLayersButton) {
                this.showAllLayersButton.classList.add('hidden');
            }
        }
    }

    /**
     * Hide layer isolation button
     */
    hideLayerIsolationButton() {
        if (this.layerIsolationButton) {
            this.layerIsolationButton.classList.add('hidden');
        }
        this.isLayerIsolated = false;
        this.isolatedLayerIndex = -1;
    }

    /**
     * Isolate current layer
     */
    isolateCurrentLayer() {
        if (this.isolatedLayerIndex === -1) return;
        
        this.isLayerIsolated = true;
        
        // Hide isolate button, show show all button
        if (this.isolateLayerButton) {
            this.isolateLayerButton.classList.add('hidden');
        }
        if (this.showAllLayersButton) {
            this.showAllLayersButton.classList.remove('hidden');
        }
        
        // Send event to visualizer to hide other layers
        document.dispatchEvent(new CustomEvent('isolateLayer', {
            detail: { layerIndex: this.isolatedLayerIndex }
        }));
        
        const trackNames = ['Synth', 'Bassline', 'Drums', 'Hi-Hat'];
        const trackName = trackNames[this.isolatedLayerIndex] || 'Track';
        this.showNotification(`Isolated ${trackName} layer`, 'info');
    }

    /**
     * Show all layers
     */
    showAllLayers() {
        this.isLayerIsolated = false;
        
        // Show isolate button, hide show all button
        if (this.isolateLayerButton) {
            this.isolateLayerButton.classList.remove('hidden');
        }
        if (this.showAllLayersButton) {
            this.showAllLayersButton.classList.add('hidden');
        }
        
        // Send event to visualizer to show all layers
        document.dispatchEvent(new CustomEvent('showAllLayers'));
        
        this.showNotification('Showing all layers', 'info');
    }

    /**
     * Update vertex position display (optional visual feedback)
     */
    updateVertexPosition(detail) {
        // Could add visual feedback here if needed
        // For now, just log the movement
        console.log(`Vertex ${detail.vertexIndex} moved to:`, detail.position);
    }

    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        this.updatePlayPauseButton();
        
        if (this.onPlayPause) {
            this.onPlayPause(this.isPlaying);
        }
        
        // Also update pattern generator
        if (this.app.patternGenerator) {
            this.app.patternGenerator.setPlaying(this.isPlaying);
        }
    }

    updatePlayPauseButton() {
        if (this.playPauseButton) {
            this.playPauseButton.textContent = this.isPlaying ? 'Pause' : 'Play';
            this.playPauseButton.classList.toggle('playing', this.isPlaying);
        }
    }

    reset() {
        // Add visual feedback to reset button
        if (this.resetButton) {
            this.resetButton.classList.add('pulse');
            setTimeout(() => {
                this.resetButton.classList.remove('pulse');
            }, 500);
        }
        
        // Reset visualizer (includes vertex reset)
        if (this.app.visualizer) {
            this.app.visualizer.reset();
        }
        
        if (this.onReset) {
            this.onReset();
        }
        
        // Reset UI state
        this.isPlaying = false;
        this.updatePlayPauseButton();
        
        // Reset pattern generator
        if (this.app.patternGenerator) {
            this.app.patternGenerator.setPlaying(false);
        }
        
        console.log('Application reset');
    }

    updateMasterVolume(volume) {
        this.settings.masterVolume = volume;
        
        if (this.onVolumeChange) {
            this.onVolumeChange(volume);
        }
    }

    updateVisualizationSettings() {
        this.settings.showWireframe = this.showWireframeCheckbox?.checked ?? true;
        this.settings.showVertices = this.showVerticesCheckbox?.checked ?? true;
        this.settings.liveVertexUpdates = this.liveVertexUpdatesCheckbox?.checked ?? true;
        this.settings.groupPullMode = this.groupPullModeCheckbox?.checked ?? false;
        this.settings.animationSpeed = parseFloat(this.animationSpeedSlider?.value ?? 1.0);
        
        // Dispatch visualization settings change event
        document.dispatchEvent(new CustomEvent('visualizationSettingsChanged', {
            detail: this.settings
        }));
        
        // Dispatch live vertex updates toggle event
        document.dispatchEvent(new CustomEvent('toggleLiveUpdates', {
            detail: { enabled: this.settings.liveVertexUpdates }
        }));
        
        // Dispatch group pull mode toggle event
        document.dispatchEvent(new CustomEvent('toggleGroupPullMode', {
            detail: { enabled: this.settings.groupPullMode }
        }));
        
        // Show notification for live updates toggle
        if (this.liveVertexUpdatesCheckbox) {
            const status = this.settings.liveVertexUpdates ? 'enabled' : 'disabled';
            this.showNotification(`Live vertex audio updates ${status}`, 'info');
        }
        
        // Show notification for group pull mode toggle
        if (this.groupPullModeCheckbox) {
            const status = this.settings.groupPullMode ? 'enabled' : 'disabled';
            this.showNotification(`Group pull mode ${status}`, 'info');
        }
    }

    toggleMute() {
        const currentVolume = this.settings.masterVolume;
        if (currentVolume > 0) {
            this.lastVolume = currentVolume;
            this.updateMasterVolume(0);
            this.masterVolumeSlider.value = 0;
        } else {
            const volume = this.lastVolume || 0.7;
            this.updateMasterVolume(volume);
            this.masterVolumeSlider.value = volume;
        }
    }

    increaseVolume() {
        const newVolume = Math.min(1, this.settings.masterVolume + 0.1);
        this.updateMasterVolume(newVolume);
        this.masterVolumeSlider.value = newVolume;
    }

    decreaseVolume() {
        const newVolume = Math.max(0, this.settings.masterVolume - 0.1);
        this.updateMasterVolume(newVolume);
        this.masterVolumeSlider.value = newVolume;
    }

    toggleHelp() {
        this.showHelpModal();
    }

    showHelpModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 30px;
            max-width: 500px;
            color: white;
            font-family: 'Inter', sans-serif;
        `;
        
        content.innerHTML = `
            <h2 style="margin-bottom: 20px; color: #667eea;">Keyboard Shortcuts</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                <div><strong>Space</strong></div><div>Play/Pause</div>
                <div><strong>R</strong></div><div>Reset</div>
                <div><strong>M</strong></div><div>Mute/Unmute</div>
                <div><strong>↑/↓</strong></div><div>Volume Up/Down</div>
                <div><strong>H</strong></div><div>Show/Hide Help</div>
            </div>
            <h3 style="margin: 20px 0 10px 0; color: #667eea;">Vertex Controls</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                <div><strong>W</strong></div><div>Move Up</div>
                <div><strong>S</strong></div><div>Move Down</div>
                <div><strong>A</strong></div><div>Move Left</div>
                <div><strong>D</strong></div><div>Move Right</div>
            </div>
            <h3 style="margin: 20px 0 10px 0; color: #667eea;">Interaction Guide</h3>
            <ul style="font-size: 14px; line-height: 1.6;">
                <li>Click vertices to select them</li>
                <li>Use WASD keys to move selected vertices</li>
                <li>Use mouse to rotate camera view</li>
                <li>Vertex displacement affects audio parameters</li>
                <li>Use the pattern grid to create drum patterns</li>
            </ul>
            <button id="close-help" style="
                margin-top: 20px;
                padding: 10px 20px;
                background: #667eea;
                border: none;
                border-radius: 6px;
                color: white;
                cursor: pointer;
                font-size: 14px;
            ">Close</button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Close modal
        content.querySelector('#close-help').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    updateDisplay() {
        // Update initial UI state
        if (this.masterVolumeSlider) {
            this.masterVolumeSlider.value = this.settings.masterVolume;
        }
        
        if (this.showWireframeCheckbox) {
            this.showWireframeCheckbox.checked = this.settings.showWireframe;
        }
        
        if (this.showVerticesCheckbox) {
            this.showVerticesCheckbox.checked = this.settings.showVertices;
        }
        
        if (this.liveVertexUpdatesCheckbox) {
            this.liveVertexUpdatesCheckbox.checked = this.settings.liveVertexUpdates;
        }
        
        if (this.groupPullModeCheckbox) {
            this.groupPullModeCheckbox.checked = this.settings.groupPullMode ?? false;
        }
        
        if (this.animationSpeedSlider) {
            this.animationSpeedSlider.value = this.settings.animationSpeed;
        }
        
        this.updatePlayPauseButton();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#667eea'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
        
        // Add CSS animations if not already present
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Public API methods
    getSettings() {
        return this.settings;
    }

    isUIPlaying() {
        return this.isPlaying;
    }

    setPlaying(playing) {
        this.isPlaying = playing;
        this.updatePlayPauseButton();
    }

    updateBPM(bpm) {
        // Update BPM display if it exists
        const bpmDisplay = document.getElementById('bpm-display');
        if (bpmDisplay) {
            bpmDisplay.textContent = bpm;
        }
        
        if (this.onBPMChange) {
            this.onBPMChange(bpm);
        }
    }

    /**
     * Toggle recording state
     */
    toggleRecording() {
        const recordingManager = this.app.getRecordingManager();
        if (!recordingManager) {
            console.error('RecordingManager not available');
            return;
        }

        if (recordingManager.isRecording) {
            // Stop recording and save
            recordingManager.stopRecording();
            this.saveRecording();
        } else {
            // Start recording
            recordingManager.startRecording();
        }
    }

    /**
     * Save the current recording
     */
    async saveRecording() {
        const recordingManager = this.app.getRecordingManager();
        if (!recordingManager) {
            console.error('RecordingManager not available');
            return;
        }

        try {
            // Show saving state
            this.updateRecordingButton('saving');
            
            // Save recording
            const files = await recordingManager.saveRecording();
            
            // Reset button state
            this.updateRecordingButton(false);
            
            // Show success notification with file info
            if (files) {
                let message = 'Recording saved: ';
                if (files.json) message += `${files.json}`;
                if (files.wav) message += `, ${files.wav}`;
                this.showNotification(message, 'success');
            }
            
        } catch (error) {
            console.error('Failed to save recording:', error);
            this.showNotification('Failed to save recording', 'error');
            this.updateRecordingButton(false);
        }
    }

    /**
     * Update recording button state
     */
    updateRecordingButton(state) {
        if (!this.recordButton) return;

        // Remove all state classes
        this.recordButton.classList.remove('recording', 'saving');

        if (state === true || state === 'recording') {
            // Recording state
            this.recordButton.textContent = 'Recording...';
            this.recordButton.classList.add('recording');
            this.showRecordingStatus();
            this.startRecordingDuration();
        } else if (state === 'saving') {
            // Saving state
            this.recordButton.textContent = 'Saving...';
            this.recordButton.classList.add('saving');
            this.hideRecordingStatus();
            this.stopRecordingDuration();
        } else {
            // Default state
            this.recordButton.textContent = 'Record';
            this.hideRecordingStatus();
            this.stopRecordingDuration();
        }
    }

    /**
     * Show recording status indicator
     */
    showRecordingStatus() {
        if (this.recordingStatusElement) {
            this.recordingStatusElement.classList.remove('hidden');
        }
    }

    /**
     * Hide recording status indicator
     */
    hideRecordingStatus() {
        if (this.recordingStatusElement) {
            this.recordingStatusElement.classList.add('hidden');
        }
    }

    /**
     * Start recording duration timer
     */
    startRecordingDuration() {
        this.stopRecordingDuration(); // Clear any existing timer
        
        const startTime = Date.now();
        this.recordingDurationInterval = setInterval(() => {
            const duration = Date.now() - startTime;
            this.updateRecordingDuration(duration);
        }, 100); // Update every 100ms for smooth display
    }

    /**
     * Stop recording duration timer
     */
    stopRecordingDuration() {
        if (this.recordingDurationInterval) {
            clearInterval(this.recordingDurationInterval);
            this.recordingDurationInterval = null;
        }
    }

    /**
     * Update recording duration display
     */
    updateRecordingDuration(durationMs) {
        if (!this.recordingDurationElement) return;

        const seconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        const formattedDuration = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        this.recordingDurationElement.textContent = formattedDuration;
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.stopRecordingDuration();
    }
} 