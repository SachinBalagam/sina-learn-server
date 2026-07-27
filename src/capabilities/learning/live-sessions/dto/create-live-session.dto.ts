import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateLiveSessionDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsDateString()
  startTime!: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;
}
