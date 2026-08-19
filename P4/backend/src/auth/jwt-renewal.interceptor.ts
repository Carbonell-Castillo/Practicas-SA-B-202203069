import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtRenewalInterceptor implements NestInterceptor {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    return next.handle().pipe(
      tap(async () => {
        if (request.needsTokenRenewal && request.user) {
          const { access_token } = await this.authService.login(request.user);
          const cookieName = this.configService.get<string>('JWT_COOKIE_NAME', 'access_token');
          response.cookie(cookieName, access_token, this.authService.getCookieOptions());
        }
      }),
    );
  }
}
