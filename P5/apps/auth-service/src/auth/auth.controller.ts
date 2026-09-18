import { Controller, Post, Body, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    console.log("Registrando usuario: ", createUserDto);
    return this.authService.register(createUserDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const user = await this.authService.validateUser(loginDto);
    const { access_token } = await this.authService.login(user);
    
    const cookieName = this.configService.get<string>('JWT_COOKIE_NAME', 'access_token');
    
    response.cookie(cookieName, access_token, this.authService.getCookieOptions());
    
    return {
      message: 'Login successful',
      user: {
        id: user.id,
        role: user.role,
      }
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response) {
    const cookieName = this.configService.get<string>('JWT_COOKIE_NAME', 'access_token');
    response.clearCookie(cookieName, this.authService.getCookieOptions());
    return { message: 'Logout successful' };
  }
}
