import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsDateString } from 'class-validator';

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  sport: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsInt()
  @Min(1)
  @Max(1440)
  @IsOptional()
  durationMinutes?: number;

  @IsDateString()
  @IsOptional()
  loggedAt?: string;
}
