import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbClientService } from './tmdb-client.service';
import { TmdbMapperService } from './tmdb-mapper.service';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TmdbSyncService {
  private readonly logger = new Logger(TmdbSyncService.name);
  private readonly popularPages: number;
  private readonly nowPlayingPages: number;
  private isSyncing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdbClient: TmdbClientService,
    private readonly tmdbMapper: TmdbMapperService,
    private readonly configService: ConfigService,
  ) {
    this.popularPages = this.configService.get<number>('sync.popularPages') ?? 5;
    this.nowPlayingPages = this.configService.get<number>('sync.nowPlayingPages') ?? 3;
  }

  async syncGenres(): Promise<{ total: number }> {
    this.logger.log('Starting Genre Sync...');
    const rawData = await this.tmdbClient.getGenres();
    
    if (!rawData || !rawData.genres) {
      throw new Error('TMDb returned empty genres list');
    }

    let count = 0;
    for (const rawGenre of rawData.genres) {
      const mapped = this.tmdbMapper.mapGenre(rawGenre);
      await this.prisma.genre.upsert({
        where: { tmdbId: mapped.tmdbId },
        update: { name: mapped.name },
        create: mapped,
      });
      count++;
    }

    this.logger.log(`Genre Sync completed. Synced ${count} genres.`);
    return { total: count };
  }

  @Cron(process.env.SYNC_POPULAR_CRON || '0 */6 * * *')
  async handleScheduledPopularSync() {
    const isCronEnabled = this.configService.get<boolean>('sync.cronEnabled') ?? true;
    if (!isCronEnabled) {
      this.logger.log('Scheduled popular TMDb Sync is disabled by configuration.');
      return;
    }
    this.logger.log('Scheduled popular TMDb Sync triggered...');
    await this.runSync('popular', 'schedule');
  }

  @Cron(process.env.SYNC_NOW_PLAYING_CRON || '0 */12 * * *')
  async handleScheduledNowPlayingSync() {
    const isCronEnabled = this.configService.get<boolean>('sync.cronEnabled') ?? true;
    if (!isCronEnabled) {
      this.logger.log('Scheduled now playing TMDb Sync is disabled by configuration.');
      return;
    }
    this.logger.log('Scheduled now playing TMDb Sync triggered...');
    await this.runSync('now_playing', 'schedule');
  }

  async triggerIfStale(): Promise<{ triggered: boolean; reason: string }> {
    const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; 

    const lastJob = await this.prisma.syncJob.findFirst({
      where: { status: 'completed' },
      orderBy: { startedAt: 'desc' },
    });

    const runningJob = await this.prisma.syncJob.findFirst({
      where: { status: 'running' },
    });
    if (runningJob) {
      return { triggered: false, reason: 'sync_already_running' };
    }

    const isStale =
      !lastJob ||
      Date.now() - new Date(lastJob.startedAt).getTime() > STALE_THRESHOLD_MS;

    if (isStale) {
      if (this.isSyncing) {
        return { triggered: false, reason: 'sync_already_running' };
      }
      this.isSyncing = true;
      this.runSync('popular', 'schedule')
        .catch((err) => this.logger.error('Background auto-sync failed', err))
        .finally(() => {
          this.isSyncing = false;
        });
      return { triggered: true, reason: 'data_stale' };
    }

    return { triggered: false, reason: 'data_fresh' };
  }

  async runSync(
    type: 'popular' | 'now_playing',
    triggeredBy: 'schedule' | 'admin' = 'admin',
  ): Promise<any> {
    this.logger.log(`Starting movie sync: type=${type}, triggeredBy=${triggeredBy}`);


    await this.syncGenres();

    const job = await this.prisma.syncJob.create({
      data: {
        type,
        status: 'running',
        triggeredBy,
      },
    });

    const totalPages = type === 'popular' ? this.popularPages : this.nowPlayingPages;
    let itemsProcessed = 0;
    let itemsFailed = 0;

    try {
      const localGenres = await this.prisma.genre.findMany();
      const genreMap = new Map<number, number>(); 
      localGenres.forEach((g) => genreMap.set(g.tmdbId, g.id));

      for (let page = 1; page <= totalPages; page++) {
        const [rawResUk, rawResEn] = await Promise.all([
          type === 'popular'
            ? this.tmdbClient.getPopularMovies(page, 'uk-UA')
            : this.tmdbClient.getNowPlayingMovies(page, 'uk-UA'),
          type === 'popular'
            ? this.tmdbClient.getPopularMovies(page, 'en-US')
            : this.tmdbClient.getNowPlayingMovies(page, 'en-US'),
        ]);

        if (!rawResUk || !rawResUk.results) {
          this.logger.warn(`TMDb returned empty results for ${type} page ${page}`);
          continue;
        }

        const enMoviesMap = new Map<number, any>();
        if (rawResEn && rawResEn.results) {
          rawResEn.results.forEach((m: any) => enMoviesMap.set(m.id, m));
        }

        const pageSyncItems: { tmdbMovieId: number; status: string; errorMessage?: string }[] = [];

        try {
          await this.prisma.$transaction(async (tx) => {
            for (const rawMovie of rawResUk.results) {
              const rawMovieEn = enMoviesMap.get(rawMovie.id);
              const mappedMovie = {
                ...this.tmdbMapper.mapMovie(rawMovie),
                titleEn: rawMovieEn?.title ?? rawMovie.title ?? '',
                overviewEn: rawMovieEn?.overview ?? rawMovie.overview ?? '',
                posterPathEn: rawMovieEn?.poster_path ?? rawMovie.poster_path ?? null,
                backdropPathEn: rawMovieEn?.backdrop_path ?? rawMovie.backdrop_path ?? null,
              };

              const movie = await tx.movie.upsert({
                where: { tmdbId: mappedMovie.tmdbId },
                update: mappedMovie,
                create: mappedMovie,
              });

              const genreTmdbIds: number[] = rawMovie.genre_ids ?? [];
              const localGenreIds: number[] = [];
              genreTmdbIds.forEach((tmdbId) => {
                const localId = genreMap.get(tmdbId);
                if (localId) localGenreIds.push(localId);
              });

              await tx.movieGenre.deleteMany({
                where: { movieId: movie.id },
              });

              if (localGenreIds.length > 0) {
                await tx.movieGenre.createMany({
                  data: localGenreIds.map((genreId) => ({
                    movieId: movie.id,
                    genreId,
                  })),
                });
              }

              pageSyncItems.push({
                tmdbMovieId: movie.tmdbId,
                status: 'success',
              });
              itemsProcessed++;
            }
          });
        } catch (txErr: any) {
          this.logger.warn(`Transaction failed for page ${page}, falling back to sequential updates: ${txErr.message}`);
          pageSyncItems.length = 0; 
          
          for (const rawMovie of rawResUk.results) {
            try {
              const rawMovieEn = enMoviesMap.get(rawMovie.id);
              const mappedMovie = {
                ...this.tmdbMapper.mapMovie(rawMovie),
                titleEn: rawMovieEn?.title ?? rawMovie.title ?? '',
                overviewEn: rawMovieEn?.overview ?? rawMovie.overview ?? '',
                posterPathEn: rawMovieEn?.poster_path ?? rawMovie.poster_path ?? null,
                backdropPathEn: rawMovieEn?.backdrop_path ?? rawMovie.backdrop_path ?? null,
              };

              const movie = await this.prisma.movie.upsert({
                where: { tmdbId: mappedMovie.tmdbId },
                update: mappedMovie,
                create: mappedMovie,
              });

              const genreTmdbIds: number[] = rawMovie.genre_ids ?? [];
              const localGenreIds: number[] = [];
              genreTmdbIds.forEach((tmdbId) => {
                const localId = genreMap.get(tmdbId);
                if (localId) localGenreIds.push(localId);
              });

              await this.prisma.movieGenre.deleteMany({
                where: { movieId: movie.id },
              });

              if (localGenreIds.length > 0) {
                await this.prisma.movieGenre.createMany({
                  data: localGenreIds.map((genreId) => ({
                    movieId: movie.id,
                    genreId,
                  })),
                });
              }

              pageSyncItems.push({
                tmdbMovieId: movie.tmdbId,
                status: 'success',
              });
              itemsProcessed++;
            } catch (itemErr: any) {
              this.logger.error(`Failed to ingest movie tmdbId=${rawMovie.id} in fallback: ${itemErr.message}`);
              pageSyncItems.push({
                tmdbMovieId: rawMovie.id,
                status: 'failed',
                errorMessage: itemErr.message,
              });
              itemsFailed++;
            }
          }
        }

        if (pageSyncItems.length > 0) {
          await this.prisma.syncJobItem.createMany({
            data: pageSyncItems.map((item) => ({
              syncJobId: job.id,
              ...item,
            })),
          });
        }
      }

      const completedJob = await this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          itemsTotal: itemsProcessed + itemsFailed,
          itemsProcessed,
          itemsFailed,
          completedAt: new Date(),
        },
      });

      return completedJob;
    } catch (jobErr: any) {
      this.logger.error(`Sync Job ${job.id} failed critically: ${jobErr.message}`);
      
      return this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          itemsTotal: itemsProcessed + itemsFailed,
          itemsProcessed,
          itemsFailed,
          completedAt: new Date(),
        },
      });
    }
  }

  async syncMovieByTmdbId(tmdbId: number): Promise<any> {
    this.logger.log(`Performing single movie sync: tmdbId=${tmdbId}`);
    
    const rawDetails = await this.tmdbClient.getMovieDetails(tmdbId, 'uk-UA');
    if (!rawDetails) {
      throw new Error(`Movie with TMDb ID ${tmdbId} not found`);
    }

    const rawDetailsEn = await this.tmdbClient.getMovieDetails(tmdbId, 'en-US').catch(() => null);

    const mappedMovie = {
      ...this.tmdbMapper.mapMovie(rawDetails),
      titleEn: rawDetailsEn?.title ?? rawDetails.title ?? '',
      overviewEn: rawDetailsEn?.overview ?? rawDetails.overview ?? '',
      posterPathEn: rawDetailsEn?.poster_path ?? rawDetails.poster_path ?? null,
      backdropPathEn: rawDetailsEn?.backdrop_path ?? rawDetails.backdrop_path ?? null,
    };
    
    const movie = await this.prisma.movie.upsert({
      where: { tmdbId },
      update: mappedMovie,
      create: mappedMovie,
    });

    const rawGenres = rawDetails.genres ?? [];
    const localGenreIds: number[] = [];

    for (const g of rawGenres) {
      const localGenre = await this.prisma.genre.upsert({
        where: { tmdbId: g.id },
        update: { name: g.name },
        create: { tmdbId: g.id, name: g.name },
      });
      localGenreIds.push(localGenre.id);
    }

    await this.prisma.movieGenre.deleteMany({
      where: { movieId: movie.id },
    });

    if (localGenreIds.length > 0) {
      await this.prisma.movieGenre.createMany({
        data: localGenreIds.map((genreId) => ({
          movieId: movie.id,
          genreId,
        })),
      });
    }

    return this.prisma.movie.findUnique({
      where: { id: movie.id },
      include: {
        genres: {
          include: { genre: true },
        },
      },
    });
  }
}
