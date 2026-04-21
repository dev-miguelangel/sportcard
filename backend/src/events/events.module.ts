import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventParticipant } from './entities/event-participant.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { ParticipantsService } from './participants.service';
import { ParticipantsController } from './participants.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventParticipant])],
  controllers: [EventsController, ParticipantsController],
  providers: [EventsService, ParticipantsService],
  exports: [EventsService],
})
export class EventsModule {}
