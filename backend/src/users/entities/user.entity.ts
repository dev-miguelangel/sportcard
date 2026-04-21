import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 6 })
  stringId: string;

  @Column({ unique: true })
  googleId: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: 1 })
  onboardingStep: number;

  // ── Personal data (step 1) ──────────────────────────
  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'date', nullable: true })
  birthDate: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  city: string;

  @Column({ type: 'text', array: true, default: '{}' })
  sports: string[];

  // ── Health data (step 2) ────────────────────────────
  @Column({ nullable: true })
  bloodType: string;

  @Column({ nullable: true })
  allergies: string;

  @Column({ nullable: true })
  medicalConditions: string;

  @Column({ nullable: true })
  medications: string;

  // ── Emergency contact (step 3) ──────────────────────
  @Column({ nullable: true })
  emergencyName: string;

  @Column({ nullable: true })
  emergencyPhone: string;

  @Column({ nullable: true })
  emergencyRelation: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
