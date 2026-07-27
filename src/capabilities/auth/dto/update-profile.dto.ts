import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
