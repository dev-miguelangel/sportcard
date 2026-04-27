import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';

interface JwtUser { id: string; email: string; name: string; }

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsSvc: TeamsService) {}

  @Post()
  createTeam(@Body() dto: CreateTeamDto, @Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.teamsSvc.createTeam(id, dto);
  }

  @Get('mine')
  getMyTeams(@Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.teamsSvc.getMyTeams(id);
  }

  @Get('search')
  search(@Query('q') q: string = '') {
    return this.teamsSvc.searchForTeam(q);
  }

  @Get('available')
  getAvailableTeams(@Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.teamsSvc.getAvailableTeams(id);
  }

  @Get('find')
  findByTeamId(@Query('teamId') teamId: string) {
    return this.teamsSvc.findByTeamId(teamId);
  }

  @Get(':id')
  getTeamById(@Param('id') teamId: string) {
    return this.teamsSvc.getTeamById(teamId);
  }

  @Post(':id/members')
  addMember(
    @Param('id') teamId: string,
    @Body() body: { userId: string; position?: string },
    @Req() req: Request,
  ) {
    const { id } = req.user as JwtUser;
    return this.teamsSvc.addMember(teamId, id, body.userId, body.position);
  }

  @Patch(':id/members/confirm')
  confirmMembership(
    @Param('id') teamId: string,
    @Body('accept') accept: boolean,
    @Req() req: Request,
  ) {
    const { id: userId } = req.user as JwtUser;
    return this.teamsSvc.confirmMembership(teamId, userId, accept);
  }

  @Post(':id/apply')
  applyToTeam(
    @Param('id') teamId: string,
    @Req() req: Request,
  ) {
    const { id: userId } = req.user as JwtUser;
    return this.teamsSvc.applyToTeam(teamId, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTeam(
    @Param('id') teamId: string,
    @Req() req: Request,
  ) {
    const { id } = req.user as JwtUser;
    return this.teamsSvc.deleteTeam(teamId, id);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id') teamId: string,
    @Param('userId') targetUserId: string,
    @Req() req: Request,
  ) {
    const { id } = req.user as JwtUser;
    return this.teamsSvc.removeMember(teamId, id, targetUserId);
  }
}
