/** Reloj inyectable (permite tests deterministas de expiración/cooldown). */
export abstract class Clock {
  abstract now(): Date;
}
