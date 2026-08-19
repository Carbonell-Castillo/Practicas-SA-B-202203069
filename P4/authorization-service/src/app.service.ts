import { Injectable } from '@nestjs/common';
import { ValidateDto, Role } from './dto/validate.dto';

@Injectable()
export class AppService {
  validateAccess(validateDto: ValidateDto): { allowed: boolean } {
    const { role, route } = validateDto;

    // Admin tiene acceso a todo
    if (role === Role.ADMIN) {
      return { allowed: true };
    }

    // Cliente solo tiene acceso a Ruta 2
    if (role === Role.CLIENT) {
      if (route === 'ruta2') {
        return { allowed: true };
      }
      return { allowed: false };
    }

    return { allowed: false };
  }
}

