export class PatternGenerator {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.currentTrack = 'drums';
        this.bpm = 120;
        this.isPlaying = false;
        this.currentStep = 0;
        this.stepInterval = null;
        
        // Pattern data
        this.patterns = {
            drums: this.createEmptyPattern(),
            bassline: this.createEmptyPattern(),
            synth: this.createEmptyPattern(),
            hihat: this.createEmptyPattern()
        };
        
        // Note data for each track
        this.notes = {
            drums: 'C4',
            bassline: 'C3',
            synth: 'C5',
            hihat: 'C6'
        };
        
        // Current note selection
        this.currentNote = 'C';
        this.currentOctave = 4;
        
        // Drawing functionality
        this.isDrawing = false;
        this.drawMode = 'toggle'; // 'toggle', 'add', 'remove'
        this.isMouseDown = false;
        this.lastDrawnCell = null;
        
        // UI elements
        this.gridElement = null;
        this.bpmSlider = null;
        this.bpmDisplay = null;
        this.tabButtons = null;
        this.currentNoteDisplay = null;
        this.notePickerToggle = null;
        this.notePicker = null;
        this.noteButtons = null;
        this.octaveButtons = null;
        this.drawModeButtons = null;
        
        // Audio file input elements
        this.audioFileInputs = {};
        this.fileStatusElements = {};
        
        // Callbacks
        this.onPatternChange = null;
        
        // Track colors (matching 3D plane colors)
        this.trackColors = {
            synth: '#667eea',      // Blue
            bassline: '#764ba2',   // Purple
            drums: '#f093fb',      // Pink
            hihat: '#f5576c'       // Red
        };
    }

    async init() {
        this.setupUI();
        this.setupEventListeners();
        this.generateGrid();
        this.updateDisplay();
        this.updateNoteDisplayForTrack();
        
        console.log('PatternGenerator initialized successfully');
    }

    setupUI() {
        this.gridElement = document.getElementById('pattern-grid');
        this.bpmSlider = document.getElementById('bpm-slider');
        this.bpmDisplay = document.getElementById('bpm-display');
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.currentNoteDisplay = document.getElementById('current-note');
        this.notePickerToggle = document.getElementById('note-picker-toggle');
        this.notePicker = document.getElementById('note-picker');
        this.noteButtons = document.querySelectorAll('.note-btn');
        this.octaveButtons = document.querySelectorAll('.octave-btn');
        this.drawModeButtons = document.querySelectorAll('.draw-mode-btn');
        
        // Setup audio file inputs
        this.setupAudioFileInputs();
    }

    setupEventListeners() {
        // Tab switching
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTrack(button.dataset.track);
            });
        });

        // BPM control
        this.bpmSlider.addEventListener('input', (e) => {
            this.setBPM(parseInt(e.target.value));
        });

        // Pattern controls
        document.getElementById('clear-pattern').addEventListener('click', () => {
            this.clearPattern();
        });

        document.getElementById('random-pattern').addEventListener('click', () => {
            this.generateRandomPattern();
        });

        document.getElementById('save-pattern').addEventListener('click', () => {
            this.savePattern();
        });

        // Export WAV button
        document.getElementById('export-wav').addEventListener('click', () => {
            this.exportWAV();
        });

        // Panel toggle
        document.getElementById('togglePanel').addEventListener('click', () => {
            this.togglePanel();
        });

        // Note picker toggle
        this.notePickerToggle.addEventListener('click', () => {
            this.toggleNotePicker();
        });

        // Note selection
        this.noteButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.selectNote(button.dataset.note);
            });
        });

        // Octave selection
        this.octaveButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.selectOctave(parseInt(button.dataset.octave));
            });
        });

        // Draw mode selection
        this.drawModeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.setDrawMode(button.dataset.mode);
            });
        });

        // Global mouse events for drawing
        document.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            this.lastDrawnCell = null;
        });
    }

    generateGrid() {
        if (!this.gridElement) return;

        this.gridElement.innerHTML = '';
        const pattern = this.patterns[this.currentTrack];
        
        // Create grid cells
        for (let step = 0; step < pattern.steps; step++) {
            for (let beat = 0; beat < pattern.beats; beat++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.step = step;
                cell.dataset.beat = beat;
                
                // Set active state
                if (pattern.data[step][beat]) {
                    cell.classList.add('active');
                }
                
                // Add click handler
                cell.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleCellClick(step, beat);
                });
                
                // Add mouse down handler for drawing
                cell.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.isMouseDown = true;
                    this.handleCellClick(step, beat);
                });
                
                // Add mouse enter handler for drawing
                cell.addEventListener('mouseenter', (e) => {
                    if (this.isMouseDown && this.lastDrawnCell !== `${step}-${beat}`) {
                        this.handleCellClick(step, beat);
                        this.lastDrawnCell = `${step}-${beat}`;
                    }
                    
                    // Hover effect
                    if (!this.isPlaying) {
                        cell.style.backgroundColor = this.trackColors[this.currentTrack];
                        cell.style.opacity = '0.7';
                    }
                });
                
                cell.addEventListener('mouseleave', () => {
                    if (!this.isPlaying) {
                        cell.style.backgroundColor = '';
                        cell.style.opacity = '';
                    }
                });
                
                this.gridElement.appendChild(cell);
            }
        }
    }

    handleCellClick(step, beat) {
        const pattern = this.patterns[this.currentTrack];
        
        // Apply draw mode logic
        let newState;
        switch (this.drawMode) {
            case 'add':
                newState = true;
                break;
            case 'remove':
                newState = false;
                break;
            case 'toggle':
            default:
                newState = !pattern.data[step][beat];
                break;
        }
        
        // Update the cell
        pattern.data[step][beat] = newState;
        
        // Update UI
        const cell = this.gridElement.querySelector(`[data-step="${step}"][data-beat="${beat}"]`);
        if (cell) {
            cell.classList.toggle('active', newState);
        }
        
        // Notify audio manager
        this.notifyPatternChange();
    }

    setDrawMode(mode) {
        this.drawMode = mode;
        
        // Update UI
        this.drawModeButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.mode === mode);
        });
        
        // Update cursor
        if (this.gridElement) {
            this.gridElement.style.cursor = mode === 'remove' ? 'crosshair' : 'pointer';
        }
    }

    switchTrack(trackName) {
        if (this.currentTrack === trackName) return;
        
        // Update tab buttons
        this.tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.track === trackName);
        });
        
        this.currentTrack = trackName;
        
        // Update note display for the new track
        this.updateNoteDisplayForTrack();
        
        // Regenerate grid for new track
        this.generateGrid();
        
        // Notify audio manager
        this.notifyPatternChange();
        
        // Update audio file input visibility
        this.updateAudioFileInputVisibility();
    }

    updateNoteDisplayForTrack() {
        const trackNote = this.notes[this.currentTrack];
        if (trackNote) {
            this.currentNote = trackNote.replace(/\d+$/, '');
            this.currentOctave = parseInt(trackNote.match(/\d+$/)[0]);
            this.updateCurrentNoteDisplay();
        }
    }

    updateNotePickerUI() {
        // Update note buttons
        this.noteButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.note === this.currentNote);
        });
        
        // Update octave buttons
        this.octaveButtons.forEach(button => {
            button.classList.toggle('active', parseInt(button.dataset.octave) === this.currentOctave);
        });
    }

    setBPM(bpm) {
        this.bpm = bpm;
        
        if (this.bpmDisplay) {
            this.bpmDisplay.textContent = bpm;
        }
        
        // Update audio manager
        if (this.audioManager) {
            this.audioManager.setBPM(bpm);
        }
        
        // Update step tracking if playing
        if (this.isPlaying) {
            this.stopStepTracking();
            this.startStepTracking();
        }
    }

    startStepTracking() {
        if (this.stepInterval) {
            clearInterval(this.stepInterval);
        }
        
        const stepDuration = (60 / this.bpm) * 4; // 4 beats per step
        this.stepInterval = setInterval(() => {
            this.updateCurrentStep();
        }, stepDuration * 1000);
    }

    stopStepTracking() {
        if (this.stepInterval) {
            clearInterval(this.stepInterval);
            this.stepInterval = null;
        }
        this.clearCurrentStepHighlight();
    }

    updateCurrentStep() {
        const pattern = this.patterns[this.currentTrack];
        const totalSteps = pattern.steps;
        
        // Clear previous highlight
        this.clearCurrentStepHighlight();
        
        // Highlight current step
        const cells = this.gridElement.querySelectorAll(`[data-step="${this.currentStep}"]`);
        cells.forEach(cell => {
            cell.classList.add('current-step');
        });
        
        // Move to next step
        this.currentStep = (this.currentStep + 1) % totalSteps;
    }

    clearCurrentStepHighlight() {
        const cells = this.gridElement.querySelectorAll('.current-step');
        cells.forEach(cell => {
            cell.classList.remove('current-step');
        });
    }

    clearPattern() {
        this.patterns[this.currentTrack] = this.createEmptyPattern();
        this.generateGrid();
        this.notifyPatternChange();
    }

    generateRandomPattern() {
        const pattern = this.patterns[this.currentTrack];
        const density = this.getTrackDensity();
        
        // Clear existing pattern and regenerate with array structure
        pattern.data = Array(pattern.steps).fill().map(() => Array(pattern.beats).fill(false));
        pattern.velocity = Array(pattern.steps).fill().map(() => Array(pattern.beats).fill(0.5));
        
        // Generate random pattern
        for (let step = 0; step < pattern.steps; step++) {
            for (let beat = 0; beat < pattern.beats; beat++) {
                if (Math.random() < density) {
                    pattern.data[step][beat] = true;
                }
            }
        }
        
        this.generateGrid();
        this.notifyPatternChange();
    }

    getTrackDensity() {
        const densities = {
            drums: 0.3,
            bassline: 0.2,
            synth: 0.15,
            hihat: 0.4
        };
        return densities[this.currentTrack] || 0.2;
    }

    savePattern() {
        const patternData = {
            track: this.currentTrack,
            pattern: this.patterns[this.currentTrack],
            note: this.notes[this.currentTrack],
            bpm: this.bpm,
            timestamp: Date.now()
        };
        
        // Save to localStorage
        const savedPatterns = JSON.parse(localStorage.getItem('cymaticPatterns') || '[]');
        savedPatterns.push(patternData);
        localStorage.setItem('cymaticPatterns', JSON.stringify(savedPatterns));
        
        this.showSaveConfirmation();
    }

    showSaveConfirmation() {
        const notification = document.createElement('div');
        notification.className = 'save-notification';
        notification.textContent = 'Pattern saved successfully!';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 2000);
    }

    async exportWAV() {
        try {
            // Show export dialog
            const repetitions = await this.showExportDialog();
            if (repetitions === null) return; // User cancelled
            
            // Show loading state
            const exportButton = document.getElementById('export-wav');
            const originalText = exportButton.textContent;
            exportButton.textContent = 'Exporting...';
            exportButton.disabled = true;
            
            // Get current patterns from PatternGenerator and sync with AudioManager
            console.log('Current patterns in PatternGenerator:', this.patterns);
            
            // Update AudioManager with current patterns
            Object.keys(this.patterns).forEach(trackName => {
                this.audioManager.updatePattern({
                    track: trackName,
                    pattern: this.patterns[trackName]
                });
            });
            
            // Get current audio data from audio manager with repetitions
            const audioData = await this.audioManager.exportToWAV(repetitions);
            
            // Create download link
            const blob = new Blob([audioData], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cymatic-pattern-${repetitions}reps-${Date.now()}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Reset button
            exportButton.textContent = originalText;
            exportButton.disabled = false;
            
            this.showSaveConfirmation();
        } catch (error) {
            console.error('Failed to export WAV:', error);
            
            // Reset button
            exportButton.textContent = 'Export Audio';
            exportButton.disabled = false;
            
            // Show error
            const notification = document.createElement('div');
            notification.className = 'error-notification';
            notification.textContent = 'Failed to export WAV file';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 3000);
        }
    }

    async showExportDialog() {
        return new Promise((resolve) => {
            // Calculate pattern duration
            const patternDuration = this.audioManager.calculatePatternDuration();
            
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'export-modal-overlay';
            
            // Create modal content
            const modal = document.createElement('div');
            modal.className = 'export-modal';
            
            // Create form
            const form = document.createElement('form');
            form.innerHTML = `
                <h3>Export Pattern</h3>
                
                <div style="margin-bottom: 20px;">
                    <label for="repetitions-input">
                        Number of Pattern Repetitions:
                    </label>
                    <input type="number" id="repetitions-input" 
                           min="1" max="100" value="4">
                </div>
                
                <div class="info-box">
                    <div class="label">Estimated Duration:</div>
                    <div id="duration-display" class="value">
                        ${this.formatDuration(patternDuration * 4)}
                    </div>
                </div>
                
                <div class="info-box">
                    <div class="label">Export Details:</div>
                    <div class="details">
                        • All 4 audio layers (Drums, Bassline, Synth, Hi-Hat)<br>
                        • Pattern velocity and timing preserved<br>
                        • Single WAV file output
                    </div>
                </div>
                
                <div class="button-group">
                    <button type="button" id="cancel-export" class="btn-cancel">
                        Cancel
                    </button>
                    <button type="submit" id="confirm-export" class="btn-export">
                        Export
                    </button>
                </div>
            `;
            
            // Add event listeners
            const repetitionsInput = form.querySelector('#repetitions-input');
            const durationDisplay = form.querySelector('#duration-display');
            const cancelButton = form.querySelector('#cancel-export');
            
            // Update duration when repetitions change
            repetitionsInput.addEventListener('input', () => {
                const reps = parseInt(repetitionsInput.value) || 1;
                const totalDuration = patternDuration * reps;
                durationDisplay.textContent = this.formatDuration(totalDuration);
            });
            
            // Handle form submission
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const repetitions = parseInt(repetitionsInput.value) || 1;
                document.body.removeChild(overlay);
                resolve(repetitions);
            });
            
            // Handle cancel
            cancelButton.addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(null);
            });
            
            // Handle overlay click to close
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    resolve(null);
                }
            });
            
            // Add to DOM
            modal.appendChild(form);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            // Focus input
            repetitionsInput.focus();
        });
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    togglePanel() {
        const panel = document.getElementById('pattern-panel');
        panel.classList.toggle('collapsed');
    }

    updateDisplay() {
        if (this.bpmDisplay) {
            this.bpmDisplay.textContent = this.bpm;
        }
        if (this.bpmSlider) {
            this.bpmSlider.value = this.bpm;
        }
    }

    notifyPatternChange() {
        if (this.onPatternChange) {
            this.onPatternChange({
                track: this.currentTrack,
                pattern: this.patterns[this.currentTrack]
            });
        }
    }

    createEmptyPattern() {
        return {
            steps: 16,
            beats: 8,
            data: Array(16).fill().map(() => Array(8).fill(false)),
            velocity: Array(16).fill().map(() => Array(8).fill(0.5))
        };
    }

    update() {
        // Update logic here if needed
    }

    getCurrentTrack() {
        return this.currentTrack;
    }

    getPatterns() {
        return this.patterns;
    }

    getBPM() {
        return this.bpm;
    }

    isPatternPlaying() {
        return this.isPlaying;
    }

    setPlaying(playing) {
        this.isPlaying = playing;
        
        if (playing) {
            this.startStepTracking();
        } else {
            this.stopStepTracking();
        }
    }

    toggleNotePicker() {
        this.notePicker.classList.toggle('hidden');
        this.updateNotePickerUI();
    }

    selectNote(note) {
        this.currentNote = note;
        this.updateCurrentNoteDisplay();
        this.notifyNoteChange();
    }

    selectOctave(octave) {
        this.currentOctave = octave;
        this.updateCurrentNoteDisplay();
        this.notifyNoteChange();
    }

    updateCurrentNoteDisplay() {
        const fullNote = `${this.currentNote}${this.currentOctave}`;
        this.notes[this.currentTrack] = fullNote;
        
        if (this.currentNoteDisplay) {
            this.currentNoteDisplay.textContent = fullNote;
        }
    }

    notifyNoteChange() {
        if (this.audioManager) {
            this.audioManager.applyNoteToTrack(this.currentTrack, this.notes[this.currentTrack]);
        }
    }

    setupAudioFileInputs() {
        const trackNames = ['synth', 'bassline', 'drums', 'hihat'];
        
        trackNames.forEach(trackName => {
            const inputId = `${trackName}-file`;
            const statusId = `${trackName}-status`;
            
            this.audioFileInputs[trackName] = document.getElementById(inputId);
            this.fileStatusElements[trackName] = document.getElementById(statusId);
            
            // Add event listener for file input
            if (this.audioFileInputs[trackName]) {
                this.audioFileInputs[trackName].addEventListener('change', async (event) => {
                    await this.handleAudioFileInput(trackName, event.target.files[0]);
                });
            }
        });
        
        // Show the initial track's audio file input
        this.updateAudioFileInputVisibility();
    }

    updateAudioFileInputVisibility() {
        const trackNames = ['synth', 'bassline', 'drums', 'hihat'];
        
        trackNames.forEach(trackName => {
            const inputGroup = this.audioFileInputs[trackName]?.closest('.file-input-group');
            if (inputGroup) {
                if (trackName === this.currentTrack) {
                    inputGroup.classList.add('active');
                } else {
                    inputGroup.classList.remove('active');
                }
            }
        });
    }

    async handleAudioFileInput(trackName, file) {
        if (!file) return;
        
        const statusElement = this.fileStatusElements[trackName];
        
        // Update status to loading
        if (statusElement) {
            statusElement.textContent = 'Loading...';
            statusElement.className = 'file-status';
        }
        
        try {
            // Load the audio file through the audio manager
            const success = await this.audioManager.loadCustomAudioFile(trackName, file);
            
            if (success) {
                // Update status to loaded
                if (statusElement) {
                    statusElement.textContent = 'Loaded';
                    statusElement.className = 'file-status loaded';
                }
                
                this.showNotification(`Loaded custom audio for ${trackName}: ${file.name}`, 'success');
            } else {
                // Update status to error
                if (statusElement) {
                    statusElement.textContent = 'Error';
                    statusElement.className = 'file-status error';
                }
                
                this.showNotification(`Failed to load audio file for ${trackName}`, 'error');
            }
        } catch (error) {
            console.error(`Error loading audio file for ${trackName}:`, error);
            
            // Update status to error
            if (statusElement) {
                statusElement.textContent = 'Error';
                statusElement.className = 'file-status error';
            }
            
            this.showNotification(`Error loading audio file for ${trackName}`, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create a simple notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }
} 