export const speechAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window
export function speak(text: string) {
  if (!speechAvailable()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'; u.rate = 0.9; u.pitch = 1.2
  const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('zh'))
  if (v) u.voice = v
  window.speechSynthesis.speak(u)
}
