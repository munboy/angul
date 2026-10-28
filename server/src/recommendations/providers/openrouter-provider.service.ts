import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IAiRecommendationProvider } from './ai-provider.interface';
import { NormalizedRecommendationResult } from '../dto/recommendation-response.dto';

@Injectable()
export class OpenRouterProviderService implements IAiRecommendationProvider {
  private readonly logger = new Logger(OpenRouterProviderService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {
    this.apiKey = this.config.get<string>('ai.openrouter.apiKey');
    this.baseUrl =
      this.config.get<string>('ai.openrouter.baseUrl') ??
      'https://openrouter.ai/api/v1';
    this.model =
      this.config.get<string>('ai.openrouter.model') ??
      'mistralai/mistral-7b-instruct';
    this.timeoutMs = this.config.get<number>('ai.openrouter.timeoutMs') ?? 10000;
  }

  async getRecommendations(prompt: string): Promise<NormalizedRecommendationResult> {
    if (!this.apiKey || this.apiKey === 'placeholder_key') {
      throw new Error('OpenRouter API key not configured');
    }

    const url = `${this.baseUrl}/chat/completions`;
    const startTime = Date.now();

    try {
      const systemMessage =
        'You are a helpful movie recommendation assistant. ' +
        'Always respond with a valid JSON object containing "tmdbIds" (array of integers) ' +
        'and "explanation" (one or two sentences). No markdown, no extra text.';

      const response = await firstValueFrom(
        this.http.post(
          url,
          {
            model: this.model,
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: prompt },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: this.timeoutMs,
          },
        ),
      );

      const latency = Date.now() - startTime;
      this.logger.log(`OpenRouter responded in ${latency}ms`);

      const text: string =
        response.data?.choices?.[0]?.message?.content ?? '';

      const parsed = this.parseJsonResponse(text);
      return {
        movieTmdbIds: parsed.tmdbIds ?? [],
        explanation: parsed.explanation ?? 'Curated selection based on your request.',
        providerUsed: 'openrouter',
        isFallback: false,
      };
    } catch (err: any) {
      const latency = Date.now() - startTime;
      this.logger.warn(
        `OpenRouter failed after ${latency}ms: ${err?.message ?? 'unknown error'}`,
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
        `Failed to parse OpenRouter JSON response. Raw text (first 200 chars): ${text.slice(0, 200)}`,
      );
      return {};
    }
  }
}
