/**
 * Audio system using Web Audio API for ambient/cinematic sounds.
 * Generates procedural ambient tones — no external audio files needed.
 */
export class AudioSystem {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isPlaying: boolean = false;
    private oscillators: OscillatorNode[] = [];
    private noiseNode: AudioBufferSourceNode | null = null;

    constructor() {
        // Audio context created on user interaction
    }

    private initContext() {
        if (this.ctx) return;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0;
        this.masterGain.connect(this.ctx.destination);
    }

    public start() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isPlaying) return;

        this.isPlaying = true;

        // Deep ambient drone - layered oscillators
        const freqs = [55, 82.5, 110, 165]; // A1, E2, A2, E3
        const types: OscillatorType[] = ['sine', 'sine', 'triangle', 'sine'];
        const gains = [0.12, 0.08, 0.04, 0.02];

        freqs.forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();

            osc.type = types[i];
            osc.frequency.value = freq;
            gain.gain.value = gains[i];

            // Subtle LFO for movement
            const lfo = this.ctx!.createOscillator();
            const lfoGain = this.ctx!.createGain();
            lfo.type = 'sine';
            lfo.frequency.value = 0.1 + i * 0.05;
            lfoGain.gain.value = freq * 0.01; // Very subtle pitch wobble
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();

            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start();
            this.oscillators.push(osc, lfo);
        });

        // Filtered noise for "digital wind" texture
        const bufferSize = this.ctx.sampleRate * 4;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.5;
        }

        this.noiseNode = this.ctx.createBufferSource();
        this.noiseNode.buffer = noiseBuffer;
        this.noiseNode.loop = true;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 800;
        noiseFilter.Q.value = 2;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0.015;

        this.noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        this.noiseNode.start();

        // Fade in
        this.masterGain.gain.linearRampToValueAtTime(0.6, this.ctx.currentTime + 2);

        // Update button state
        const btn = document.getElementById('audio-toggle');
        if (btn) {
            btn.classList.add('playing');
            const icon = btn.querySelector('.audio-icon');
            if (icon) icon.textContent = '🔊';
        }
    }

    public stop() {
        if (!this.ctx || !this.masterGain) return;
        this.isPlaying = false;

        // Fade out
        this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);

        setTimeout(() => {
            this.oscillators.forEach(osc => {
                try { osc.stop(); } catch (e) { }
            });
            this.oscillators = [];
            if (this.noiseNode) {
                try { this.noiseNode.stop(); } catch (e) { }
                this.noiseNode = null;
            }
        }, 1200);

        const btn = document.getElementById('audio-toggle');
        if (btn) {
            btn.classList.remove('playing');
            const icon = btn.querySelector('.audio-icon');
            if (icon) icon.textContent = '🔇';
        }
    }

    public toggle() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }
    }

    /** Play a short transition whoosh sound */
    public playTransitionWhoosh() {
        this.initContext();
        if (!this.ctx || !this.masterGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 0.5);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 1.5);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(5000, this.ctx.currentTime + 0.3);
        filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 1.5);
        filter.Q.value = 5;

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 2);
    }

    /** Play a subtle UI hover blip */
    public playHoverBlip() {
        this.initContext();
        if (!this.ctx || !this.masterGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    get playing() { return this.isPlaying; }
}
