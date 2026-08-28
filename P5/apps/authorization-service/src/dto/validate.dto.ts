import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export enum Role {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT',
}

export class ValidateDto {
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;

  @IsNotEmpty()
  @IsString()
  route: string;
}
