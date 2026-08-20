import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from './configs/app.config';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
    }),
    HealthModule,
  ],
})
export class AppModule {}
