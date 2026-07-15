/** Contratos de payload compartidos entre gateway (emisor) y auth (receptor). */

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
  allSessions?: boolean;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  roles: string[];
}

export interface RegisterResponse extends AuthTokensResponse {
  user: AuthUserResponse;
}
