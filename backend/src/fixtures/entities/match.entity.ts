import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { Team } from '../../teams/entities/team.entity';
import { Event } from '../../events/entities/event.entity';

export enum MatchStatus {
  SCHEDULED = 'scheduled',
  PLAYED    = 'played',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
}

@Entity('match')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tournament_id' })
  tournamentId: string;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ name: 'home_team_id', nullable: true })
  homeTeamId: string | null;

  @ManyToOne(() => Team, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'home_team_id' })
  homeTeam: Team | null;

  @Column({ name: 'away_team_id', nullable: true })
  awayTeamId: string | null;

  @ManyToOne(() => Team, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'away_team_id' })
  awayTeam: Team | null;

  @Column({ name: 'event_id', nullable: true })
  eventId: string | null;

  @ManyToOne(() => Event, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'event_id' })
  event: Event | null;

  @Column()
  round: string;

  @Column({ name: 'bracket_position', type: 'int', nullable: true })
  bracketPosition: number | null;

  // Self-referencing FK: points to the next match in a bracket
  @Column({ name: 'next_match_id', nullable: true })
  nextMatchId: string | null;

  @ManyToOne(() => Match, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'next_match_id' })
  nextMatch: Match | null;

  @Column({ name: 'home_score', type: 'int', nullable: true })
  homeScore: number | null;

  @Column({ name: 'away_score', type: 'int', nullable: true })
  awayScore: number | null;

  @Column({ name: 'home_penalties', type: 'int', nullable: true })
  homePenalties: number | null;

  @Column({ name: 'away_penalties', type: 'int', nullable: true })
  awayPenalties: number | null;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.SCHEDULED })
  status: MatchStatus;

  @Column({ name: 'played_at', type: 'timestamp', nullable: true })
  playedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
