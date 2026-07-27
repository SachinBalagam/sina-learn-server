import { PartialType } from '@nestjs/mapped-types';
import { CreateQuizDto } from './create-quiz.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { QuizStatus } from '@prisma/client';

export class UpdateQuizDto extends PartialType(CreateQuizDto) {
  @IsOptional()
  @IsEnum(QuizStatus)
  status?: QuizStatus;
}
