import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  message?: string;
}
