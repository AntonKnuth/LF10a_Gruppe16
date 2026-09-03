import { useEffect } from 'react'
import { bedienung } from '../bedienung'

/** A4: Ton ist nur funktional und abschaltbar. Geschaltet wird im Pausenmenü. */
export const tonAn = () => bedienung().tonAn

/** A5: Jede Anweisung wird zusätzlich vorgelesen. Später ersetzt ein MP3 die Stimme. */
export function vorlesen(text: string) {
  if (!tonAn() || !('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'de-DE'
  u.rate = 0.9
  u.volume = bedienung().lautstaerke
  speechSynthesis.speak(u)
}

/** Liest den Text beim Erscheinen des Bildschirms vor und bricht beim Verlassen ab. */
export function useVorlesen(text: string) {
  useEffect(() => {
    vorlesen(text)
    return () => speechSynthesis?.cancel()
  }, [text])
}
