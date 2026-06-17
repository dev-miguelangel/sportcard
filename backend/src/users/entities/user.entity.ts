import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole   { USER = 'user', ADMIN = 'admin' }
export enum UserStatus { ACTIVE = 'active', BLOCKED = 'blocked' }

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

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

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

  // ── Guardian (tutor for minors) ─────────────────────
  @Column({ name: 'guardian_id', nullable: true })
  guardianId: string | null;

  @ManyToOne(() => User, (user: User) => user.minors, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'guardian_id' })
  guardian: User | null;

  @OneToMany(() => User, (user: User) => user.guardian)
  minors: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
