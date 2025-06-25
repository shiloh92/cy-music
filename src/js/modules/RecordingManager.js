export class RecordingManager {
    constructor(audioManager, visualizer) {
        this.audioManager = audioManager;
        this.visualizer = visualizer;
        
        // Recording state
        this.isRecording = false;
        this.recordingStartTime = 0;
        this.recordingData = {
            metadata: {
                startTime: 0,
                duration: 0,
                bpm: 120,
                sampleRate: 44100,
                version: '1.0'
            },
            vertexMovements: [],
            audioLayers: {
                synth: [],
                bassline: [],
                drums: [],
                hihat: []
            },
            patterns: {},
            settings: {}
        };
        
        // Audio recording
        this.audioRecorder = null;
        this.audioStream = null;
        this.audioChunks = [];
        this.audioRecordingStartTime = 0;
        
        // Recording intervals
        this.vertexRecordingInterval = null;
        this.audioRecordingInterval = null;
        
        // Recording rates
        this.vertexRecordingRate = 60; // Hz - how often to record vertex positions
        this.audioRecordingRate = 30;  // Hz - how often to record audio parameters
        
        // Callbacks
        this.onRecordingStart = null;
        this.onRecordingStop = null;
        this.onRecordingSave = null;
        
        // Bind methods
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.saveRecording = this.saveRecording.bind(this);
    }

    async init() {
        console.log('RecordingManager initialized');
    }

    /**
     * Start live recording
     */
    async startRecording() {
        if (this.isRecording) {
            console.warn('Recording already in progress');
            return;
        }

        this.isRecording = true;
        this.recordingStartTime = Date.now();
        
        // Initialize recording data
        this.recordingData = {
            metadata: {
                startTime: this.recordingStartTime,
                duration: 0,
                bpm: this.audioManager.getBPM(),
                sampleRate: this.audioManager.audioContext?.sampleRate || 44100,
                version: '1.0'
            },
            vertexMovements: [],
            audioLayers: {
                synth: [],
                bassline: [],
                drums: [],
                hihat: []
            },
            patterns: this.audioManager.getPatterns(),
            settings: {
                masterVolume: this.audioManager.getMasterVolume(),
                vertexPositions: this.getCurrentVertexPositions()
            }
        };

        // Start audio recording
        await this.startAudioRecording();

        // Start recording intervals
        this.startVertexRecording();
        this.startAudioParameterRecording();

        // Notify UI
        if (this.onRecordingStart) {
            this.onRecordingStart();
        }

        console.log('Live recording started');
    }

    /**
     * Stop live recording
     */
    async stopRecording() {
        if (!this.isRecording) {
            console.warn('No recording in progress');
            return;
        }

        this.isRecording = false;
        
        // Stop recording intervals
        this.stopVertexRecording();
        this.stopAudioParameterRecording();

        // Stop audio recording
        await this.stopAudioRecording();

        // Calculate final duration
        this.recordingData.metadata.duration = Date.now() - this.recordingStartTime;

        // Notify UI
        if (this.onRecordingStop) {
            this.onRecordingStop(this.recordingData);
        }

        console.log('Live recording stopped');
    }

    /**
     * Save recording to files
     */
    async saveRecording() {
        if (this.isRecording) {
            console.warn('Cannot save while recording is in progress');
            return;
        }

        try {
            // Generate timestamp for filenames
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            
            // Save JSON performance data
            const jsonFilename = await this.saveJSONRecording(timestamp);
            
            // Save WAV audio file
            const wavFilename = await this.saveWAVRecording(timestamp);
            
            // Notify UI
            if (this.onRecordingSave) {
                this.onRecordingSave({ json: jsonFilename, wav: wavFilename });
            }

            console.log(`Recording saved as ${jsonFilename} and ${wavFilename}`);
            return { json: jsonFilename, wav: wavFilename };

        } catch (error) {
            console.error('Failed to save recording:', error);
            throw error;
        }
    }

    /**
     * Save JSON performance data
     */
    async saveJSONRecording(timestamp) {
        // Create recording object
        const recording = {
            ...this.recordingData,
            exportTime: Date.now()
        };

        // Convert to JSON
        const jsonData = JSON.stringify(recording, null, 2);
        
        // Create blob and download
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Generate filename
        const filename = `cymatic-performance-${timestamp}.json`;
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        return filename;
    }

    /**
     * Save WAV audio recording
     */
    async saveWAVRecording(timestamp) {
        if (!this.audioChunks || this.audioChunks.length === 0) {
            console.warn('No audio data to save');
            return null;
        }

        try {
            // Combine audio chunks
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            
            // Generate filename
            const filename = `cymatic-audio-${timestamp}.wav`;
            
            // Create download link
            const url = URL.createObjectURL(audioBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(url);
            
            return filename;
        } catch (error) {
            console.error('Failed to save WAV recording:', error);
            return null;
        }
    }

    /**
     * Start recording actual audio output
     */
    async startAudioRecording() {
        try {
            // Get audio stream from the audio context destination
            if (this.audioManager.audioContext) {
                // Create a MediaStreamDestination to capture audio
                const destination = this.audioManager.audioContext.createMediaStreamDestination();
                
                // Connect the master gain to the destination
                this.audioManager.masterGain.connect(destination);
                
                // Create MediaRecorder
                this.audioRecorder = new MediaRecorder(destination.stream, {
                    mimeType: 'audio/webm;codecs=opus'
                });
                
                this.audioChunks = [];
                
                this.audioRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.audioChunks.push(event.data);
                    }
                };
                
                this.audioRecorder.start(1000); // Collect data every second
                this.audioRecordingStartTime = Date.now();
                
                console.log('Audio recording started');
            }
        } catch (error) {
            console.warn('Failed to start audio recording:', error);
            // Continue without audio recording if it fails
        }
    }

    /**
     * Stop recording actual audio output
     */
    async stopAudioRecording() {
        if (this.audioRecorder && this.audioRecorder.state !== 'inactive') {
            return new Promise((resolve) => {
                this.audioRecorder.onstop = () => {
                    console.log('Audio recording stopped');
                    resolve();
                };
                this.audioRecorder.stop();
            });
        }
    }

    /**
     * Start recording vertex movements
     */
    startVertexRecording() {
        this.vertexRecordingInterval = setInterval(() => {
            if (!this.isRecording) return;

            const currentTime = Date.now() - this.recordingStartTime;
            const vertexPositions = this.getCurrentVertexPositions();

            this.recordingData.vertexMovements.push({
                timestamp: currentTime,
                positions: vertexPositions
            });
        }, 1000 / this.vertexRecordingRate);
    }

    /**
     * Stop recording vertex movements
     */
    stopVertexRecording() {
        if (this.vertexRecordingInterval) {
            clearInterval(this.vertexRecordingInterval);
            this.vertexRecordingInterval = null;
        }
    }

    /**
     * Start recording audio layer parameters
     */
    startAudioParameterRecording() {
        this.audioRecordingInterval = setInterval(() => {
            if (!this.isRecording) return;

            const currentTime = Date.now() - this.recordingStartTime;
            const audioData = this.getCurrentAudioData();

            // Record audio parameters for each layer
            Object.keys(this.recordingData.audioLayers).forEach(trackName => {
                this.recordingData.audioLayers[trackName].push({
                    timestamp: currentTime,
                    ...audioData[trackName]
                });
            });
        }, 1000 / this.audioRecordingRate);
    }

    /**
     * Stop recording audio parameters
     */
    stopAudioParameterRecording() {
        if (this.audioRecordingInterval) {
            clearInterval(this.audioRecordingInterval);
            this.audioRecordingInterval = null;
        }
    }

    /**
     * Get current vertex positions from visualizer
     */
    getCurrentVertexPositions() {
        if (!this.visualizer || !this.visualizer.meshManager) {
            return [];
        }

        const meshManager = this.visualizer.meshManager;
        const vertexData = meshManager.getVertexData();
        
        if (!vertexData || vertexData.length === 0) {
            return [];
        }

        const positions = [];
        
        vertexData.forEach((layerData, layerIndex) => {
            const layerPositions = {
                layerIndex,
                vertices: []
            };

            // Get original and modified positions
            if (layerData.original && layerData.modified) {
                for (let i = 0; i < layerData.original.length; i += 3) {
                    const vertexIndex = i / 3;
                    layerPositions.vertices.push({
                        index: vertexIndex,
                        original: {
                            x: layerData.original[i],
                            y: layerData.original[i + 1],
                            z: layerData.original[i + 2]
                        },
                        modified: {
                            x: layerData.modified[i],
                            y: layerData.modified[i + 1],
                            z: layerData.modified[i + 2]
                        }
                    });
                }
            }

            positions.push(layerPositions);
        });

        return positions;
    }

    /**
     * Get current audio data from audio manager
     */
    getCurrentAudioData() {
        const audioData = {};

        Object.keys(this.audioManager.tracks).forEach(trackName => {
            const track = this.audioManager.tracks[trackName];
            if (track) {
                audioData[trackName] = {
                    gain: track.gain?.gain?.value || 0,
                    pan: track.panner?.pan?.value || 0,
                    isPlaying: this.audioManager.isPlaying,
                    note: this.audioManager.notes[trackName] || 'C4'
                };
            }
        });

        return audioData;
    }

    /**
     * Load and replay a recording
     */
    async loadRecording(file) {
        try {
            const text = await file.text();
            const recording = JSON.parse(text);
            
            // Validate recording format
            if (!recording.metadata || !recording.vertexMovements || !recording.audioLayers) {
                throw new Error('Invalid recording format');
            }

            console.log('Recording loaded:', recording);
            return recording;

        } catch (error) {
            console.error('Failed to load recording:', error);
            throw error;
        }
    }

    /**
     * Get recording status
     */
    getRecordingStatus() {
        return {
            isRecording: this.isRecording,
            duration: this.isRecording ? Date.now() - this.recordingStartTime : 0,
            vertexSamples: this.recordingData.vertexMovements.length,
            audioSamples: this.recordingData.audioLayers.synth.length
        };
    }

    /**
     * Clear current recording data
     */
    clearRecording() {
        this.recordingData = {
            metadata: {
                startTime: 0,
                duration: 0,
                bpm: 120,
                sampleRate: 44100,
                version: '1.0'
            },
            vertexMovements: [],
            audioLayers: {
                synth: [],
                bassline: [],
                drums: [],
                hihat: []
            },
            patterns: {},
            settings: {}
        };
        
        // Clear audio chunks
        this.audioChunks = [];
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.stopRecording();
        this.clearRecording();
        
        // Clean up audio recording resources
        if (this.audioRecorder && this.audioRecorder.state !== 'inactive') {
            this.audioRecorder.stop();
        }
        this.audioRecorder = null;
        this.audioStream = null;
    }
} 