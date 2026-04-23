import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FixturesService } from './fixtures.service';

interface JwtUser { id: string; email: string; name: string; }

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class FixturesController {
  constructor(private readonly fixturesSvc: FixturesService) {}

  @Post(':id/fixture')
  @HttpCode(201)
  generateFixture(@Param('id') tournamentId: string, @Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.fixturesSvc.generateFixture(tournamentId, id);
  }

  @Patch(':id/matches/:matchId/schedule')
  scheduleMatch(
    @Param('id') tournamentId: string,
    @Param('matchId') matchId: string,
    @Body() dto: { startDatetime: string; locationName: string },
    @Req() req: Request,
  ) {
    void tournamentId;
    const { id } = req.user as JwtUser;
    return this.fixturesSvc.scheduleMatch(matchId, id, dto);
  }

  @Patch(':id/matches/:matchId/result')
  recordResult(
    @Param('id') tournamentId: string,
    @Param('matchId') matchId: string,
    @Body() dto: { homeScore: number; awayScore: number; homePenalties?: number; awayPenalties?: number },
    @Req() req: Request,
  ) {
    void tournamentId;
    const { id } = req.user as JwtUser;
    return this.fixturesSvc.recordResult(matchId, id, dto);
  }

  @Patch(':id/matches/:matchId/cancel')
  cancelMatch(
    @Param('id') tournamentId: string,
    @Param('matchId') matchId: string,
    @Body() body: { status: 'cancelled' | 'postponed' },
    @Req() req: Request,
  ) {
    void tournamentId;
    const { id } = req.user as JwtUser;
    return this.fixturesSvc.cancelMatch(matchId, id, body.status);
  }
}
