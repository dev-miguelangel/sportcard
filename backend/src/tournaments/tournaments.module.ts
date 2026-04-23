import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from './entities/tournament.entity';
import { TournamentTeam } from './entities/tournament-team.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { Match } from '../fixtures/entities/match.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { TournamentPublicController } from './tournament-public.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tournament, TournamentTeam, Team, TeamMember, Match]),
    NotificationsModule,
  ],
  controllers: [TournamentsController, TournamentPublicController],
  providers: [TournamentsService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
