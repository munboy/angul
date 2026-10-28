import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: { sub: number }) {
    return this.usersService.findById(user.sub);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: { sub: number },
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.sub, updateDto);
  }
}
