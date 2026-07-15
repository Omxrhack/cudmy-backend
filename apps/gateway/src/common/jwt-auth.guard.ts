import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthUser {
  userId: string;
  email: string;
  roles: string[];
}

interface AccessTokenClaims {
  sub: string;
  email: string;
  roles: string[];
}

/**
 * Valida el access token localmente (secreto compartido con auth), sin ida a NATS.
 * Adjunta el usuario a la request para @CurrentUser().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly secret: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('ACCESS_TOKEN_SECRET');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const token = this.extractBearer(req);
    if (!token) {
      throw new UnauthorizedException('Falta el access token');
    }
    try {
      const claims = await this.jwt.verifyAsync<AccessTokenClaims>(token, {
        secret: this.secret,
      });
      req.user = {
        userId: claims.sub,
        email: claims.email,
        roles: claims.roles,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Access token inválido o expirado');
    }
  }

  private extractBearer(req: Request): string | undefined {
    const header = req.headers.authorization;
    if (!header) return undefined;
    const [type, token] = header.split(' ');
    return type === 'Bearer' && token ? token : undefined;
  }
}
