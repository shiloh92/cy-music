import { CymaticVisualizer } from './modules/CymaticVisualizer.js';
import { AudioManager } from './modules/AudioManager.js';
import { PatternGenerator } from './modules/PatternGenerator.js';
import { UIManager } from './modules/UIManager.js';
import { RecordingManager } from './modules/RecordingManager.js';

class CymaticApp {
    constructor() {
        this.visualizer = null;
        this.audioManager = null;
        this.patternGenerator = null;
        this.uiManager = null;
        this.recordingManager = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            // Initialize core modules
            this.audioManager = new AudioManager();
            await this.audioManager.init();

            this.visualizer = new CymaticVisualizer(this.audioManager);
            await this.visualizer.init();

            this.patternGenerator = new PatternGenerator(this.audioManager);
            await this.patternGenerator.init();

            this.recordingManager = new RecordingManager(this.audioManager, this.visualizer);
            await this.recordingManager.init();

            this.uiManager = new UIManager(this);
            await this.uiManager.init();

            // Set up module connections
            this.setupConnections();

            this.isInitialized = true;
            console.log('Cymatic App initialized successfully');

            // Start the animation loop
            this.animate();

        } catch (error) {
            console.error('Failed to initialize Cymatic App:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    setupConnections() {
        // Connect pattern generator to audio manager
        this.patternGenerator.onPatternChange = (pattern) => {
            this.audioManager.updatePattern(pattern);
        };

        // Connect audio manager to visualizer
        this.audioManager.onAudioData = (data) => {
            this.visualizer.updateAudioData(data);
        };

        // Connect UI controls to modules
        this.uiManager.onPlayPause = (isPlaying) => {
            if (isPlaying) {
                this.audioManager.play();
                this.patternGenerator.setPlaying(true);
            } else {
                this.audioManager.pause();
                this.patternGenerator.setPlaying(false);
            }
        };

        this.uiManager.onVolumeChange = (volume) => {
            this.audioManager.setMasterVolume(volume);
        };

        this.uiManager.onReset = () => {
            this.visualizer.reset();
            this.audioManager.reset();
        };

        this.uiManager.onBPMChange = (bpm) => {
            this.audioManager.setBPM(bpm);
            this.patternGenerator.setBPM(bpm);
        };

        // Connect recording manager to UI
        this.recordingManager.onRecordingStart = () => {
            this.uiManager.updateRecordingButton(true);
        };

        this.recordingManager.onRecordingStop = (recordingData) => {
            this.uiManager.updateRecordingButton(false);
            this.uiManager.showNotification(`Recording completed (${Math.round(recordingData.metadata.duration / 1000)}s)`, 'success');
        };

        this.recordingManager.onRecordingSave = (files) => {
            let message = 'Recording saved: ';
            if (files.json) message += `${files.json}`;
            if (files.wav) message += `, ${files.wav}`;
            this.uiManager.showNotification(message, 'success');
        };
    }

    animate() {
        if (!this.isInitialized) return;

        // Update visualizer
        this.visualizer.render();

        // Update pattern generator
        this.patternGenerator.update();

        // Continue animation loop
        requestAnimationFrame(() => this.animate());
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 1000;
            font-family: Arial, sans-serif;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 5000);
    }

    // Public API methods
    getVisualizer() {
        return this.visualizer;
    }

    getAudioManager() {
        return this.audioManager;
    }

    getPatternGenerator() {
        return this.patternGenerator;
    }

    getUIManager() {
        return this.uiManager;
    }

    getRecordingManager() {
        return this.recordingManager;
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new CymaticApp();
    await app.init();

    // Make app globally available for debugging
    window.cymaticApp = app;
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.cymaticApp && window.cymaticApp.visualizer) {
        window.cymaticApp.visualizer.handleResize();
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.cymaticApp && window.cymaticApp.audioManager) {
        if (document.hidden) {
            window.cymaticApp.audioManager.pause();
        } else {
            // Resume if it was playing before
            if (window.cymaticApp.uiManager && window.cymaticApp.uiManager.isPlaying) {
                window.cymaticApp.audioManager.play();
            }
        }
    }
}); 