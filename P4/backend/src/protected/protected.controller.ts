import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { RouteName } from './route.decorator';
import { JwtRenewalInterceptor } from '../auth/jwt-renewal.interceptor';

@Controller('protected')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(JwtRenewalInterceptor)
export class ProtectedController {

  @Get('ruta1')
  @RouteName('ruta1')
  getRuta1() {
    return { message: 'Bienvenido a la Ruta 1 (Solo Admin)' };
  }

  @Get('ruta2')
  @RouteName('ruta2')
  getRuta2() {
    return { message: 'Bienvenido a la Ruta 2 (Admin y Cliente)' };
  }
}
