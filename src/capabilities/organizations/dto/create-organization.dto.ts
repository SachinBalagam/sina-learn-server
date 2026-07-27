import { IsString, IsOptional, IsInt, Min, IsObject, IsUrl } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStorageGb?: number;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
