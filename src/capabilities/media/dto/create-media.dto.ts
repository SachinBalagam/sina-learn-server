import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class CreateMediaDto {
  @IsOptional()
  @IsString()
  originalName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @ValidateIf((o) => o.lessonId != null && o.lessonId !== '' && o.lessonId !== 'undefined' && o.lessonId !== 'null')
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
