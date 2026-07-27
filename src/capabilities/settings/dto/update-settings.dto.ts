import { IsOptional, IsObject, IsString, IsHexColor, IsBoolean } from 'class-validator';

class BrandingDto {
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @IsHexColor()
  pageBg?: string;

  @IsOptional()
  @IsHexColor()
  textMain?: string;

  @IsOptional()
  @IsHexColor()
  sidebarBg?: string;

  @IsOptional()
  @IsHexColor()
  sidebarText?: string;

  @IsOptional()
  @IsHexColor()
  borderColor?: string;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsString()
  customCss?: string;
}

class NotificationsDto {
  @IsOptional()
  emailNotifications?: boolean;

  @IsOptional()
  slackWebhookUrl?: string;
}

class CapabilitiesDto {
  @IsOptional()
  @IsBoolean()
  enableLms?: boolean;

  @IsOptional()
  @IsBoolean()
  enableHrms?: boolean;

  @IsOptional()
  @IsBoolean()
  enableCrm?: boolean;
}

class MailDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  smtpHost?: string;

  @IsOptional()
  @IsString()
  smtpPort?: string;

  @IsOptional()
  @IsString()
  smtpUser?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  senderEmail?: string;
}

class CertificateSettingsDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  backgroundUrl?: string;

  @IsOptional()
  @IsString()
  signatureName?: string;

  @IsOptional()
  @IsString()
  signatureRole?: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsObject()
  branding?: BrandingDto;

  @IsOptional()
  @IsObject()
  notifications?: NotificationsDto;

  @IsOptional()
  @IsObject()
  capabilities?: CapabilitiesDto;

  @IsOptional()
  @IsObject()
  mail?: MailDto;

  @IsOptional()
  @IsObject()
  certificate?: CertificateSettingsDto;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
