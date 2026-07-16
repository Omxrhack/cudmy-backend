/** Eventos NATS (fire-and-forget) entre microservicios. */
export const AUTH_EVENTS = {
  USER_REGISTERED: 'user.registered',
} as const;

export const VERIFICATION_EVENTS = {
  CONTACT_VERIFIED: 'contact.verified',
} as const;
