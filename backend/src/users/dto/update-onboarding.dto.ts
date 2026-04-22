import { IsOptional, IsString, IsDateString, IsArray, IsIn } from 'class-validator';

const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'sin información'] as const;

export class UpdateOnboardingDto {
  // Step 1
  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsDateString()
  birthDate?: string;

  @IsOptional() @IsIn(GENDERS)
  gender?: string;

  @IsOptional() @IsString()
  city?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  sports?: string[];

  // Step 2
  @IsOptional() @IsIn(BLOOD_TYPES)
  bloodType?: string;

  @IsOptional() @IsString()
  allergies?: string;

  @IsOptional() @IsString()
  medicalConditions?: string;

  @IsOptional() @IsString()
  medications?: string;

  // Step 3
  @IsOptional() @IsString()
  emergencyName?: string;

  @IsOptional() @IsString()
  emergencyPhone?: string;

  @IsOptional() @IsString()
  emergencyRelation?: string;
}
