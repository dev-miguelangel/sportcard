import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

interface JwtUser { id: string; email: string; name: string; role: string }

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get('mine')
  findMine(@Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.svc.findMine(id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: Request) {
    const { id: userId } = req.user as JwtUser;
    return this.svc.markRead(id, userId);
  }
}
