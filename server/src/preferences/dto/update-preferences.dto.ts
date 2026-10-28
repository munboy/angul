import { IsArray, IsInt } from 'class-validator';

export class UpdatePreferencesDto {
  @IsArray()
  @IsInt({ each: true })
  genreIds: number[];
}
