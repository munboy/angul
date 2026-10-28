import { MovieCardResponseDto } from './movie-card-response.dto';

export class RailsResponseDto {
  newReleases: MovieCardResponseDto[];
  popular: MovieCardResponseDto[];
  byGenre: {
    genre: { id: number; name: string };
    movies: MovieCardResponseDto[];
  }[];
  personalized?: MovieCardResponseDto[];
}
