// AudioWorkletProcessor: downmix Float32 mic frames to 16-bit PCM
// and post them to the main thread as ArrayBuffers.
// The main thread batches these into ~100ms chunks before sending to
// the Gemini Live WebSocket.

class PcmWorklet extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch = input[0];
    if (!ch || ch.length === 0) return true;

    const pcm = new Int16Array(ch.length);
    for (let i = 0; i < ch.length; i++) {
      let s = ch[i];
      if (s > 1) s = 1;
      else if (s < -1) s = -1;
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    return true;
  }
}

registerProcessor("pcm-worklet", PcmWorklet);
