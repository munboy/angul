import { Controller, Post, Get, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TmdbSyncService } from './tmdb-sync.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/sync/tmdb')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class TmdbController {
  constructor(private readonly tmdbSyncService: TmdbSyncService) {}

  @Post()
  async triggerSync(@Body() body: { type?: 'popular' | 'now_playing' }) {
    const type = body.type ?? 'popular';
    return this.tmdbSyncService.runSync(type);
  }

  @Post(':tmdbId')
  async triggerSingleSync(@Param('tmdbId', ParseIntPipe) tmdbId: number) {
    return this.tmdbSyncService.syncMovieByTmdbId(tmdbId);
  }
}

@Controller('movies/auto-sync')
export class TmdbAutoSyncController {
  constructor(private readonly tmdbSyncService: TmdbSyncService) {}

  @Post()
  async autoSync() {
    const result = await this.tmdbSyncService.triggerIfStale();
    return { success: true, data: result };
  }
}
