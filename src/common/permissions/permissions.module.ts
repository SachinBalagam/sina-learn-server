import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

@Module({
  providers: [
    PermissionsGuard,
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [PermissionsGuard],
})
export class PermissionsModule {}
