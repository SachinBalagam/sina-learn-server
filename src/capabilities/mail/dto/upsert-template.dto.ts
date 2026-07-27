import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpsertTemplateDto {
  @IsString()
  subject: string;

  @IsString()
  htmlBody: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
