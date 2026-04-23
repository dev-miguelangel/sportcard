import { Controller, Get, Param } from '@nestjs/common';
import { FixturesService } from './fixtures.service';

@Controller('tournaments')
export class FixturesPublicController {
  constructor(private readonly fixturesSvc: FixturesService) {}

  @Get(':id/matches')
  getMatches(@Param('id') tournamentId: string) {
    return this.fixturesSvc.getMatches(tournamentId);
  }

  @Get(':id/standings')
  getStandings(@Param('id') tournamentId: string) {
    return this.fixturesSvc.getStandings(tournamentId);
  }

  @Get(':id/bracket')
  getBracket(@Param('id') tournamentId: string) {
    return this.fixturesSvc.getBracket(tournamentId);
  }
}
