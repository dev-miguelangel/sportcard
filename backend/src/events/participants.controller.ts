import {
  Controller,
  Post,
  Delete,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParticipantsService } from './participants.service';
import { JoinEventDto } from './dto/join-event.dto';
import { UpdateParticipantStatusDto } from './dto/update-participant-status.dto';
import { InviteUserDto } from './dto/invite-user.dto';

interface JwtUser {
  id: string;
  email: string;
  name: string;
}

@Controller('events')
@UseGuards(JwtAuthGuard)
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post(':id/join')
  @HttpCode(200)
  join(@Param('id') eventId: string, @Body() dto: JoinEventDto, @Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.participantsService.join(eventId, id, dto);
  }

  @Delete(':id/join')
  @HttpCode(204)
  leave(@Param('id') eventId: string, @Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.participantsService.leave(eventId, id);
  }

  @Get(':id/participants')
  getParticipants(@Param('id') eventId: string, @Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.participantsService.getParticipants(eventId, id);
  }

  @Post(':id/invite')
  @HttpCode(200)
  invite(@Param('id') eventId: string, @Body() dto: InviteUserDto, @Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.participantsService.inviteUser(eventId, id, dto.identifier);
  }

  @Patch(':id/participants/:participantId')
  updateStatus(
    @Param('id') eventId: string,
    @Param('participantId') participantId: string,
    @Body() dto: UpdateParticipantStatusDto,
    @Req() req: Request,
  ) {
    const { id } = req.user as JwtUser;
    return this.participantsService.updateStatus(eventId, participantId, dto, id);
  }

  @Patch(':id/participants/:participantId/guardian-approve')
  guardianApprove(
    @Param('id') eventId: string,
    @Param('participantId') participantId: string,
    @Body('approve') approve: boolean,
    @Req() req: Request,
  ) {
    const { id } = req.user as JwtUser;
    return this.participantsService.guardianApprove(eventId, participantId, approve, id);
  }

  @Post(':id/invite-group')
  @HttpCode(200)
  inviteGroup(
    @Param('id') eventId: string,
    @Body() body: { groupId: string },
    @Req() req: Request,
  ) {
    const { id } = req.user as JwtUser;
    return this.participantsService.inviteGroup(id, eventId, body.groupId);
  }
}
