import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IAiRecommendationProvider } from './ai-provider.interface';
import { NormalizedRecommendationResult } from '../dto/recommendation-response.dto';

@Injectable()
export class GoogleAiProviderService implements IAiRecommendationProvider {
  private readonly logger = new Logger(GoogleAiProviderService.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {
    this.apiKey = this.config.get<string>('ai.google.apiKey');
    this.model = this.config.get<string>('ai.google.model') ?? 'gemini-1.5-flash';
    this.timeoutMs = this.config.get<number>('ai.google.timeoutMs') ?? 10000;
  }

  async getRecommendations(prompt: string): Promise<NormalizedRecommendationResult> {
    if (!this.apiKey || this.apiKey === 'placeholder_key') {
      throw new Error('Google AI API key not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.http.post(
          url,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          },
          { timeout: this.timeoutMs },
        ),
      );

      const latency = Date.now() - startTime;
      this.logger.log(`Google AI responded in ${latency}ms`);

      const text: string =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      const parsed = this.parseJsonResponse(text);
      return {
        movieTmdbIds: parsed.tmdbIds ?? [],
        explanation: parsed.explanation ?? 'Movies selected based on your preferences.',
        providerUsed: 'google',
        isFallback: false,
      };
    } catch (err: any) {
      const latency = Date.now() - startTime;
      this.logger.warn(
        `Google AI failed after ${latency}ms: ${err?.message ?? 'unknown error'}`,
      );
      throw err;
    }
  }

  private parseJsonResponse(text: string): { tmdbIds?: number[]; explanation?: string } {
    try {
      const cleaned = text.replace(/```json?/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      this.logger.warn(
        `Failed to parse Google AI JSON response. Raw text (first 200 chars): ${text.slice(0, 200)}`,
      );
      return {};
    }
  }
}
