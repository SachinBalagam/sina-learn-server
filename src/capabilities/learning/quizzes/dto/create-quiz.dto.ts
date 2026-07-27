import { IsString, IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  title: string;

  @IsUUID()
  courseId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  passingScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @IsOptional()
  @IsUUID()
  lessonId?: string;
}
