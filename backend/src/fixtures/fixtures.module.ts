import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { TournamentTeam } from '../tournaments/entities/tournament-team.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { Event } from '../events/entities/event.entity';
import { EventParticipant } from '../events/entities/event-participant.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { FixturesService } from './fixtures.service';
import { FixturesController } from './fixtures.controller';
import { FixturesPublicController } from './fixtures-public.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Match, Tournament, TournamentTeam, Team, TeamMember,
      Event, EventParticipant,
    ]),
    NotificationsModule,
  ],
  controllers: [FixturesController, FixturesPublicController],
  providers: [FixturesService],
  exports: [FixturesService],
})
export class FixturesModule {}
