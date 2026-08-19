import { Module } from '@nestjs/common';
import { AuthorizationClientService } from './authorization-client.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [AuthorizationClientService],
  exports: [AuthorizationClientService],
})
export class AuthorizationClientModule {}
