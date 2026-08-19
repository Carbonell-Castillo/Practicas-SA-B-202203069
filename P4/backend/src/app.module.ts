import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CryptoModule } from './crypto/crypto.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AuthorizationClientModule } from './authorization-client/authorization-client.module';
import { ProtectedModule } from './protected/protected.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, CryptoModule, UsersModule, AuthModule, AuthorizationClientModule, ProtectedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
