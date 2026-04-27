import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { EventGender } from '../entities/event.entity';

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

  @IsOptional()
  @IsInt()
  @Min(0)
  minAge?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxAge?: number;

  @IsOptional()
  @IsEnum(EventGender)
  gender?: EventGender;

  @IsOptional()
  @IsUUID()
  challengerTeamId?: string;

  @IsOptional()
  @IsUUID()
  challengedTeamId?: string;
}
