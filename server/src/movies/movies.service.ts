import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovieSearchDto } from './dto/movie-search.dto';
import { MovieCardResponseDto } from './dto/movie-card-response.dto';
import { MovieDetailResponseDto } from './dto/movie-detail-response.dto';
import { RailsResponseDto } from './dto/rails-response.dto';

@Injectable()
export class MoviesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly movieInclude = {
    genres: {
      include: {
        genre: true,
      },
    },
  };

  async search(dto: MovieSearchDto, userId?: number, lang = 'uk') {
    const where: any = {};

    if (dto.q) {
      where.OR = [
        {
          title: {
            contains: dto.q,
            ...(process.env.DATABASE_URL?.startsWith('postgres') ? { mode: 'insensitive' } : {}),
          },
        },
        {
          titleEn: {
            contains: dto.q,
            ...(process.env.DATABASE_URL?.startsWith('postgres') ? { mode: 'insensitive' } : {}),
          },
        },
      ];
    }

    if (dto.genreId) {
      where.genres = {
        some: {
          genreId: dto.genreId,
        },
      };
    }

    if (dto.year) {
      const startOfYear = new Date(dto.year, 0, 1);
      const endOfYear = new Date(dto.year, 11, 31, 23, 59, 59, 999);
      where.releaseDate = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    if (dto.minRating !== undefined) {
      where.voteAverage = {
        gte: dto.minRating,
      };
    }

    if (dto.excludeWatched && userId) {
      const watched = await this.prisma.watchedMovie.findMany({
        where: { userId },
        select: { movieId: true },
      });
      const watchedIds = watched.map((w) => w.movieId);
      if (watchedIds.length > 0) {
        where.id = {
          notIn: watchedIds,
        };
      }
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.movie.findMany({
        where,
        include: this.movieInclude,
        orderBy: {
          popularity: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.movie.count({ where }),
    ]);

    let favIds = new Set<number>();
    let watchedIds = new Set<number>();
    if (userId) {
      const [favs, watched] = await Promise.all([
        this.prisma.favorite.findMany({ where: { userId }, select: { movieId: true } }),
        this.prisma.watchedMovie.findMany({ where: { userId }, select: { movieId: true } }),
      ]);
      favIds = new Set(favs.map((f) => f.movieId));
      watchedIds = new Set(watched.map((w) => w.movieId));
    }

    const mappedItems = items.map(
      (m) => new MovieCardResponseDto(m, favIds.has(m.id), watchedIds.has(m.id), lang),
    );

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, userId?: number, lang = 'uk'): Promise<MovieDetailResponseDto> {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: this.movieInclude,
    });

    if (!movie) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }

    let isFavorite = false;
    let isWatched = false;

    if (userId) {
      const [fav, watched] = await Promise.all([
        this.prisma.favorite.findUnique({
          where: {
            userId_movieId: { userId, movieId: id },
          },
        }),
        this.prisma.watchedMovie.findUnique({
          where: {
            userId_movieId: { userId, movieId: id },
          },
        }),
      ]);
      isFavorite = !!fav;
      isWatched = !!watched;
    }

    return new MovieDetailResponseDto(movie, isFavorite, isWatched, lang);
  }

  async findSimilar(id: number, userId?: number, lang = 'uk'): Promise<MovieCardResponseDto[]> {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: {
        genres: true,
      },
    });

    if (!movie) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }

    const genreIds = movie.genres.map((mg) => mg.genreId);

    let similar;
    if (genreIds.length === 0) {
      similar = await this.prisma.movie.findMany({
        where: { id: { not: id } },
        include: this.movieInclude,
        orderBy: { popularity: 'desc' },
        take: 12,
      });
    } else {
      similar = await this.prisma.movie.findMany({
        where: {
          id: { not: id },
          genres: {
            some: {
              genreId: { in: genreIds },
            },
          },
        },
        include: this.movieInclude,
        orderBy: { popularity: 'desc' },
        take: 12,
      });
    }

    let favIds = new Set<number>();
    let watchedIds = new Set<number>();
    if (userId) {
      const [favs, watched] = await Promise.all([
        this.prisma.favorite.findMany({ where: { userId }, select: { movieId: true } }),
        this.prisma.watchedMovie.findMany({ where: { userId }, select: { movieId: true } }),
      ]);
      favIds = new Set(favs.map((f) => f.movieId));
      watchedIds = new Set(watched.map((w) => w.movieId));
    }

    return similar.map(
      (m) => new MovieCardResponseDto(m, favIds.has(m.id), watchedIds.has(m.id), lang),
    );
  }

  async getRails(userId?: number, lang = 'uk'): Promise<RailsResponseDto> {
    const newReleases = await this.prisma.movie.findMany({
      include: this.movieInclude,
      orderBy: {
        releaseDate: 'desc',
      },
      take: 20,
    });

    const popular = await this.prisma.movie.findMany({
      include: this.movieInclude,
      orderBy: {
        popularity: 'desc',
      },
      take: 20,
    });

    const genres = await this.prisma.genre.findMany({
      take: 4,
    });

    const byGenre: any[] = await Promise.all(
      genres.map(async (genre) => {
        const movies = await this.prisma.movie.findMany({
          where: {
            genres: {
              some: {
                genreId: genre.id,
              },
            },
          },
          include: this.movieInclude,
          orderBy: {
            popularity: 'desc',
          },
          take: 15,
        });

        return {
          genre: { id: genre.id, name: genre.name },
          movies, 
        };
      }),
    );

    let favIds = new Set<number>();
    let watchedIds = new Set<number>();
    if (userId) {
      const [favs, watched] = await Promise.all([
        this.prisma.favorite.findMany({ where: { userId }, select: { movieId: true } }),
        this.prisma.watchedMovie.findMany({ where: { userId }, select: { movieId: true } }),
      ]);
      favIds = new Set(favs.map((f) => f.movieId));
      watchedIds = new Set(watched.map((w) => w.movieId));
    }

    const mapMovie = (m: any) =>
      new MovieCardResponseDto(m, favIds.has(m.id), watchedIds.has(m.id), lang);

    let personalized: any[] | undefined = undefined;
    if (userId) {
      const [watched, preferences] = await Promise.all([
        this.prisma.watchedMovie.findMany({
          where: { userId },
          select: { movieId: true },
        }),
        this.prisma.userPreference.findMany({
          where: { userId },
          orderBy: { weight: 'desc' },
          take: 5,
        }),
      ]);

      const watchedMovieIds = watched.map((w) => w.movieId);
      const preferredGenreIds = preferences
        .filter((p) => p.weight > 0.3)
        .map((p) => p.genreId);

      let personalizedMovies: any[] = [];
      if (preferredGenreIds.length > 0) {
        personalizedMovies = await this.prisma.movie.findMany({
          where: {
            id: watchedMovieIds.length > 0 ? { notIn: watchedMovieIds } : undefined,
            genres: {
              some: {
                genreId: { in: preferredGenreIds },
              },
            },
          },
          include: this.movieInclude,
          orderBy: {
            popularity: 'desc',
          },
          take: 20,
        });
      }

      if (personalizedMovies.length < 10) {
        const remainingCount = 20 - personalizedMovies.length;
        const alreadyFetchedIds = personalizedMovies.map((m) => m.id);
        const excludeIds = [...watchedMovieIds, ...alreadyFetchedIds];
        const fillMovies = await this.prisma.movie.findMany({
          where: {
            id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
          },
          include: this.movieInclude,
          orderBy: {
            popularity: 'desc',
          },
          take: remainingCount,
        });
        personalizedMovies.push(...fillMovies);
      }

      personalized = personalizedMovies;
    }

    return {
      newReleases: newReleases.map(mapMovie),
      popular: popular.map(mapMovie),
      byGenre: byGenre.map((bg) => ({
        genre: bg.genre,
        movies: bg.movies.map(mapMovie),
      })),
      personalized: personalized ? personalized.map(mapMovie) : undefined,
    };
  }
}
