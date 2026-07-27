import { IsString, IsOptional, IsInt, Min, IsBoolean, IsObject } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;
}
