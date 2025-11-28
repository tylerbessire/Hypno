class MicCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      // Send mono channel data to main thread for encoding
      this.port.postMessage(input[0]);
    }
    return true; // keep alive
  }
}

registerProcessor('mic-capture', MicCaptureProcessor);
