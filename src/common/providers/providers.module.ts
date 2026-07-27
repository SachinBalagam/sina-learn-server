import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageAdapter } from './local/local-storage.adapter';
import { LocalVideoAdapter } from './local/local-video.adapter';
import { CloudinaryVideoAdapter } from './cloudinary/cloudinary-video.adapter';
import { MuxVideoAdapter } from './mux/mux-video.adapter';
import { CloudflareStreamAdapter } from './cloudflare/cloudflare-stream.adapter';
import { ZoomMeetingAdapter } from './zoom/zoom-meeting.adapter';
import { ConsoleEmailAdapter } from './console/console-email.adapter';
import { RazorpayAdapter } from './razorpay/razorpay.adapter';
import { CloudinaryStorageAdapter } from './cloudinary/cloudinary-storage.adapter';

@Global()
@Module({
  providers: [
    {
      provide: 'STORAGE_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('STORAGE_PROVIDER', 'local');
        if (provider === 'cloudinary') {
          return new CloudinaryStorageAdapter(configService);
        }
        return new LocalStorageAdapter(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: 'VIDEO_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('VIDEO_PROVIDER', 'local');
        switch (provider) {
          case 'cloudinary':
            return new CloudinaryVideoAdapter(configService);
          case 'mux':
            return new MuxVideoAdapter(configService);
          case 'cloudflare':
            return new CloudflareStreamAdapter(configService);
          case 'local':
          default:
            return new LocalVideoAdapter(configService);
        }
      },
      inject: [ConfigService],
    },
    {
      provide: 'MEETING_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('MEETING_PROVIDER', 'zoom');
        switch (provider) {
          case 'zoom':
          default:
            return new ZoomMeetingAdapter(configService);
        }
      },
      inject: [ConfigService],
    },
    {
      provide: 'EMAIL_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('EMAIL_PROVIDER', 'console');
        if (provider === 'console') {
          return new ConsoleEmailAdapter(configService);
        }
        return new ConsoleEmailAdapter(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: 'PAYMENT_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('PAYMENT_PROVIDER', 'razorpay');
        if (provider === 'razorpay') {
          return new RazorpayAdapter(configService);
        }
        return new RazorpayAdapter(configService);
      },
      inject: [ConfigService],
    },
    LocalStorageAdapter,
    LocalVideoAdapter,
    CloudinaryVideoAdapter,
    CloudinaryStorageAdapter,
    MuxVideoAdapter,
    CloudflareStreamAdapter,
    ZoomMeetingAdapter,
    ConsoleEmailAdapter,
    RazorpayAdapter,
  ],
  exports: [
    'STORAGE_PROVIDER', 'VIDEO_PROVIDER', 'MEETING_PROVIDER', 'EMAIL_PROVIDER', 'PAYMENT_PROVIDER',
    LocalStorageAdapter, LocalVideoAdapter, CloudinaryVideoAdapter, CloudinaryStorageAdapter, MuxVideoAdapter,
    CloudflareStreamAdapter, ZoomMeetingAdapter, ConsoleEmailAdapter, RazorpayAdapter,
  ],
})
export class ProvidersModule {}
