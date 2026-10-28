import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tmdbImage',
  standalone: true
})
export class TmdbImagePipe implements PipeTransform {
  private readonly defaultBaseUrl = 'https://image.tmdb.org/t/p';

  transform(path: string | null | undefined, size: string = 'w500'): string {
    if (!path) {
      const dimensions = size === 'original' || size.startsWith('w1280') || size.startsWith('w780') ? '1280x720' : '500x750';
      return `https://placehold.co/${dimensions}/181825/ffffff?text=No+Image`; 
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    return `${this.defaultBaseUrl}/${size}${path}`;
  }
}
