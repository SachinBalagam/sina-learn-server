import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { LiveSessionStatus } from '@prisma/client';

export class UpdateLiveSessionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsEnum(LiveSessionStatus)
  status?: LiveSessionStatus;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  joinUrl?: string;

  @IsOptional()
  @IsString()
  startUrl?: string;

  @IsOptional()
  @IsString()
  meetingPassword?: string;

  @IsOptional()
  @IsString()
  streamKey?: string;

  @IsOptional()
  @IsString()
  streamUrl?: string;

  @IsOptional()
  @IsString()
  playbackUrl?: string;

  @IsOptional()
  @IsString()
  hlsUrl?: string;

  @IsOptional()
  @IsString()
  recordingUrl?: string;
}
