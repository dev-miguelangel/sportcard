import { IsString, IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateSportDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() icon?: string;
  @IsString() @IsOptional() emoji?: string;
  @IsString() @IsOptional() gradient?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsInt() @Min(0) @IsOptional() order?: number;
}
