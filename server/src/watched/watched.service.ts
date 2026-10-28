import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovieCardResponseDto } from '../movies/dto/movie-card-response.dto';
import { PreferencesService } from '../preferences/preferences.service';

@Injectable()
export class WatchedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly preferencesService: PreferencesService,
  ) {}

  private readonly movieInclude = {
    genres: {
      include: {
        genre: true,
      },
    },
  };

  async findAll(userId: number, lang = 'uk'): Promise<MovieCardResponseDto[]> {
    const watched = await this.prisma.watchedMovie.findMany({
      where: { userId },
      include: {
        movie: {
          include: this.movieInclude,
        },
      },
      orderBy: {
        watchedAt: 'desc',
      },
    });

    return watched.map((w) => new MovieCardResponseDto(w.movie, false, true, lang));
  }

  async add(userId: number, movieId: number) {
    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movie) {
      throw new NotFoundException(`Movie with ID ${movieId} not found`);
    }

    const existing = await this.prisma.watchedMovie.findUnique({
      where: {
        userId_movieId: { userId, movieId },
      },
    });

    if (existing) {
      throw new ConflictException('Movie is already marked as watched');
    }

    const watched = await this.prisma.watchedMovie.create({
      data: {
        userId,
        movieId,
      },
    });

    await this.preferencesService.adjustPreferencesForMovie(userId, movieId, 0.1);

    return {
      movieId: watched.movieId,
      watchedAt: watched.watchedAt,
    };
  }

  async remove(userId: number, movieId: number) {
    const existing = await this.prisma.watchedMovie.findUnique({
      where: {
        userId_movieId: { userId, movieId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Movie is not in watched history');
    }

    await this.prisma.watchedMovie.delete({
      where: {
        userId_movieId: { userId, movieId },
      },
    });

    await this.preferencesService.adjustPreferencesForMovie(userId, movieId, -0.1);

    return { removed: true };
  }
}
