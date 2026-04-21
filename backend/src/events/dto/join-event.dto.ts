import { IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
