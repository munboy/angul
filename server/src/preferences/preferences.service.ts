import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number) {
    const preferences = await this.prisma.userPreference.findMany({
      where: { userId },
      include: {
        genre: true,
      },
    });

    return preferences.map((p) => ({
      genreId: p.genreId,
      genreName: p.genre.name,
      weight: p.weight,
    }));
  }

  async update(userId: number, dto: UpdatePreferencesDto) {
    const dbGenresCount = await this.prisma.genre.count({
      where: {
        id: { in: dto.genreIds },
      },
    });

    if (dbGenresCount !== dto.genreIds.length) {
      throw new BadRequestException('One or more genre IDs are invalid');
    }

    await this.prisma.$transaction([
      this.prisma.userPreference.deleteMany({
        where: { userId },
      }),
      this.prisma.userPreference.createMany({
        data: dto.genreIds.map((genreId) => ({
          userId,
          genreId,
          weight: 1.0, 
        })),
      }),
    ]);

    return this.findAll(userId);
  }

  async adjustPreferencesForMovie(userId: number, movieId: number, delta: number) {
    const movieGenres = await this.prisma.movieGenre.findMany({
      where: { movieId },
    });

    for (const mg of movieGenres) {
      const existing = await this.prisma.userPreference.findUnique({
        where: {
          userId_genreId: { userId, genreId: mg.genreId },
        },
      });

      if (existing) {
        const newWeight = Math.min(1.0, Math.max(0.0, existing.weight + delta));
        await this.prisma.userPreference.update({
          where: { id: existing.id },
          data: { weight: newWeight },
        });
      } else if (delta > 0) {
        await this.prisma.userPreference.create({
          data: {
            userId,
            genreId: mg.genreId,
            weight: Math.min(1.0, delta),
          },
        });
      }
    }
  }
}
