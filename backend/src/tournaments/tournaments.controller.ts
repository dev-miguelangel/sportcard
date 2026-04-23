import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { TournamentTeamStatus } from './entities/tournament-team.entity';
import { TournamentStatus } from './entities/tournament.entity';

interface JwtUser { id: string; email: string; name: string; }

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentsController {
  constructor(private readonly tournamentsSvc: TournamentsService) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateTournamentDto, @Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.tournamentsSvc.createTournament(id, dto);
  }

  @Get()
  findPublic(@Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.tournamentsSvc.findPublic(id);
  }

  @Get('mine')
  findMine(@Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.tournamentsSvc.findMine(id);
  }

  @Get(':id')
  findOne(@Param('id') tournamentId: string, @Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.tournamentsSvc.findById(tournamentId, id);
  }

  @Post(':id/teams')
  @HttpCode(201)
  registerTeam(
    @Param('id') tournamentId: string,
    @Body() body: { teamId: string },
    @Req() req: Request,
  ) {
    const { id } = req.user as JwtUser;
    return this.tournamentsSvc.registerTeam(tournamentId, body.teamId, id);
  }

  @Patch(':id/teams/:teamId')
  updateRegistration(
    @Param('id') tournamentId: string,
    @Param('teamId') teamId: string,
    @Body() body: { status: TournamentTeamStatus },
    @Req() req: Request,
  ) {
    const { id } = req.user as JwtUser;
    return this.tournamentsSvc.updateRegistration(tournamentId, teamId, id, body.status);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') tournamentId: string,
    @Body() body: { status: TournamentStatus },
    @Req() req: Request,
  ) {
    const { id } = req.user as JwtUser;
    return this.tournamentsSvc.updateTournamentStatus(tournamentId, id, body.status);
  }

  @Delete(':id/teams/:teamId')
  @HttpCode(204)
  removeTeam(
    @Param('id') tournamentId: string,
    @Param('teamId') teamId: string,
    @Req() req: Request,
  ) {
    const { id } = req.user as JwtUser;
    return this.tournamentsSvc.removeTeam(tournamentId, teamId, id);
  }
}
