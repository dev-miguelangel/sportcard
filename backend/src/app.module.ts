import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { ContactsModule } from './contacts/contacts.module';
import { TeamsModule } from './teams/teams.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { FixturesModule } from './fixtures/fixtures.module';
import { ActivitiesModule } from './activities/activities.module';
import { SportsModule } from './sports/sports.module';
import { User } from './users/entities/user.entity';
import { Event } from './events/entities/event.entity';
import { EventParticipant } from './events/entities/event-participant.entity';
import { Notification } from './notifications/entities/notification.entity';
import { Contact } from './contacts/entities/contact.entity';
import { ContactGroup } from './contacts/entities/contact-group.entity';
import { ContactGroupMember } from './contacts/entities/contact-group-member.entity';
import { Team } from './teams/entities/team.entity';
import { TeamMember } from './teams/entities/team-member.entity';
import { Tournament } from './tournaments/entities/tournament.entity';
import { TournamentTeam } from './tournaments/entities/tournament-team.entity';
import { TournamentParticipant } from './tournaments/entities/tournament-participant.entity';
import { Match } from './fixtures/entities/match.entity';
import { Activity } from './activities/entities/activity.entity';
import { Sport } from './sports/entities/sport.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60_000, limit: 100 },
      { name: 'auth',   ttl: 60_000, limit: 10  },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get('DATABASE_USER', 'sportcard'),
        password: config.get('DATABASE_PASSWORD', 'sportcard_dev'),
        database: config.get('DATABASE_NAME', 'sportcard'),
        entities: [User, Event, EventParticipant, Notification, Contact, ContactGroup, ContactGroupMember, Team, TeamMember, Tournament, TournamentTeam, TournamentParticipant, Match, Activity, Sport],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        migrationsRun: true,
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    UsersModule,
    EventsModule,
    NotificationsModule,
    AdminModule,
    ContactsModule,
    TeamsModule,
    TournamentsModule,
    FixturesModule,
    ActivitiesModule,
    SportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
