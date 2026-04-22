import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { EventParticipant } from '../events/entities/event-participant.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Event, EventParticipant, Notification])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
