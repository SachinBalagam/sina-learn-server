import { IsString, IsOptional, IsUUID, IsInt, Min } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDuration?: number;

  @IsOptional()
  @IsString()
  certificateTemplateUrl?: string;
}
