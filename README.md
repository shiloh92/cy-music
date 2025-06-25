# Audio Layer Structure & Cymatic Visualization

## Audio Synthesis Architecture

### Core Audio Tracks
The system operates with 4 distinct audio layers, each mapped to specific musical elements:

- **Synth** (Layer 0): High-frequency melodic content (C5 - 523.25 Hz)
- **Bassline** (Layer 1): Low-frequency harmonic foundation (C3 - 130.81 Hz)  
- **Drums** (Layer 2): Rhythmic percussion elements (C4 - 261.63 Hz)
- **Hi-Hat** (Layer 3): High-frequency rhythmic accents (C6 - 1046.50 Hz)

### Audio Processing Chain
Each track follows this signal path:
```
Audio Source → Gain Node → Filter → Delay → Stereo Panner → Master Gain → Output
```

### Pattern-Based Synthesis
- **Grid Structure**: 16 steps × 8 beats per pattern
- **Velocity Control**: Each grid cell stores velocity (0.0-1.0) for dynamic expression
- **Note Mapping**: Each track can be assigned different musical notes (C-G# across octaves 2-6)
- **BPM Synchronization**: Tempo affects both pattern playback and cymatic animation speed

## Cymatic Visualization → Audio Modulation

### Real-Time Vertex Analysis
The system continuously analyzes vertex positions across all 4 cymatic planes:

1. **Displacement Calculation**: Measures Z-axis displacement from original positions
2. **Position Averaging**: Computes average X, Y, Z coordinates per layer
3. **Change Detection**: Tracks vertex movement for responsive audio updates

### Audio Parameter Mapping

#### Gain Modulation
- **Source**: Average vertex displacement (Z-axis)
- **Range**: 0.3 - 1.0 (base gain + displacement × 0.5)
- **Effect**: Volume increases as vertices move away from base plane

#### Stereo Panning
- **Source**: Average X position of vertices
- **Range**: -1.0 to 1.0 (full left to full right)
- **Effect**: Spatial positioning based on horizontal vertex distribution

#### Pitch Modulation
- **Source**: Average Y position of vertices  
- **Range**: 0.5 - 1.5 (playback rate multiplier)
- **Effect**: Frequency shifts based on vertical vertex positioning

#### Filter Modulation
- **Source**: Average Z position (absolute value)
- **Range**: 2000 - 3000 Hz (lowpass filter frequency)
- **Effect**: Timbre changes as vertices move in depth

### Live Update System
- **Update Rate**: 60 Hz continuous parameter updates
- **Modulation Depth**: Configurable sensitivity per parameter type
- **Smooth Transitions**: AudioContext timing ensures glitch-free parameter changes

## Audio Synthesis Techniques

### Cymatic Pattern Generation
```javascript
// Cymatic displacement calculation
const cymaticZ = Math.sin(distance * frequency * 0.01 + time * speed + phase) * amplitude * 0.5;
```

### Frequency Mapping
- **Base Frequencies**: C3 (130.81 Hz) to C6 (1046.50 Hz)
- **Note Conversion**: A4 = 440 Hz reference, 12-tone equal temperament
- **Pitch Bending**: Real-time frequency modulation via playback rate

### Effects Processing
- **Lowpass Filter**: Dynamic cutoff frequency (2000-3000 Hz)
- **Delay**: 50ms delay time for spatial depth
- **Stereo Imaging**: Real-time panning based on vertex distribution

## Pattern Generation & Mixing

### Step Sequencer Logic
- **Beat Division**: 8 sub-beats per main step
- **Velocity Layers**: Independent velocity control per grid cell
- **Track Isolation**: Individual pattern editing per audio layer
- **Random Generation**: Algorithmic pattern creation with density control

### Mixing Strategy
- **Master Volume**: Global level control (0.0-1.0)
- **Track Balancing**: Individual gain per layer (0.0-1.0)
- **Spatial Distribution**: Dynamic stereo positioning
- **Frequency Separation**: Clear spectral boundaries between layers

### Export Capabilities
- **WAV Rendering**: Offline audio context for high-quality export
- **Pattern Repetition**: Configurable loop count for extended compositions
- **Metadata Preservation**: BPM, pattern data, and timing information

## Audio-Visual Synchronization

### Beat Tracking
- **BPM Lock**: Visual animation synchronized to musical tempo
- **Step Highlighting**: Real-time visual feedback for current pattern position
- **Phase Alignment**: Cymatic patterns phase-locked to musical timing

### Vertex Interaction
- **Immediate Response**: Manual vertex movement triggers instant audio changes
- **Continuous Modulation**: Automated vertex updates during playback
- **Layer Isolation**: Independent audio control per cymatic plane

This system creates a direct bridge between geometric manipulation and musical expression, where every vertex movement becomes a musical gesture. 