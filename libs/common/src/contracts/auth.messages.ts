/** Contratos de payload compartidos entre gateway (emisor) y auth (receptor). */

export interface AddressPayload {
  street: string;
  extNumber: string;
  intNumber?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: AddressPayload;
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
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface RegisterResponse extends AuthTokensResponse {
  user: AuthUserResponse;
}
