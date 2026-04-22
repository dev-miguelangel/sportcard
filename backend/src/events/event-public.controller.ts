import { Controller, Get, Param } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventPublicController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('token/:shareToken')
  findByToken(@Param('shareToken') shareToken: string) {
    return this.eventsService.findByShareToken(shareToken);
  }
}
