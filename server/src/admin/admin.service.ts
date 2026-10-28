import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      userCount,
      movieCount,
      favoritesCount,
      watchedCount,
      recommendationSessionCount,
      syncJobCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.movie.count(),
      this.prisma.favorite.count(),
      this.prisma.watchedMovie.count(),
      this.prisma.recommendationSession.count(),
      this.prisma.syncJob.count(),
    ]);

    return {
      userCount,
      movieCount,
      favoritesCount,
      watchedCount,
      recommendationSessionCount,
      syncJobCount,
    };
  }

  async getUsers(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { role: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const mappedItems = items.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      role: u.role.name,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLastSyncJob() {
    return this.prisma.syncJob.findFirst({
      orderBy: { startedAt: 'desc' },
    });
  }

  async getUserDetail(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async updateUserStatus(id: number, isActive: boolean, adminUserId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      include: { role: true },
    });

    await this.prisma.adminActionLog.create({
      data: {
        adminUserId,
        action: isActive ? 'activate_user' : 'deactivate_user',
        targetType: 'User',
        targetId: id,
        metadata: { previousStatus: user.isActive, newStatus: isActive },
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role.name,
      isActive: updated.isActive,
    };
  }

  async getSyncJobs(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.syncJob.findMany({
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.syncJob.count(),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAiProviderLogs(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.aiProviderLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          session: {
            select: {
              userId: true,
              entryType: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.aiProviderLog.count(),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
