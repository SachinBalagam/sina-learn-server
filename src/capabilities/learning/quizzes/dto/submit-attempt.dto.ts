import { IsArray, IsObject } from 'class-validator';

export class SubmitAttemptDto {
  @IsArray()
  @IsObject({ each: true })
  answers: { questionId: string; answer: string }[];
}
