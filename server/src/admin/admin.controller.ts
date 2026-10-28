import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    const stats = await this.adminService.getStats();
    return stats;
  }

  @Get('users')
  async getUsers(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    const p = pagination.page ?? 1;
    const l = pagination.limit ?? 20;
    const users = await this.adminService.getUsers(p, l, search);
    return users;
  }

  @Get('users/:id')
  async getUserDetail(@Param('id', ParseIntPipe) id: number) {
    const user = await this.adminService.getUserDetail(id);
    return user;
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() admin: { sub: number },
  ) {
    const result = await this.adminService.updateUserStatus(id, dto.isActive, admin.sub);
    return result;
  }

  @Get('sync-jobs')
  async getSyncJobs(@Query() pagination: PaginationDto) {
    const p = pagination.page ?? 1;
    const l = pagination.limit ?? 10;
    const jobs = await this.adminService.getSyncJobs(p, l);
    return jobs;
  }

  @Get('sync-jobs/last')
  async getLastSyncJob() {
    const job = await this.adminService.getLastSyncJob();
    return job;
  }

  @Get('ai-logs')
  async getAiLogs(@Query() pagination: PaginationDto) {
    const p = pagination.page ?? 1;
    const l = pagination.limit ?? 10;
    const logs = await this.adminService.getAiProviderLogs(p, l);
    return logs;
  }
}
