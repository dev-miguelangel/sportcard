import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContactsService } from './contacts.service';

interface JwtUser {
  id: string;
  email: string;
  name: string;
}

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsSvc: ContactsService) {}

  @Get('search')
  search(@Query('q') q: string = '', @Req() req: Request) {
    const user = req.user as JwtUser;
    return this.contactsSvc.searchUsers(user.id, q);
  }

  @Get('followers')
  getFollowers(@Req() req: Request) {
    const user = req.user as JwtUser;
    return this.contactsSvc.getFollowers(user.id);
  }

  @Get()
  getContacts(@Req() req: Request) {
    const user = req.user as JwtUser;
    return this.contactsSvc.getContacts(user.id);
  }

  @Post(':userId')
  addContact(@Param('userId') contactId: string, @Req() req: Request) {
    const user = req.user as JwtUser;
    return this.contactsSvc.addContact(user.id, contactId);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeContact(@Param('userId') contactId: string, @Req() req: Request) {
    const user = req.user as JwtUser;
    return this.contactsSvc.removeContact(user.id, contactId);
  }
}
