import { Controller, Get, Param } from '@nestjs/common';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsPublicController {
  constructor(private readonly teamsSvc: TeamsService) {}

  @Get('p/:id')
  getPublicProfile(@Param('id') teamId: string) {
    return this.teamsSvc.getPublicProfile(teamId);
  }
}
