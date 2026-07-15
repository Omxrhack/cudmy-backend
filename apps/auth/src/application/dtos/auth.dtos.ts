import { Role } from '../../domain/entities/user.entity';

export interface RegisterCommand {
  email: string;
  password: string;
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
}

export interface RegisterResult extends AuthTokens {
  user: AuthUserView;
}
