import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User, Prisma, Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  async create(createUserDto: CreateUserDto, role: Role = Role.CLIENT): Promise<User> {
    const emailHash = this.cryptoService.hashForIndex(createUserDto.email.toLowerCase());
    
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { emailHash },
    });
    
    if (existingUser) {
      throw new ConflictException('El correo ya está registrado');
    }

    const nameEncrypted = this.cryptoService.encrypt(createUserDto.name);
    const emailEncrypted = this.cryptoService.encrypt(createUserDto.email.toLowerCase());
    const passwordHash = await this.cryptoService.hashPassword(createUserDto.password);

    const data: Prisma.UserCreateInput = {
      nameEncrypted,
      emailEncrypted,
      emailHash,
      passwordHash,
      role,
    };

    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string): Promise<User | null> {
    const emailHash = this.cryptoService.hashForIndex(email.toLowerCase());
    return this.prisma.user.findUnique({
      where: { emailHash },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
