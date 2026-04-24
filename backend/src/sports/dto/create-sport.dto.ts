import { IsString, IsBoolean, IsInt, IsOptional, IsNotEmpty, Min } from 'class-validator';

export class CreateSportDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() icon: string;
  @IsString() @IsNotEmpty() emoji: string;
  @IsString() @IsNotEmpty() gradient: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsInt() @Min(0) @IsOptional() order?: number;
}
