export class MovieCardResponseDto {
  id: number;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  releaseDate: string | null;
  voteAverage: number;
  genres: { id: number; name: string }[];
  isFavorite: boolean;
  isWatched: boolean;

  constructor(movie: any, isFavorite = false, isWatched = false, lang = 'uk') {
    this.id = movie.id;
    this.tmdbId = movie.tmdbId;
    this.title = (lang.startsWith('en') && movie.titleEn) ? movie.titleEn : movie.title;
    this.posterPath = (lang.startsWith('en') && movie.posterPathEn) ? movie.posterPathEn : movie.posterPath;
    this.backdropPath = (lang.startsWith('en') && movie.backdropPathEn) ? movie.backdropPathEn : movie.backdropPath;
    this.overview = (lang.startsWith('en') && movie.overviewEn) ? movie.overviewEn : movie.overview;
    this.releaseDate = movie.releaseDate
      ? new Date(movie.releaseDate).toISOString().split('T')[0]
      : null;
    this.voteAverage = movie.voteAverage;
    
    this.genres = movie.genres
      ? movie.genres.map((mg: any) => ({
          id: mg.genre.id,
          name: mg.genre.name,
        }))
      : [];
      
    this.isFavorite = isFavorite;
    this.isWatched = isWatched;
  }
}
