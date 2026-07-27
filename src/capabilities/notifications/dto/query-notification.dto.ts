import { IsOptional, IsBoolean, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryNotificationDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
