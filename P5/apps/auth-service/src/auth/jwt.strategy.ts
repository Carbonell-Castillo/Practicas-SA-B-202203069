import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  needsTokenRenewal?: boolean;
}

// passport-jwt tipa `passReqToCallback` con dos overloads del constructor y,
// a través del mixin de @nestjs/passport, TS pierde el literal `true` y
// resuelve el overload equivocado. Se tipa explícitamente como `any` en este
// único punto (el objeto es idéntico en runtime, esto es solo un ajuste de
// compilación) — es el workaround estándar en la comunidad Nest+passport-jwt.
function buildStrategyOptions(configService: ConfigService): any {
  return {
    jwtFromRequest: ExtractJwt.fromExtractors([
      (request: Request) => {
        const cookieName = configService.get<string>('JWT_COOKIE_NAME', 'access_token');
        return request?.cookies?.[cookieName] || null;
      },
    ]),
    ignoreExpiration: true, // We will manually validate it to handle grace period
    secretOrKey: configService.get<string>('JWT_SECRET'),
    passReqToCallback: true, // Need request to attach renewal flag
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super(buildStrategyOptions(configService));
  }

  async validate(request: AuthenticatedRequest, payload: any) {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const exp = payload.exp;
    const gracePeriod = parseInt(this.configService.get<string>('JWT_RENEWAL_GRACE_SECONDS', '600'), 10);

    if (currentTimestamp > exp) {
      if (currentTimestamp <= exp + gracePeriod) {
        // Within grace period: Flag for renewal
        request.needsTokenRenewal = true;
      } else {
        // Beyond grace period: Token strictly expired
        throw new UnauthorizedException('Token expired beyond grace period');
      }
    }

    return { id: payload.sub, role: payload.role };
  }
}
