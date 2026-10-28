import { Controller, Get, Post, Delete, Param, ParseIntPipe, UseGuards, Headers } from '@nestjs/common';
import { WatchedService } from './watched.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('profile/watched')
@UseGuards(JwtAuthGuard)
export class WatchedController {
  constructor(private readonly watchedService: WatchedService) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Headers('accept-language') lang: string = 'uk') {
    return this.watchedService.findAll(user.sub, lang);
  }

  @Post(':movieId')
  async add(
    @CurrentUser() user: any,
    @Param('movieId', ParseIntPipe) movieId: number,
  ) {
    return this.watchedService.add(user.sub, movieId);
  }

  @Delete(':movieId')
  async remove(
    @CurrentUser() user: any,
    @Param('movieId', ParseIntPipe) movieId: number,
  ) {
    return this.watchedService.remove(user.sub, movieId);
  }
}
