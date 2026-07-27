import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  courseId: string;

  @IsOptional()
  @IsString()
  currency?: string = 'INR';
}
