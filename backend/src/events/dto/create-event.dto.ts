import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  sport: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  locationName: string;

  @IsDateString()
  startDatetime: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  endDatetime: string;

  @IsInt()
  @Min(2)
  @Max(500)
  @IsOptional()
  maxParticipants?: number;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;
}
