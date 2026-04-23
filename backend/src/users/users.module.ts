import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Match } from '../fixtures/entities/match.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { TournamentTeam } from '../tournaments/entities/tournament-team.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Match, TeamMember, TournamentTeam])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
