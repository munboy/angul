import { Controller, Get, Post, Delete, Param, ParseIntPipe, UseGuards, Headers } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('profile/favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Headers('accept-language') lang: string = 'uk') {
    return this.favoritesService.findAll(user.sub, lang);
  }

  @Post(':movieId')
  async add(
    @CurrentUser() user: any,
    @Param('movieId', ParseIntPipe) movieId: number,
  ) {
    return this.favoritesService.add(user.sub, movieId);
  }

  @Delete(':movieId')
  async remove(
    @CurrentUser() user: any,
    @Param('movieId', ParseIntPipe) movieId: number,
  ) {
    return this.favoritesService.remove(user.sub, movieId);
  }
}
