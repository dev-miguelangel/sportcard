import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Tournament } from './tournament.entity';
import { Team } from '../../teams/entities/team.entity';

export enum TournamentTeamStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('tournament_team')
@Unique(['tournamentId', 'teamId'])
export class TournamentTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tournament_id' })
  tournamentId: string;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ name: 'team_id' })
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({
    type: 'enum',
    enum: TournamentTeamStatus,
    default: TournamentTeamStatus.PENDING,
  })
  status: TournamentTeamStatus;

  @Column({ name: 'group_name', nullable: true })
  groupName: string | null;

  @CreateDateColumn({ name: 'registered_at' })
  registeredAt: Date;
}
