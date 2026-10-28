import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { TmdbClientService } from './tmdb-client.service';
import { TmdbMapperService } from './tmdb-mapper.service';
import { TmdbSyncService } from './tmdb-sync.service';
import { TmdbController, TmdbAutoSyncController } from './tmdb.controller';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
  ],
  controllers: [TmdbController, TmdbAutoSyncController],
  providers: [
    TmdbClientService,
    TmdbMapperService,
    TmdbSyncService,
  ],
  exports: [
    TmdbSyncService,
  ],
})
export class TmdbModule {}
