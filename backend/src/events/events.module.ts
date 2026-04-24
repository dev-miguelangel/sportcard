import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventParticipant } from './entities/event-participant.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventPublicController } from './event-public.controller';
import { ParticipantsService } from './participants.service';
import { ParticipantsController } from './participants.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { ContactGroup } from '../contacts/entities/contact-group.entity';
import { ContactGroupMember } from '../contacts/entities/contact-group-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventParticipant, ContactGroup, ContactGroupMember]),
    NotificationsModule,
    UsersModule,
  ],
  controllers: [EventsController, EventPublicController, ParticipantsController],
  providers: [EventsService, ParticipantsService],
  exports: [EventsService],
})
export class EventsModule {}
