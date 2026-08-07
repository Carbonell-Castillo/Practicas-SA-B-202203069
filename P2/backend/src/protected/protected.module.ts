import { Module } from '@nestjs/common';
import { ProtectedController } from './protected.controller';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationClientModule } from '../authorization-client/authorization-client.module';

@Module({
  imports: [AuthModule, AuthorizationClientModule],
  controllers: [ProtectedController],
})
export class ProtectedModule {}
