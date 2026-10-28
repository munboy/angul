import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovieCardResponseDto } from '../movies/dto/movie-card-response.dto';
import { PreferencesService } from '../preferences/preferences.service';

@Injectable()
export class FavoritesService {
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
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        movie: {
          include: this.movieInclude,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return favorites.map((f) => new MovieCardResponseDto(f.movie, true, false, lang));
  }

  async add(userId: number, movieId: number) {
    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movie) {
      throw new NotFoundException(`Movie with ID ${movieId} not found`);
    }

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_movieId: { userId, movieId },
      },
    });

    if (existing) {
      throw new ConflictException('Movie is already in favorites');
    }

    const favorite = await this.prisma.favorite.create({
      data: {
        userId,
        movieId,
      },
    });

    await this.preferencesService.adjustPreferencesForMovie(userId, movieId, 0.2);

    return {
      movieId: favorite.movieId,
      favoritedAt: favorite.createdAt,
    };
  }

  async remove(userId: number, movieId: number) {
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_movieId: { userId, movieId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Movie is not in favorites');
    }

    await this.prisma.favorite.delete({
      where: {
        userId_movieId: { userId, movieId },
      },
    });

    await this.preferencesService.adjustPreferencesForMovie(userId, movieId, -0.2);

    return { removed: true };
  }
}
