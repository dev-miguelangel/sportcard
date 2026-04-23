import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsString()
  @IsNotEmpty()
  sport: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
