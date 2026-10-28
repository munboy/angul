import { Controller, Get, Param, ParseIntPipe, Query, UseGuards, Headers } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { MovieSearchDto } from './dto/movie-search.dto';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Query() dto: MovieSearchDto,
    @CurrentUser() user: any,
    @Headers('accept-language') lang: string = 'uk',
  ) {
    const userId = user ? user.sub : undefined;
    return this.moviesService.search(dto, userId, lang);
  }

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  async search(
    @Query() dto: MovieSearchDto,
    @CurrentUser() user: any,
    @Headers('accept-language') lang: string = 'uk',
  ) {
    const userId = user ? user.sub : undefined;
    return this.moviesService.search(dto, userId, lang);
  }

  @Get('rails')
  @UseGuards(OptionalJwtAuthGuard)
  async getRails(
    @CurrentUser() user: any,
    @Headers('accept-language') lang: string = 'uk',
  ) {
    const userId = user ? user.sub : undefined;
    return this.moviesService.getRails(userId, lang);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Headers('accept-language') lang: string = 'uk',
  ) {
    const userId = user ? user.sub : undefined;
    return this.moviesService.findOne(id, userId, lang);
  }

  @Get(':id/similar')
  @UseGuards(OptionalJwtAuthGuard)
  async findSimilar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Headers('accept-language') lang: string = 'uk',
  ) {
    const userId = user ? user.sub : undefined;
    return this.moviesService.findSimilar(id, userId, lang);
  }
}
