import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ContactGroup } from './contact-group.entity';

@Entity('contact_group_members')
@Unique(['groupId', 'userId'])
export class ContactGroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id' })
  groupId: string;

  @ManyToOne(() => ContactGroup, g => g.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: ContactGroup;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
