import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  courseId: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
