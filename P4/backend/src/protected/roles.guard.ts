import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationClientService } from '../authorization-client/authorization-client.service';
import { ROUTE_KEY } from './route.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authClientService: AuthorizationClientService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoute = this.reflector.getAllAndOverride<string>(ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoute) {
      return true; // Si no hay decorador, no restringir
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('No user role found');
    }

    const hasAccess = await this.authClientService.validateAccess(user.role, requiredRoute);
    
    if (!hasAccess) {
      throw new ForbiddenException(`Acceso denegado a la ruta ${requiredRoute} para el rol ${user.role}`);
    }

    return true;
  }
}
