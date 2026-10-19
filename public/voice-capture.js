// Runs on the audio thread. Stream 20 ms PCM frames; retain fractional resampling
// state across render quanta so 44.1/48 kHz devices never drift or click.
class PlantopediaCapture extends AudioWorkletProcessor {
  constructor() {
    super(); this.sum = 0; this.weight = 0; this.frames = []; this.muted = false;
    this.port.onmessage = ({data}) => { this.muted = data.muted; this.frames = []; this.sum = this.weight = 0; };
  }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel || this.muted) return true;
    const ratio = sampleRate / 24000;
    for (const value of channel) {
      let remaining = 1;
      while (remaining > 1e-8) {
        const take = Math.min(remaining, ratio - this.weight);
        this.sum += value * take; this.weight += take; remaining -= take;
        if (this.weight >= ratio - 1e-8) {
          const v = Math.max(-1, Math.min(1, this.sum / ratio));
          this.frames.push(Math.round(v * (v < 0 ? 32768 : 32767)));
          this.sum = this.weight = 0;
          if (this.frames.length === 480) {
            const bytes = new ArrayBuffer(960); const view = new DataView(bytes);
            this.frames.forEach((sample, i) => view.setInt16(i * 2, sample, true));
            this.port.postMessage(bytes, [bytes]); this.frames = [];
          }
        }
      }
    }
    return true;
  }
}
registerProcessor('plantopedia-capture', PlantopediaCapture);
