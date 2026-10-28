import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class TmdbClientService {
  private readonly logger = new Logger(TmdbClientService.name);
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly language: string;
  private readonly region: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('tmdb.baseUrl') ?? 'https://api.themoviedb.org/3';
    this.accessToken = this.configService.get<string>('tmdb.accessToken') ?? '';
    this.language = this.configService.get<string>('tmdb.language') ?? 'uk-UA';
    this.region = this.configService.get<string>('tmdb.region') ?? 'UA';
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      accept: 'application/json',
    };
  }

  async getGenres(): Promise<any> {
    const url = `${this.baseUrl}/genre/movie/list`;
    this.logger.log(`Fetching genres from TMDb: ${url}`);
    
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: this.getHeaders(),
        params: { language: this.language },
      }).pipe(
        catchError((error) => {
          this.logger.error(`Failed to fetch TMDb genres: ${error.message}`);
          throw new HttpException('TMDb genre list fetch failed', HttpStatus.BAD_GATEWAY);
        }),
      ),
    );
    return response.data;
  }

  async getPopularMovies(page: number, language?: string): Promise<any> {
    const url = `${this.baseUrl}/movie/popular`;
    this.logger.log(`Fetching popular movies page ${page} from TMDb`);
    
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: this.getHeaders(),
        params: {
          page,
          language: language ?? this.language,
          region: this.region,
        },
      }).pipe(
        catchError((error) => {
          this.logger.error(`Failed to fetch popular page ${page}: ${error.message}`);
          throw new HttpException('TMDb popular movies fetch failed', HttpStatus.BAD_GATEWAY);
        }),
      ),
    );
    return response.data;
  }

  async getNowPlayingMovies(page: number, language?: string): Promise<any> {
    const url = `${this.baseUrl}/movie/now_playing`;
    this.logger.log(`Fetching now playing movies page ${page} from TMDb`);
    
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: this.getHeaders(),
        params: {
          page,
          language: language ?? this.language,
          region: this.region,
        },
      }).pipe(
        catchError((error) => {
          this.logger.error(`Failed to fetch now playing page ${page}: ${error.message}`);
          throw new HttpException('TMDb now playing fetch failed', HttpStatus.BAD_GATEWAY);
        }),
      ),
    );
    return response.data;
  }

  async getMovieDetails(tmdbId: number, language?: string): Promise<any> {
    const url = `${this.baseUrl}/movie/${tmdbId}`;
    this.logger.log(`Fetching detailed movie data for TMDb ID ${tmdbId} in language=${language ?? this.language}`);
    
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: this.getHeaders(),
        params: { language: language ?? this.language },
      }).pipe(
        catchError((error) => {
          this.logger.error(`Failed to fetch movie details for ${tmdbId}: ${error.message}`);
          throw new HttpException(`TMDb movie details for ${tmdbId} failed`, HttpStatus.BAD_GATEWAY);
        }),
      ),
    );
    return response.data;
  }
}
