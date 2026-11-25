import { vereine } from '../content'
import type { Verein } from '../content/typen'
import { istBesucht, type Fortschritt } from '../profil'
import { Pin } from './Figuren'

/**
 * Die Landkarte. Startbildschirm und Reise zeigen dieselbe, deshalb liegt sie hier und nicht in
 * einem der beiden Bildschirme. Gezeichnet wird in einem SVG mit `viewBox="0 0 1000 750"`.
 */

type Punkt = { x: number; y: number }

/**
 * Kartenfläche im SVG. `karte.x/y` eines Vereins sind Prozent davon.
 *
 * Umrisse und Nadeln liegen in derselben einfachen Projektion: Ein Längengrad ist 18 Einheiten
 * breit, ein Breitengrad 20 hoch, oben liegt der 61. Breitengrad, 10° Ost in der Mitte. Für einen
 * neuen Verein heißt das: x = 50 + (Länge − 10) · 1,8 und y = (61 − Breite) · 4,35.
 */
const KARTE = { x: 0, y: 290, b: 1000, h: 460 }

export const kartenpunkt = (k: Punkt): Punkt => ({
  x: KARTE.x + (k.x / 100) * KARTE.b,
  y: KARTE.y + (k.y / 100) * KARTE.h,
})

/** Vereinfachte Umrisse aus Längen- und Breitengraden von Hand gesetzt, ohne Ländergrenzen. */
const LAND = [
  // Festland
  'M511 356 500 359 489 367 475 368 468 376 466 390 466 399 475 402 477 412 480 418 475 424 480 428 481 432 491 437 477 433 473 438 468 442 466 438 450 436 446 443 442 441 428 442 417 446 417 453 424 458 417 461 413 456 406 451 402 462 396 468 392 472 394 478 383 479 385 482 378 483 367 488 349 492 349 506 324 516 322 522 300 523 297 516 286 516 291 536 273 538 257 534 235 540 241 552 273 562 286 574 298 590 298 616 293 640 252 641 216 637 176 636 154 650 162 672 163 694 151 734 162 742 160 770 187 766 205 776 219 790 241 776 280 776 307 758 324 736 315 720 334 694 360 682 378 666 374 650 392 640 415 644 439 646 455 634 478 622 500 630 509 652 532 668 543 680 568 686 577 696 599 710 606 734 603 750 617 742 628 728 619 714 626 700 649 712 651 704 624 688 612 680 610 672 590 670 572 656 563 638 543 624 543 606 558 596 567 598 568 612 581 604 594 626 615 640 644 656 669 672 669 700 684 720 702 742 732 750 752 756 741 738 730 722 729 702 748 712 756 704 750 694 788 692 792 708 815 690 840 690 840 684 824 672 817 658 833 642 837 624 855 606 874 580 914 588 905 602 923 620 957 610 975 602 950 586 979 574 1026 568 1008 590 993 610 1035 640 1069 670 1004 690 968 678 919 670 878 688 846 686 840 700 806 706 792 720 804 744 815 770 1130 790 1130 250 698 250 703 280 707 298 734 312 770 306 824 300 864 312 824 320 770 320 743 326 743 338 759 344 757 364 743 370 727 356 705 362 698 380 700 400 689 412 673 422 655 422 658 418 649 414 626 417 612 425 590 428 577 432 568 428 565 420 556 418 545 421 538 427 527 429 518 431 516 423 504 422 498 414 491 413 495 404 493 398 500 393 505 388 516 385 516 380 505 378 505 370 510 362Z',
  // Skandinavien
  'M410 250 410 300 419 330 439 348 464 348 493 330 507 320 522 330 525 344 534 358 540 368 550 378 547 384 550 392 552 402 576 402 577 396 585 390 604 388 613 378 617 370 621 344 640 332 660 314 631 296 631 276 644 250Z',
  // Fünen
  'M498 400 505 398 511 400 514 405 513 409 504 409 500 405Z',
  // Seeland
  'M520 396 527 392 532 395 536 388 545 389 545 397 541 404 538 408 536 414 523 415 522 406Z',
  // Gotland
  'M648 362 658 352 658 364 649 370Z',
  // Saaremaa
  'M714 342 734 338 723 348Z',
  // Großbritannien
  'M228 338 264 338 248 356 284 358 275 382 262 390 284 394 293 412 316 428 324 442 322 452 329 451 343 452 352 458 349 468 342 474 334 480 345 483 343 488 336 492 324 495 298 496 259 502 253 506 221 508 243 488 270 482 226 474 244 460 237 452 243 444 266 442 266 428 257 418 232 416 235 398 219 400 221 384 212 374 219 358Z',
  // Irland
  'M208 442 219 420 208 406 187 404 169 418 140 426 154 446 135 468 147 480 176 474 205 466Z',
  // Korsika
  'M489 650 491 670 486 682 475 666Z',
  // Sardinien
  'M486 686 495 700 491 726 475 730 471 700Z',
  // Mallorca
  'M363 718 378 712 376 724Z',
]

/** Himmel mit Wolken. Füllt den ganzen Bildschirm, die Erde liegt davor. */
export function Himmel() {
  return (
    <>
      <defs>
        <linearGradient id="himmel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c6e9fb" />
          <stop offset="100%" stopColor="#6cbfec" />
        </linearGradient>
      </defs>
      <rect width="1000" height="750" fill="url(#himmel)" />

      {/* Jede Wolke in einer eigenen Hülle mit eigenem Tempo — sonst schwebt der ganze
          Himmel im Gleichschritt und sieht aus wie ein Fehler. */}
      <g fill="#fff" opacity="0.92">
        <g className="s-wolke" style={{ animationDuration: '24s' }}>
          <Wolke x={120} y={150} s={1.1} />
        </g>
        <g className="s-wolke" style={{ animationDuration: '31s', animationDirection: 'reverse' }}>
          <Wolke x={840} y={195} s={0.9} />
        </g>
        <g className="s-wolke" style={{ animationDuration: '38s' }}>
          <Wolke x={330} y={95} s={0.7} />
        </g>
        <g className="s-wolke" style={{ animationDuration: '27s', animationDirection: 'reverse' }}>
          <Wolke x={640} y={120} s={0.6} />
        </g>
      </g>
    </>
  )
}

function Wolke({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="54" ry="26" />
      <ellipse cx="-38" cy="8" rx="34" ry="19" />
      <ellipse cx="36" cy="7" rx="38" ry="21" />
      <ellipse cx="-6" cy="-18" rx="32" ry="22" />
    </g>
  )
}

/**
 * Globus-Andeutung: sehr großer Kreis, von dem nur die obere Wölbung sichtbar ist. Das Land wird
 * auf diesen Kreis beschnitten, sonst ragten Norwegen und Russland in den Himmel.
 */
export function Erde() {
  const kreis = { cx: 500, cy: 1762, r: 1470 }
  return (
    <>
      <clipPath id="erdkreis">
        <circle {...kreis} />
      </clipPath>
      <circle {...kreis} fill="#f2f6f9" />
      <g clipPath="url(#erdkreis)" fill="#c5ced6" stroke="#aab6c1" strokeWidth="1.5" strokeLinejoin="round">
        {LAND.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <circle {...kreis} fill="none" stroke="#8fa6ba" strokeWidth="3" />
    </>
  )
}

/** C4: Vereine, bei denen Ben schon war, haben eine farbige Nadel, die anderen eine leere. */
export function VereinsPin({
  verein,
  besucht,
  x,
  y,
  s,
}: Punkt & { verein: Verein; besucht: boolean; s?: number }) {
  return (
    <Pin
      x={x}
      y={y}
      s={s}
      farbe={besucht ? verein.farben.primaer : undefined}
      kuerzel={besucht ? verein.id.toUpperCase().slice(0, 3) : undefined}
    />
  )
}

/** Die Nadeln aller Vereine außer `ausser` — der wird von den Bildschirmen obenauf gezeichnet. */
export function AndereNadeln({
  fortschritt,
  ausser,
  ort,
}: {
  fortschritt: Fortschritt
  ausser: number
  ort: (verein: Verein) => Punkt
}) {
  return vereine.map(
    (v, i) =>
      i !== ausser && (
        <VereinsPin key={v.id} {...ort(v)} verein={v} besucht={istBesucht(fortschritt, i)} />
      ),
  )
}
