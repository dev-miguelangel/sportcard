import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';
import { ContactGroup } from './entities/contact-group.entity';
import { ContactGroupMember } from './entities/contact-group-member.entity';
import { User } from '../users/entities/user.entity';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { ContactGroupsService } from './contact-groups.service';
import { ContactGroupsController } from './contact-groups.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, ContactGroup, ContactGroupMember, User]), NotificationsModule],
  controllers: [ContactGroupsController, ContactsController],
  providers: [ContactsService, ContactGroupsService],
  exports: [ContactGroupsService],
})
export class ContactsModule {}
