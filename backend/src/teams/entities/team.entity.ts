import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('team')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  sport: string;

  @Column({ name: 'coach_id' })
  coachId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'coach_id' })
  coach: User;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string | null;

  @Column({ name: 'min_age', type: 'int', nullable: true })
  minAge: number | null;

  @Column({ name: 'max_age', type: 'int', nullable: true })
  maxAge: number | null;

  @Column({ name: 'is_amateur', default: false })
  isAmateur: boolean;

  @Column({ name: 'team_id', unique: true, length: 11, default: '' })
  teamId: string;

  @Column({ name: 'icon_name', default: 'shield' })
  iconName: string;

  @Column({ name: 'background_color', length: 7, default: '#1e1e1e' })
  backgroundColor: string;

  @Column({ name: 'icon_color', length: 7, default: '#00e87a' })
  iconColor: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
