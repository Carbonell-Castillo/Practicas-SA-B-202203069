import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { ValidateDto } from './dto/validate.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validate(@Body() validateDto: ValidateDto) {
    return this.appService.validateAccess(validateDto);
  }
}

