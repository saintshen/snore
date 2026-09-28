export class PcmRing {
    readonly sampleRate: number;
    private readonly data: Float32Array;
    private writeIndex = 0;
    private filled = 0;
    private totalWritten = 0;
    private lastWriteMs = 0;

    constructor(sampleRate: number, seconds = 30) {
        this.sampleRate = sampleRate;
        this.data = new Float32Array(Math.max(1, Math.ceil(sampleRate * seconds)));
    }

    write(samples: ArrayLike<number>, nowMs: number) {
        for (let i = 0; i < samples.length; i++) {
            this.data[this.writeIndex] = samples[i];
            this.writeIndex = (this.writeIndex + 1) % this.data.length;
        }
        this.totalWritten += samples.length;
        this.filled = Math.min(this.data.length, this.filled + samples.length);
        this.lastWriteMs = nowMs;
    }

    // Returns samples whose times fall in [startMs, endMs), relative to the last write.
    slice(startMs: number, endMs: number): Float32Array {
        if (this.totalWritten === 0 || endMs <= startMs) return new Float32Array();

        const to = this.totalWritten - Math.round(((this.lastWriteMs - endMs) * this.sampleRate) / 1000);
        const from = this.totalWritten - Math.round(((this.lastWriteMs - startMs) * this.sampleRate) / 1000);
        const start = Math.max(from, this.totalWritten - this.filled, 0);
        const end = Math.min(to, this.totalWritten);
        if (end <= start) return new Float32Array();

        const out = new Float32Array(end - start);
        for (let i = 0; i < out.length; i++) {
            out[i] = this.data[(start + i) % this.data.length];
        }
        return out;
    }
}
