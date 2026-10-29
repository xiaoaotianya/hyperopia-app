let ctx: AudioContext | null = null
function tone(freqs: number[], dur = 0.12) {
  try {
    ctx ??= new AudioContext()
    // 在用户手势之前创建的 AudioContext 会处于 suspended 状态，之后需要 resume 才会出声
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    freqs.forEach((f, i) => {
      const o = ctx!.createOscillator(), g = ctx!.createGain()
      o.type = 'sine'; o.frequency.value = f
      const t = ctx!.currentTime + i * dur
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(ctx!.destination); o.start(t); o.stop(t + dur)
    })
  } catch { /* 无音频设备时静默 */ }
}
export const playCorrect = () => tone([660, 880])
export const playWrong = () => tone([300], 0.15)
export const playReward = () => tone([523, 659, 784, 1047])
