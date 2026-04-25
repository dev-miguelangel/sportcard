import { Controller, Get, Param } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';

@Controller('tournaments')
export class TournamentPublicController {
  constructor(private readonly tournamentsSvc: TournamentsService) {}

  @Get('t')
  listPublic() {
    return this.tournamentsSvc.listPublic();
  }

  @Get('t/:shareToken')
  findByToken(@Param('shareToken') shareToken: string) {
    return this.tournamentsSvc.findByToken(shareToken);
  }

  @Get('p/:id')
  findByIdPublic(@Param('id') id: string) {
    return this.tournamentsSvc.findByIdPublic(id);
  }
}
