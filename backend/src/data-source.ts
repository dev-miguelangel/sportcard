import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';
import { User } from './users/entities/user.entity';
import { Event } from './events/entities/event.entity';
import { EventParticipant } from './events/entities/event-participant.entity';
import { Notification } from './notifications/entities/notification.entity';
import { Contact } from './contacts/entities/contact.entity';
import { Team } from './teams/entities/team.entity';
import { TeamMember } from './teams/entities/team-member.entity';
import { Tournament } from './tournaments/entities/tournament.entity';
import { TournamentTeam } from './tournaments/entities/tournament-team.entity';
import { Match } from './fixtures/entities/match.entity';
import { Activity } from './activities/entities/activity.entity';
import { Sport } from './sports/entities/sport.entity';

// Load .env from project root (one level above backend/)
config({ path: resolve(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432'),
  username: process.env.DATABASE_USER ?? 'sportcard',
  password: process.env.DATABASE_PASSWORD ?? 'sportcard_dev',
  database: process.env.DATABASE_NAME ?? 'sportcard',
  entities: [User, Event, EventParticipant, Notification, Contact, Team, TeamMember, Tournament, TournamentTeam, Match, Activity, Sport],
  migrations: ['src/migrations/*.ts'],
});
