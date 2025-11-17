import { Module, Global } from '@nestjs/common';
import { GeoService } from './geo/geo.service';
import { StorageService } from './storage/storage.service';
import { SmsService } from './sms/sms.service';

@Global()
@Module({
  providers: [GeoService, StorageService, SmsService],
  exports: [GeoService, StorageService, SmsService],
})
export class ProvidersModule {}
