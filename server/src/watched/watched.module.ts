import { Module } from '@nestjs/common';
import { WatchedService } from './watched.service';
import { WatchedController } from './watched.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PreferencesModule } from '../preferences/preferences.module';

@Module({
  imports: [PrismaModule, PreferencesModule],
  controllers: [WatchedController],
  providers: [WatchedService],
  exports: [WatchedService],
})
export class WatchedModule {}
