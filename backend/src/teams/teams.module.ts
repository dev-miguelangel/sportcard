import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { User } from '../users/entities/user.entity';
import { TournamentTeam } from '../tournaments/entities/tournament-team.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { TeamsPublicController } from './teams-public.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamMember, User, TournamentTeam, Tournament]),
    NotificationsModule,
  ],
  controllers: [TeamsController, TeamsPublicController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
