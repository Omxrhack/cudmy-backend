import { Role } from '../../domain/entities/user.entity';

export interface AddressInput {
  street: string;
  extNumber: string;
  intNumber?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface RegisterCommand {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: AddressInput;
}

export interface LoginCommand {
  email: string;
  password: string;
}

export interface RefreshCommand {
  refreshToken: string;
}

export interface LogoutCommand {
  refreshToken: string;
  allSessions?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserView {
  id: string;
  email: string;
  roles: Role[];
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface RegisterResult extends AuthTokens {
  user: AuthUserView;
}
