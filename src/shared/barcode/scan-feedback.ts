/** Short generated beep (Web Audio API — no audio file/asset needed) to
 * confirm a successful decode, matching the audible feedback a real
 * handheld barcode scanner gives. Reuses one AudioContext across calls
 * since browsers cap how many can exist and creating one per scan is
 * wasteful. */
let audioCtx: AudioContext | null = null;

export function playScanBeep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();

    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 1800;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.12);
  } catch {
    // Audio is a nice-to-have confirmation, never a hard requirement —
    // a browser blocking autoplay/audio here must not break scanning.
  }
}
