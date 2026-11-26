/**
 * Nachgebauter AudioContext für die Tests: er hört nichts, merkt sich aber, welche Werte
 * gesetzt wurden. Nur was die Klänge der Minispiele tatsächlich aufrufen.
 */

type Punkt = { wert: number; zeit: number }

export type Attrappe = ReturnType<typeof baueAudioAttrappe>

export function baueAudioAttrappe() {
  const kontexte: AttrappeKontext[] = []
  const oszillatoren: AttrappeOszillator[] = []
  const verstaerker: AttrappeVerstaerker[] = []
  const rauschquellen: object[] = []

  class AttrappeOszillator {
    type = 'sine'
    frequenzSetzt: Punkt[] = []
    frequenzGleitet: Punkt[] = []
    gestartetBei: number | null = null
    gestopptBei: number | null = null
    frequency = {
      value: 0,
      setValueAtTime: (wert: number, zeit: number) => this.frequenzSetzt.push({ wert, zeit }),
      exponentialRampToValueAtTime: (wert: number, zeit: number) =>
        this.frequenzGleitet.push({ wert, zeit }),
    }
    connect() {}
    start(zeit = 0) { this.gestartetBei = zeit }
    stop(zeit = 0) { this.gestopptBei = zeit }
  }

  class AttrappeVerstaerker {
    gesetzt: Punkt[] = []
    gleitet: Punkt[] = []
    gain = {
      value: 0,
      setValueAtTime: (wert: number, zeit: number) => this.gesetzt.push({ wert, zeit }),
      exponentialRampToValueAtTime: (wert: number, zeit: number) => this.gleitet.push({ wert, zeit }),
    }
    connect() {}
  }

  class AttrappeKontext {
    state = 'running'
    currentTime = 0
    sampleRate = 8000
    destination = {}
    fortgesetzt = 0
    geschlossen = false
    constructor() { kontexte.push(this) }
    resume() { this.fortgesetzt++; this.state = 'running'; return Promise.resolve() }
    close() { this.geschlossen = true; return Promise.resolve() }
    createOscillator() {
      const o = new AttrappeOszillator()
      oszillatoren.push(o)
      return o
    }
    createGain() {
      const g = new AttrappeVerstaerker()
      verstaerker.push(g)
      return g
    }
    createBuffer(_kanaele: number, laenge: number) {
      const daten = new Float32Array(laenge)
      return { getChannelData: () => daten }
    }
    createBufferSource() {
      const q = { buffer: null as unknown, connect() {}, start() {} }
      rauschquellen.push(q)
      return q
    }
    createBiquadFilter() {
      return { type: 'lowpass', frequency: { value: 0 }, connect() {} }
    }
  }

  return { AudioContext: AttrappeKontext, kontexte, oszillatoren, verstaerker, rauschquellen }
}
