/** Patrones de mensaje NATS del microservicio auth (fuente única de verdad). */
export const AUTH_PATTERNS = {
  REGISTER: 'auth.register',
  LOGIN: 'auth.login',
  REFRESH: 'auth.refresh',
  LOGOUT: 'auth.logout',
} as const;

export type AuthPattern = (typeof AUTH_PATTERNS)[keyof typeof AUTH_PATTERNS];
