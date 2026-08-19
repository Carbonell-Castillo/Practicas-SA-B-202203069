import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { ValidateDto } from './dto/validate.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'authorization-service' };
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validate(@Body() validateDto: ValidateDto) {
    return this.appService.validateAccess(validateDto);
  }
}

