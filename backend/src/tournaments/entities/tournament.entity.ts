import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TournamentFormat {
  CUP             = 'cup',
  LEAGUE          = 'league',
  GROUPS_PLAYOFFS = 'groups_playoffs',
  POINTS          = 'points',
}

export enum TournamentStatus {
  DRAFT       = 'draft',
  OPEN        = 'open',
  IN_PROGRESS = 'in_progress',
  FINISHED    = 'finished',
}

@Entity('tournament')
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  sport: string;

  @Column({ type: 'enum', enum: TournamentFormat })
  format: TournamentFormat;

  @Column({ type: 'enum', enum: TournamentStatus, default: TournamentStatus.DRAFT })
  status: TournamentStatus;

  @Column({ name: 'organizer_id' })
  organizerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organizer_id' })
  organizer: User;

  @Column({ name: 'max_teams', type: 'int', nullable: true })
  maxTeams: number | null;

  @Column({ name: 'registration_open', default: true })
  registrationOpen: boolean;

  @Column({ name: 'requires_approval', default: false })
  requiresApproval: boolean;

  @Column({
    name: 'share_token',
    type: 'uuid',
    unique: true,
    default: () => 'uuid_generate_v4()',
  })
  shareToken: string;

  @Column({ name: 'min_age', type: 'int', nullable: true })
  minAge: number | null;

  @Column({ name: 'max_age', type: 'int', nullable: true })
  maxAge: number | null;

  @Column({ name: 'allow_individual', default: false })
  allowIndividual: boolean;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
