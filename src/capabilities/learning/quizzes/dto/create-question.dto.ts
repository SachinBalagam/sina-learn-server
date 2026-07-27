import { IsString, IsArray, IsOptional, IsInt, Min, IsObject } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsArray()
  @IsObject({ each: true })
  options: { label: string; value: string }[];

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;
}
