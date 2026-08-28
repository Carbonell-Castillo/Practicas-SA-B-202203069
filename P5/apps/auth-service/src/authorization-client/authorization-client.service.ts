import { Injectable, ServiceUnavailableException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthorizationClientService {
  private readonly logger = new Logger(AuthorizationClientService.name);

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async validateAccess(role: string, route: string): Promise<boolean> {
    const url = `${this.configService.get<string>('AUTHORIZATION_SERVICE_URL')}/validate`;
    const maxRetries = parseInt(this.configService.get<string>('AUTHORIZATION_MAX_RETRIES', '3'), 10);
    const backoffMs = parseInt(this.configService.get<string>('AUTHORIZATION_BACKOFF_MS', '500'), 10);
    const timeout = parseInt(this.configService.get<string>('AUTHORIZATION_TIMEOUT_MS', '2000'), 10);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(url, { role, route }, { timeout }),
        );
        return response.data.allowed === true;
      } catch (error: any) {
        this.logger.error(`Error de comunicación con Authorization Service. Intento ${attempt}/${maxRetries}.`, error.message);
        
        if (attempt === maxRetries) {
          throw new ServiceUnavailableException('El servicio de autorización no está disponible');
        }

        // Backoff exponencial: 1x, 2x, 4x, 8x... del intervalo base configurado
        const delay = backoffMs * 2 ** (attempt - 1);
        this.logger.warn(`Reintentando en ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    
    return false;
  }
}
