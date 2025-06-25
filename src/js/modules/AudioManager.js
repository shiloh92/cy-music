export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isPlaying = false;
        this.bpm = 120;
        this.masterVolume = 0.7;
        
        // Audio tracks
        this.tracks = {
            synth: { audio: null, gain: null, panner: null, source: null },
            bassline: { audio: null, gain: null, panner: null, source: null },
            drums: { audio: null, gain: null, panner: null, source: null },
            hihat: { audio: null, gain: null, panner: null, source: null }
        };
        
        // Pattern data
        this.patterns = {
            synth: this.createEmptyPattern(),
            bassline: this.createEmptyPattern(),
            drums: this.createEmptyPattern(),
            hihat: this.createEmptyPattern()
        };
        
        // Note data for each track
        this.notes = {
            synth: 'C5',
            bassline: 'C3',
            drums: 'C4',
            hihat: 'C6'
        };
        
        // Audio analysis
        this.analyzers = {};
        this.audioData = {
            frequencies: [528, 220, 110, 880],
            amplitudes: [0, 0, 0, 0],
            phases: [0, 0, 0, 0]
        };
        
        // Callbacks
        this.onAudioData = null;
        this.onPatternChange = null;
        
        // Timing
        this.startTime = 0;
        this.currentBeat = 0;
        this.beatInterval = null;
        
        // Live vertex audio updates
        this.liveVertexUpdates = {
            enabled: true,
            updateInterval: null,
            updateRate: 60, // Hz - how often to update audio parameters
            vertexData: null, // Will be set by visualizer
            lastVertexPositions: [], // Track last positions for change detection
            audioModulationDepth: {
                gain: 0.5,      // How much vertex movement affects gain
                pan: 0.8,       // How much vertex movement affects panning
                pitch: 0.3,     // How much vertex movement affects pitch
                filter: 0.4     // How much vertex movement affects filter
            }
        };
        
        // Audio effects for live modulation
        this.effects = {
            synth: { filter: null, delay: null },
            bassline: { filter: null, delay: null },
            drums: { filter: null, delay: null },
            hihat: { filter: null, delay: null }
        };
    }

    async init() {
        try {
            // Initialize audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
            this.masterGain.connect(this.audioContext.destination);
            
            // Load audio files
            await this.loadAudioFiles();
            
            // Set up analyzers
            this.setupAnalyzers();
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('AudioManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AudioManager:', error);
            throw error;
        }
    }

    async loadAudioFiles() {
        // Try multiple file formats for each track
        const audioFileFormats = {
            synth: ['../assets/synth.mp3', '../assets/synth.wav', '../assets/synth.flac'],
            bassline: ['../assets/bassline.mp3', '../assets/bassline.wav', '../assets/bassline.flac'],
            drums: ['../assets/drum.mp3', '../assets/drum.wav', '../assets/drum.flac'],
            hihat: ['../assets/hihat.mp3', '../assets/hihat.wav', '../assets/hihat.flac']
        };

        for (const [trackName, filePaths] of Object.entries(audioFileFormats)) {
            let loaded = false;
            
            // Try each format until one works
            for (const filePath of filePaths) {
                try {
                    const response = await fetch(filePath);
                    if (!response.ok) {
                        console.warn(`File not found: ${filePath}`);
                        continue;
                    }
                    
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    
                    // Create audio source
                    const source = this.audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.loop = true;
                    
                    // Create gain node
                    const gain = this.audioContext.createGain();
                    gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
                    
                    // Create panner node
                    const panner = this.audioContext.createStereoPanner();
                    panner.pan.setValueAtTime(0, this.audioContext.currentTime);
                    
                    // Connect nodes
                    source.connect(gain).connect(panner).connect(this.masterGain);
                    
                    // Store track data
                    this.tracks[trackName] = {
                        audio: source,
                        gain: gain,
                        panner: panner,
                        source: source,
                        buffer: audioBuffer
                    };
                    
                    console.log(`Successfully loaded ${trackName} from ${filePath}`);
                    loaded = true;
                    break;
                    
                } catch (error) {
                    console.warn(`Failed to load ${filePath}:`, error);
                    continue;
                }
            }
            
            // If no format worked, create a silent track
            if (!loaded) {
                console.warn(`No audio file found for ${trackName}, creating silent track`);
                this.createSilentTrack(trackName);
            }
        }
    }

    createSilentTrack(trackName) {
        // Create a silent audio buffer as fallback
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate, this.audioContext.sampleRate);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        
        const panner = this.audioContext.createStereoPanner();
        panner.pan.setValueAtTime(0, this.audioContext.currentTime);
        
        source.connect(gain).connect(panner).connect(this.masterGain);
        
        this.tracks[trackName] = {
            audio: source,
            gain: gain,
            panner: panner,
            source: source,
            buffer: buffer
        };
    }

    setupAnalyzers() {
        Object.keys(this.tracks).forEach((trackName, index) => {
            const analyzer = this.audioContext.createAnalyser();
            analyzer.fftSize = 256;
            analyzer.smoothingTimeConstant = 0.8;
            
            // Connect track to analyzer
            this.tracks[trackName].gain.connect(analyzer);
            
            this.analyzers[trackName] = analyzer;
        });
    }

    setupEventListeners() {
        // Listen for vertex modifications
        document.addEventListener('vertexModified', (event) => {
            this.handleVertexModification(event.detail);
        });
        
        // Listen for vertex data updates from visualizer
        document.addEventListener('vertexDataUpdated', (event) => {
            this.liveVertexUpdates.vertexData = event.detail;
        });
        
        // Listen for live update toggle
        document.addEventListener('toggleLiveUpdates', (event) => {
            this.liveVertexUpdates.enabled = event.detail.enabled;
            if (this.liveVertexUpdates.enabled && this.isPlaying) {
                this.startLiveVertexUpdates();
            } else {
                this.stopLiveVertexUpdates();
            }
        });
    }

    createEmptyPattern() {
        return {
            steps: 16,
            beats: 8,
            data: Array(16).fill().map(() => Array(8).fill(false)),
            velocity: Array(16).fill().map(() => Array(8).fill(0.5))
        };
    }

    async play() {
        if (this.isPlaying) return;
        
        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Check if any patterns have active beats
            const hasActivePatterns = Object.values(this.patterns).some(pattern => {
                return pattern.data.some(step => step.some(beat => beat));
            });
            
            // Start all tracks
            Object.values(this.tracks).forEach(track => {
                if (track.source && track.source.buffer) {
                    track.source.start(0);
                }
            });
            
            this.isPlaying = true;
            this.startTime = this.audioContext.currentTime;
            this.currentBeat = 0;
            
            // Immediately process pattern to set correct gain values
            this.processPattern();
            
            // Start beat tracking
            this.startBeatTracking();
            
            // Start live vertex updates if enabled
            if (this.liveVertexUpdates.enabled) {
                this.startLiveVertexUpdates();
            }
            
            console.log('Audio playback started');
        } catch (error) {
            console.error('Failed to start audio playback:', error);
        }
    }

    pause() {
        if (!this.isPlaying) return;
        
        // Stop all tracks
        Object.values(this.tracks).forEach(track => {
            if (track.source) {
                track.source.stop();
                // Recreate source for next play
                this.recreateSource(track);
            }
        });
        
        this.isPlaying = false;
        this.stopBeatTracking();
        this.stopLiveVertexUpdates();
        
        console.log('Audio playback paused');
    }

    recreateSource(track) {
        if (track.buffer) {
            const newSource = this.audioContext.createBufferSource();
            newSource.buffer = track.buffer;
            newSource.loop = true;
            newSource.connect(track.gain);
            track.source = newSource;
        }
    }

    startBeatTracking() {
        const beatDuration = 60 / this.bpm;
        this.beatInterval = setInterval(() => {
            this.currentBeat = (this.currentBeat + 1) % 16;
            this.processPattern();
            this.updateAudioData();
        }, beatDuration * 1000);
    }

    stopBeatTracking() {
        if (this.beatInterval) {
            clearInterval(this.beatInterval);
            this.beatInterval = null;
        }
    }

    processPattern() {
        Object.keys(this.tracks).forEach(trackName => {
            const pattern = this.patterns[trackName];
            const track = this.tracks[trackName];
            
            // If the pattern is empty or all steps are inactive, set gain to 0
            const hasAnyActiveBeat = pattern.data.some(step => step.some(beat => beat));
            if (!hasAnyActiveBeat) {
                track.gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                return;
            }

            // Check if any beat is active in current step
            const activeBeats = pattern.data[this.currentBeat].filter(beat => beat);
            
            if (activeBeats.length > 0) {
                // Calculate average velocity for this step
                const velocities = pattern.velocity[this.currentBeat].filter((v, i) => pattern.data[this.currentBeat][i]);
                const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
                
                // Apply velocity to gain
                track.gain.gain.setValueAtTime(avgVelocity, this.audioContext.currentTime);
            } else {
                track.gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            }
        });
    }

    updateAudioData() {
        // Update audio analysis data
        Object.keys(this.analyzers).forEach((trackName, index) => {
            const analyzer = this.analyzers[trackName];
            const dataArray = new Uint8Array(analyzer.frequencyBinCount);
            analyzer.getByteFrequencyData(dataArray);
            
            // Calculate average amplitude
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            this.audioData.amplitudes[index] = average / 255;
            
            // Update phase based on time
            this.audioData.phases[index] = (this.audioContext.currentTime * this.audioData.frequencies[index]) % (2 * Math.PI);
        });
        
        // Send data to visualizer
        if (this.onAudioData) {
            this.onAudioData(this.audioData);
        }
    }

    handleVertexModification(data) {
        const { layerIndex, displacement, position } = data;
        const trackNames = ['synth', 'bassline', 'drums', 'hihat'];
        const trackName = trackNames[layerIndex];
        
        if (trackName && this.tracks[trackName]) {
            const track = this.tracks[trackName];
            const currentTime = this.audioContext.currentTime;
            
            // Immediate response to manual vertex movement
            const immediateGain = Math.min(1, 0.3 + displacement * 2);
            track.gain.gain.setValueAtTime(immediateGain, currentTime);
            
            const pan = Math.max(-1, Math.min(1, position.x / 3));
            track.panner.pan.setValueAtTime(pan, currentTime);
            
            const freqMultiplier = 1 + (position.y / 3);
            if (track.source.playbackRate) {
                track.source.playbackRate.setValueAtTime(freqMultiplier, currentTime);
            }
            
            // Add filter effect if not already present
            if (!this.effects[trackName].filter) {
                this.addFilterEffect(trackName);
            }
            
            // Update filter based on Z position
            if (this.effects[trackName].filter) {
                const filterFreq = 2000 + Math.abs(position.z) * 1000;
                this.effects[trackName].filter.frequency.setValueAtTime(filterFreq, currentTime);
            }
        }
    }

    addFilterEffect(trackName) {
        if (!this.tracks[trackName]) return;
        
        const track = this.tracks[trackName];
        
        // Create filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        filter.Q.setValueAtTime(1, this.audioContext.currentTime);
        
        // Create delay for spatial effect
        const delay = this.audioContext.createDelay(0.1);
        delay.delayTime.setValueAtTime(0.05, this.audioContext.currentTime);
        
        // Reconnect audio chain: source -> gain -> filter -> delay -> panner -> master
        track.source.disconnect();
        track.gain.disconnect();
        track.panner.disconnect();
        
        track.source.connect(track.gain);
        track.gain.connect(filter);
        filter.connect(delay);
        delay.connect(track.panner);
        track.panner.connect(this.masterGain);
        
        // Store effects
        this.effects[trackName] = { filter, delay };
    }

    updatePattern(patternData) {
        const { track, pattern } = patternData;
        
        if (track && this.patterns[track]) {
            this.patterns[track] = { ...this.patterns[track], ...pattern };
        }
        
        if (this.onPatternChange) {
            this.onPatternChange(this.patterns);
        }
    }

    applyNoteToTrack(trackName, note) {
        const track = this.tracks[trackName];
        if (!track || !track.source) return;
        
        // Convert note to frequency
        const frequency = this.noteToFrequency(note);
        const baseFrequency = this.noteToFrequency('C4'); // Base frequency for C4
        const pitchRatio = frequency / baseFrequency;
        
        // Apply pitch change using playback rate
        if (track.source.playbackRate) {
            track.source.playbackRate.setValueAtTime(pitchRatio, this.audioContext.currentTime);
        }
        
        console.log(`Applied note ${note} (${frequency.toFixed(1)}Hz) to ${trackName}`);
    }

    noteToFrequency(note) {
        const noteMap = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6,
            'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };
        
        const match = note.match(/^([A-G]#?)(\d+)$/);
        if (!match) return 261.63; // Default to C4
        
        const [, noteName, octave] = match;
        const noteIndex = noteMap[noteName];
        const octaveNum = parseInt(octave);
        
        // Calculate frequency using A4 = 440Hz as reference
        const semitonesFromA4 = (octaveNum - 4) * 12 + noteIndex - 9; // A is index 9
        return 440 * Math.pow(2, semitonesFromA4 / 12);
    }

    setBPM(bpm) {
        this.bpm = bpm;
        
        // Restart beat tracking if playing
        if (this.isPlaying) {
            this.stopBeatTracking();
            this.startBeatTracking();
        }
    }

    setMasterVolume(volume) {
        this.masterVolume = volume;
        this.masterGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }

    setTrackVolume(trackName, volume) {
        if (this.tracks[trackName]) {
            this.tracks[trackName].gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        }
    }

    setTrackPan(trackName, pan) {
        if (this.tracks[trackName]) {
            this.tracks[trackName].panner.pan.setValueAtTime(pan, this.audioContext.currentTime);
        }
    }

    reset() {
        // Reset all track gains and panners
        Object.values(this.tracks).forEach(track => {
            track.gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
            track.panner.pan.setValueAtTime(0, this.audioContext.currentTime);
            if (track.source.playbackRate) {
                track.source.playbackRate.setValueAtTime(1, this.audioContext.currentTime);
            }
        });
        
        // Reset effects
        Object.values(this.effects).forEach(effect => {
            if (effect.filter) {
                effect.filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
            }
            if (effect.delay) {
                effect.delay.delayTime.setValueAtTime(0.05, this.audioContext.currentTime);
            }
        });
        
        // Reset patterns
        Object.keys(this.patterns).forEach(trackName => {
            this.patterns[trackName] = this.createEmptyPattern();
        });
        
        // Reset audio data
        this.audioData.amplitudes.fill(0);
        this.audioData.phases.fill(0);
        
        // Reset live vertex updates
        this.liveVertexUpdates.lastVertexPositions = [];
    }

    // Public API methods
    getAudioData() {
        return this.audioData;
    }

    getPatterns() {
        return this.patterns;
    }

    getTracks() {
        return this.tracks;
    }

    isAudioPlaying() {
        return this.isPlaying;
    }

    getBPM() {
        return this.bpm;
    }

    getMasterVolume() {
        return this.masterVolume;
    }

    startLiveVertexUpdates() {
        if (this.liveVertexUpdates.updateInterval) {
            clearInterval(this.liveVertexUpdates.updateInterval);
        }
        
        const updateInterval = 1000 / this.liveVertexUpdates.updateRate;
        this.liveVertexUpdates.updateInterval = setInterval(() => {
            this.updateLiveAudioParameters();
        }, updateInterval);
    }

    stopLiveVertexUpdates() {
        if (this.liveVertexUpdates.updateInterval) {
            clearInterval(this.liveVertexUpdates.updateInterval);
            this.liveVertexUpdates.updateInterval = null;
        }
    }

    updateLiveAudioParameters() {
        if (!this.liveVertexUpdates.vertexData || !this.isPlaying) return;
        
        const trackNames = ['synth', 'bassline', 'drums', 'hihat'];
        
        trackNames.forEach((trackName, layerIndex) => {
            const track = this.tracks[trackName];
            if (!track || !this.liveVertexUpdates.vertexData[layerIndex]) return;
            
            const layerData = this.liveVertexUpdates.vertexData[layerIndex];
            const currentTime = this.audioContext.currentTime;
            
            // Calculate average vertex displacement for this layer
            const positions = layerData.modified || new Float32Array(layerData.original.length);
            let totalDisplacement = 0;
            let avgX = 0, avgY = 0, avgZ = 0;
            let vertexCount = 0;
            
            for (let i = 0; i < positions.length; i += 3) {
                const displacement = Math.abs(positions[i + 2]); // Z displacement
                totalDisplacement += displacement;
                avgX += positions[i];
                avgY += positions[i + 1];
                avgZ += positions[i + 2];
                vertexCount++;
            }
            
            if (vertexCount > 0) {
                avgX /= vertexCount;
                avgY /= vertexCount;
                avgZ /= vertexCount;
                totalDisplacement /= vertexCount;
                
                // Update gain based on average displacement
                const baseGain = 0.3;
                const gainModulation = totalDisplacement * this.liveVertexUpdates.audioModulationDepth.gain;
                const newGain = Math.min(1, baseGain + gainModulation);
                track.gain.gain.setValueAtTime(newGain, currentTime);
                
                // Update panning based on average X position
                const panModulation = (avgX / 3) * this.liveVertexUpdates.audioModulationDepth.pan;
                const newPan = Math.max(-1, Math.min(1, panModulation));
                track.panner.pan.setValueAtTime(newPan, currentTime);
                
                // Update pitch based on average Y position
                const pitchModulation = 1 + (avgY / 3) * this.liveVertexUpdates.audioModulationDepth.pitch;
                if (track.source.playbackRate) {
                    track.source.playbackRate.setValueAtTime(pitchModulation, currentTime);
                }
                
                // Update filter frequency based on average Z position
                if (this.effects[trackName].filter) {
                    const baseFreq = 2000;
                    const filterModulation = baseFreq + (Math.abs(avgZ) * 1000) * this.liveVertexUpdates.audioModulationDepth.filter;
                    this.effects[trackName].filter.frequency.setValueAtTime(filterModulation, currentTime);
                }
            }
        });
    }

    async exportToWAV(repetitions = 1) {
        try {
            // Calculate pattern duration
            const beatDuration = 60 / this.bpm;
            const patternDuration = this.calculatePatternDuration();
            const totalDuration = patternDuration * repetitions;
            
            console.log('Export settings:', {
                bpm: this.bpm,
                beatDuration,
                patternDuration,
                totalDuration,
                repetitions
            });
            
            // Check if there are any active patterns
            const hasActivePatterns = Object.values(this.patterns).some(pattern => {
                return pattern.data.some(step => step.some(beat => beat));
            });
            
            console.log('Has active patterns:', hasActivePatterns);
            console.log('All patterns:', this.patterns);
            
            if (!hasActivePatterns) {
                console.warn('No active patterns found! Creating a test pattern...');
                // Create a test pattern for debugging
                this.patterns.drums.data[0][0] = true;
                this.patterns.drums.data[4][0] = true;
                this.patterns.drums.data[8][0] = true;
                this.patterns.drums.data[12][0] = true;
            }
            
            // Create offline audio context for rendering
            const sampleRate = 44100;
            const offlineContext = new OfflineAudioContext(2, sampleRate * totalDuration, sampleRate);
            
            // Create master gain for offline context
            const masterGain = offlineContext.createGain();
            masterGain.gain.setValueAtTime(this.masterVolume, 0);
            masterGain.connect(offlineContext.destination);
            
            // Render all tracks for each repetition
            const trackPromises = Object.keys(this.tracks).map(async (trackName) => {
                const track = this.tracks[trackName];
                const pattern = this.patterns[trackName];
                
                if (!track.buffer || !pattern) {
                    console.log(`Skipping track ${trackName}: no buffer or pattern`);
                    return;
                }
                
                console.log(`Processing track ${trackName}:`, pattern);
                
                // Count active beats for this track
                let activeBeatCount = 0;
                for (let step = 0; step < pattern.steps; step++) {
                    for (let beat = 0; beat < pattern.beats; beat++) {
                        if (pattern.data[step][beat]) activeBeatCount++;
                    }
                }
                console.log(`Track ${trackName} has ${activeBeatCount} active beats`);
                
                // Render each repetition
                for (let rep = 0; rep < repetitions; rep++) {
                    const repetitionOffset = rep * patternDuration;
                    
                    // Create audio source for each active step
                    for (let step = 0; step < pattern.steps; step++) {
                        for (let beat = 0; beat < pattern.beats; beat++) {
                            if (!pattern.data[step][beat]) continue;
                            
                            // Calculate timing: each beat is one beat duration
                            const startTime = repetitionOffset + (step * pattern.beats + beat) * beatDuration;
                            
                            console.log(`Adding note for ${trackName} at step ${step}, beat ${beat}, time ${startTime}`);
                            
                            // Create source
                            const source = offlineContext.createBufferSource();
                            source.buffer = track.buffer;
                            
                            // Create gain for this note with velocity
                            const gain = offlineContext.createGain();
                            const velocity = pattern.velocity[step][beat] || 0.5;
                            gain.gain.setValueAtTime(velocity, startTime);
                            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
                            
                            // Create panner
                            const panner = offlineContext.createStereoPanner();
                            panner.pan.setValueAtTime(0, startTime);
                            
                            // Connect nodes
                            source.connect(gain).connect(panner).connect(masterGain);
                            
                            // Start the source
                            source.start(startTime);
                        }
                    }
                }
            });
            
            // Wait for all tracks to be set up
            await Promise.all(trackPromises);
            
            // Render the audio
            const renderedBuffer = await offlineContext.startRendering();
            
            console.log('Audio rendering completed, buffer length:', renderedBuffer.length);
            
            // Convert to WAV format
            return this.bufferToWAV(renderedBuffer);
            
        } catch (error) {
            console.error('Failed to export WAV:', error);
            throw error;
        }
    }
    
    calculatePatternDuration() {
        const beatDuration = 60 / this.bpm;
        const patternSteps = 16; // 16 steps per pattern
        const patternBeats = 8; // 8 beats per step
        
        // Total beats in pattern = steps * beats per step
        const totalBeats = patternSteps * patternBeats;
        const patternDuration = totalBeats * beatDuration;
        
        console.log('Pattern duration calculation:', {
            bpm: this.bpm,
            beatDuration,
            patternSteps,
            patternBeats,
            totalBeats,
            patternDuration
        });
        
        return patternDuration;
    }
    
    bufferToWAV(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const length = buffer.length;
        
        // WAV header
        const header = new ArrayBuffer(44);
        const view = new DataView(header);
        
        // RIFF chunk descriptor
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length * numChannels * 2, true);
        this.writeString(view, 8, 'WAVE');
        
        // fmt sub-chunk
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // fmt chunk size
        view.setUint16(20, 1, true); // audio format (PCM)
        view.setUint16(22, numChannels, true); // num channels
        view.setUint32(24, sampleRate, true); // sample rate
        view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
        view.setUint16(32, numChannels * 2, true); // block align
        view.setUint16(34, 16, true); // bits per sample
        
        // data sub-chunk
        this.writeString(view, 36, 'data');
        view.setUint32(40, length * numChannels * 2, true);
        
        // Convert audio data
        const data = new Int16Array(length * numChannels);
        let offset = 0;
        
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                data[offset] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                offset++;
            }
        }
        
        // Combine header and data
        const wav = new Uint8Array(header.byteLength + data.byteLength);
        wav.set(new Uint8Array(header), 0);
        wav.set(new Uint8Array(data.buffer), header.byteLength);
        
        return wav.buffer;
    }
    
    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    /**
     * Load a custom audio file for a specific track
     * @param {string} trackName - The track to replace (synth, bassline, drums, hihat)
     * @param {File} file - The audio file (WAV, MP3, or FLAC)
     */
    async loadCustomAudioFile(trackName, file) {
        if (!this.tracks[trackName]) {
            console.error(`Invalid track name: ${trackName}`);
            return false;
        }

        // Validate file type
        const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/flac', 'audio/x-flac'];
        if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|flac)$/i)) {
            console.error('Unsupported audio format. Please use WAV, MP3, or FLAC files.');
            return false;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // Stop current track if playing
            if (this.tracks[trackName].source && this.isPlaying) {
                this.tracks[trackName].source.stop();
            }
            
            // Create new audio source
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = true;
            
            // Reconnect to existing gain and panner
            const gain = this.tracks[trackName].gain;
            const panner = this.tracks[trackName].panner;
            
            source.connect(gain).connect(panner).connect(this.masterGain);
            
            // Update track data
            this.tracks[trackName].audio = source;
            this.tracks[trackName].source = source;
            this.tracks[trackName].buffer = audioBuffer;
            
            // Start the new source if currently playing
            if (this.isPlaying) {
                source.start(0);
            }
            
            console.log(`Successfully loaded custom audio for ${trackName}: ${file.name}`);
            return true;
            
        } catch (error) {
            console.error(`Failed to load custom audio file for ${trackName}:`, error);
            return false;
        }
    }

    /**
     * Get supported audio formats for the current browser
     */
    getSupportedAudioFormats() {
        const formats = [];
        
        // Test for WAV support
        try {
            const testContext = new (window.AudioContext || window.webkitAudioContext)();
            const testBuffer = testContext.createBuffer(1, 44100, 44100);
            formats.push('WAV');
            testContext.close();
        } catch (e) {
            console.warn('WAV support not available');
        }
        
        // Test for MP3 support
        try {
            const testContext = new (window.AudioContext || window.webkitAudioContext)();
            const testBuffer = testContext.createBuffer(1, 44100, 44100);
            formats.push('MP3');
            testContext.close();
        } catch (e) {
            console.warn('MP3 support not available');
        }
        
        // FLAC support varies by browser
        if (window.AudioContext && window.AudioContext.prototype.decodeAudioData) {
            formats.push('FLAC (browser dependent)');
        }
        
        return formats;
    }
} 