import { useEffect } from 'react'

/** A4: Ton ist nur funktional und abschaltbar. */
export const tonAn = () => localStorage.getItem('tk.tonAus') !== '1'

/** A5: Jede Anweisung wird zusätzlich vorgelesen. Später ersetzt ein MP3 die Stimme. */
export function vorlesen(text: string) {
  if (!tonAn() || !('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'de-DE'
  u.rate = 0.9
  speechSynthesis.speak(u)
}

/** Liest den Text beim Erscheinen des Bildschirms vor und bricht beim Verlassen ab. */
export function useVorlesen(text: string) {
  useEffect(() => {
    vorlesen(text)
    return () => speechSynthesis?.cancel()
  }, [text])
}
