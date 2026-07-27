import { IsArray, ValidateNested, IsString, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationPrefItem {
  @IsString()
  type: string;

  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @IsOptional()
  @IsBoolean()
  push?: boolean;
}

export class UpdateNotificationPrefsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationPrefItem)
  preferences: NotificationPrefItem[];
}
