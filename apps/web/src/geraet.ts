/**
 * Das Gerätetoken. Es kommt einmal bei der Kopplung vom Server und bleibt danach hier liegen.
 *
 * Aus ihm liest der Server, zu welchem Kind dieses Tablet gehört. Deshalb schickt die App
 * nirgends eine Klient-Nummer mit — sie könnte gar nicht erst versuchen, Daten eines fremden
 * Kindes zu lesen oder zu senden.
 *
 * Das Token liegt in `localStorage` und ist damit so sicher wie das Gerät selbst. Ein
 * verlorenes Tablet wird nicht hier gesperrt, sondern vom Therapeuten auf dem Server.
 */
const SCHLUESSEL = 'tk.geraeteToken'

export const ladeToken = () => localStorage.getItem(SCHLUESSEL)
export const speichereToken = (token: string) => localStorage.setItem(SCHLUESSEL, token)
export const vergissToken = () => localStorage.removeItem(SCHLUESSEL)
