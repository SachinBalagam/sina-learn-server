import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsArray, IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
