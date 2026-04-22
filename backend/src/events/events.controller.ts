import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CloseEventDto } from './dto/close-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface JwtUser {
  id: string;
  email: string;
  name: string;
}

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateEventDto, @Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.eventsService.create(dto, id);
  }

  @Get('mine')
  findMine(@Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.eventsService.findMine(id);
  }

  @Get()
  findAll(@Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.eventsService.findPublic(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const { id: userId } = req.user as JwtUser;
    return this.eventsService.findOne(id, userId);
  }

  @Patch(':id/close')
  @HttpCode(200)
  close(@Param('id') id: string, @Body() dto: CloseEventDto, @Req() req: Request) {
    const { id: userId } = req.user as JwtUser;
    return this.eventsService.closeEvent(id, userId, dto);
  }
}
