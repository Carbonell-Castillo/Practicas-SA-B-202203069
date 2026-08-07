import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { CryptoModule } from '../crypto/crypto.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtRenewalInterceptor } from './jwt-renewal.interceptor';

@Module({
  imports: [
    UsersModule,
    CryptoModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: parseInt(configService.get<string>('JWT_EXPIRES_IN_SECONDS', '300'), 10),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRenewalInterceptor],
  exports: [AuthService, JwtModule, JwtRenewalInterceptor]
})
export class AuthModule {}
