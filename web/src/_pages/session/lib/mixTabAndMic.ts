export type MixedCapture = {
  readonly stream: MediaStream;
  stop: () => void;
};

export async function mixTabAndMic(
  tab: MediaStream,
  mic: MediaStream,
  context = new AudioContext(),
): Promise<MixedCapture> {
  await context.resume();
  const destination = context.createMediaStreamDestination();
  const tabSource = context.createMediaStreamSource(tab);
  const micSource = context.createMediaStreamSource(mic);
  tabSource.connect(destination);
  micSource.connect(destination);
  tabSource.connect(context.destination);
  return {
    stream: destination.stream,
    stop() {
      stopTracks(tab);
      stopTracks(mic);
      void context.close();
    },
  };
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
