import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { NormalizedRecommendationResult } from '../dto/recommendation-response.dto';

export interface IAiRecommendationProvider {
  getRecommendations(prompt: string): Promise<NormalizedRecommendationResult>;
}

@Injectable()
export class RecommendationPromptBuilder {
  buildPrompt(signals: {
    entryType: string;
    scenarioKey?: string;
    moodInput?: string;
    freeTextPrompt?: string;
    genreName?: string;
    seedMovieTitle?: string;
    favoriteGenreNames?: string[];
    watchedCount?: number;
    refinements?: Record<string, boolean>;
  }): string {
    const parts: string[] = [];

    parts.push(
      'You are a movie recommendation assistant. ' +
      'Return a JSON object with fields: ' +
      '"tmdbIds" (array of 5-8 real TMDb movie IDs as integers), ' +
      '"explanation" (one or two sentences explaining why these movies match the request). ' +
      'Do not include any text outside the JSON object.',
    );

    if (signals.freeTextPrompt) {
      parts.push(`User request: "${signals.freeTextPrompt}"`);
    } else if (signals.scenarioKey) {
      const scenarioMap: Record<string, string> = {
        something_light: 'User wants something light and fun to watch.',
        something_intense: 'User wants something intense and gripping.',
        watch_with_friends: 'User wants a movie to watch with friends — entertaining and social.',
        new_scifi: 'User wants a recent sci-fi movie.',
        no_horror: 'User wants recommendations that exclude horror entirely.',
        not_sure: 'User is not sure what they want — suggest popular, broadly appealing movies.',
        warm_romance: 'User wants a warm romantic movie.',
        tense_thriller: 'User wants a tense thriller without horror elements.',
      };
      parts.push(scenarioMap[signals.scenarioKey] ?? `User scenario: ${signals.scenarioKey}`);
    }

    if (signals.moodInput) {
      parts.push(`User mood: ${signals.moodInput}.`);
    }

    if (signals.genreName) {
      parts.push(`Preferred genre: ${signals.genreName}.`);
    }

    if (signals.seedMovieTitle) {
      parts.push(`Find movies similar to: "${signals.seedMovieTitle}".`);
    }

    if (signals.favoriteGenreNames?.length) {
      parts.push(`User typically enjoys: ${signals.favoriteGenreNames.join(', ')}.`);
    }

    if (signals.refinements?.lighter) parts.push('User wants something lighter in tone.');
    if (signals.refinements?.darker) parts.push('User wants something darker in tone.');
    if (signals.refinements?.newer) parts.push('Prefer newer/recent releases.');
    if (signals.refinements?.moreSerious) parts.push('User wants something more serious.');
    if (signals.refinements?.lessRomantic) parts.push('Avoid strong romantic elements.');

    return parts.join('\n');
  }
}
