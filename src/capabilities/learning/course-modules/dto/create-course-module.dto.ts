import { IsString, IsOptional, IsUUID, IsInt, Min } from 'class-validator';

export class CreateCourseModuleDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
