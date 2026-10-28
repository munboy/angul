import { Injectable } from '@nestjs/common';

@Injectable()
export class TmdbMapperService {
  private parseReleaseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr || dateStr.trim() === '') {
      return null;
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  mapGenre(raw: any) {
    return {
      tmdbId: raw.id,
      name: raw.name,
    };
  }

  mapMovie(raw: any) {
    return {
      tmdbId: raw.id,
      title: raw.title ?? '',
      originalTitle: raw.original_title ?? null,
      overview: raw.overview ?? null,
      posterPath: raw.poster_path ?? null,
      backdropPath: raw.backdrop_path ?? null,
      voteAverage: typeof raw.vote_average === 'number' ? raw.vote_average : 0,
      voteCount: typeof raw.vote_count === 'number' ? raw.vote_count : 0,
      popularity: typeof raw.popularity === 'number' ? raw.popularity : 0,
      releaseDate: this.parseReleaseDate(raw.release_date),
      originalLanguage: raw.original_language ?? null,
      runtime: typeof raw.runtime === 'number' ? raw.runtime : null,
    };
  }
}
