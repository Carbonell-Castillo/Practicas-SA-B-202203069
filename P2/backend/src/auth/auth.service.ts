import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CryptoService } from '../crypto/crypto.service';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private cryptoService: CryptoService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersService.create(createUserDto);
    const { passwordHash, ...result } = user;
    return result;
  }

  async validateUser(loginDto: LoginDto): Promise<User> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const isPasswordValid = await this.cryptoService.verifyPassword(user.passwordHash, loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    return user;
  }

  async login(user: User) {
    const payload = { sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  getCookieOptions() {
    return {
      httpOnly: true,
      secure: this.configService.get('COOKIE_SECURE') === 'true',
      sameSite: this.configService.get('COOKIE_SAME_SITE') as 'lax' | 'strict' | 'none',
    };
  }
}
