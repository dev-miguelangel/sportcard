import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CloseEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  closingNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  results?: string;
}
