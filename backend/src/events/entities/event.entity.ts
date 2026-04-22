import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum EventStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
  FINISHED = 'finished',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sport: string;

  @Column()
  type: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'location_name' })
  locationName: string;

  @Column({ name: 'start_datetime', type: 'timestamp' })
  startDatetime: Date;

  @Column({ name: 'end_datetime', type: 'timestamp', nullable: true })
  endDatetime: Date | null;

  @Column({ name: 'max_participants', nullable: true, type: 'int' })
  maxParticipants: number | null;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  @Column({ name: 'requires_approval', default: false })
  requiresApproval: boolean;

  @Column({ name: 'closing_notes', type: 'text', nullable: true })
  closingNotes: string | null;

  @Column({ type: 'text', nullable: true })
  results: string | null;

  @Column({
    name: 'share_token',
    type: 'uuid',
    unique: true,
    default: () => 'uuid_generate_v4()',
  })
  shareToken: string;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.OPEN,
  })
  status: EventStatus;

  @Column({ name: 'organizer_id' })
  organizerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'organizer_id' })
  organizer: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
