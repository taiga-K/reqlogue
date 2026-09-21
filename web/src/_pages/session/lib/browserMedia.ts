export async function captureDisplay(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: "browser" },
    audio: true,
  });
}

export async function captureMic(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
}
