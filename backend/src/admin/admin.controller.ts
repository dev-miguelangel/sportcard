import {
  Controller, Get, Patch, Post, Param, Body, Query, UseGuards, HttpCode,
} from '@nestjs/common';

import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminService } from './admin.service';
import { UserRole } from '../users/entities/user.entity';
import { IsEnum, IsString, IsBoolean, MaxLength, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class BroadcastDto {
  @IsString() @MaxLength(120) title: string;
  @IsString() @MaxLength(1000) body: string;
}

class EventNotificationDto {
  @IsString() @MaxLength(120) title: string;
  @IsString() @MaxLength(1000) body: string;
}

class ChangeRoleDto {
  @IsEnum(UserRole) role: UserRole;
}

class SetAdminDto {
  @IsString() stringId: string;
  @IsBoolean() isAdmin: boolean;
}

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  // ── Users ─────────────────────────────────────────────────
  @Get('users')
  findUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.svc.findUsers(+page, +limit, search);
  }

  @Patch('users/:id/block')
  @HttpCode(200)
  blockUser(@Param('id') id: string) {
    return this.svc.blockUser(id);
  }

  @Patch('users/:id/activate')
  @HttpCode(200)
  activateUser(@Param('id') id: string) {
    return this.svc.activateUser(id);
  }

  @Patch('users/:id/role')
  @HttpCode(200)
  changeRole(@Param('id') id: string, @Body() dto: ChangeRoleDto) {
    return this.svc.changeUserRole(id, dto.role);
  }

  @Post('users/set-admin')
  @HttpCode(200)
  setAdmin(@Body() dto: SetAdminDto) {
    return this.svc.setAdminByStringId(dto.stringId, dto.isAdmin);
  }

  // ── Events ────────────────────────────────────────────────
  @Get('events')
  findEvents(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.svc.findAllEvents(+page, +limit);
  }

  @Patch('events/:id/block')
  @HttpCode(200)
  blockEvent(@Param('id') id: string) {
    return this.svc.blockEvent(id);
  }

  @Patch('events/:id/activate')
  @HttpCode(200)
  activateEvent(@Param('id') id: string) {
    return this.svc.activateEvent(id);
  }

  // ── Stats ─────────────────────────────────────────────────
  @Get('stats')
  getStats() {
    return this.svc.getStats();
  }

  // ── Notifications ─────────────────────────────────────────
  @Post('notifications/broadcast')
  @HttpCode(201)
  broadcast(@Body() dto: BroadcastDto) {
    return this.svc.sendBroadcast(dto.title, dto.body);
  }

  @Post('notifications/event/:eventId')
  @HttpCode(201)
  eventNotification(@Param('eventId') eventId: string, @Body() dto: EventNotificationDto) {
    return this.svc.sendEventNotification(eventId, dto.title, dto.body);
  }

  @Get('notifications')
  recentNotifications() {
    return this.svc.getRecentNotifications();
  }
}
