import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContactGroupsService } from './contact-groups.service';

interface JwtUser {
  id: string;
  email: string;
  name: string;
}

@Controller('contacts/groups')
@UseGuards(JwtAuthGuard)
export class ContactGroupsController {
  constructor(private readonly groupsSvc: ContactGroupsService) {}

  @Get()
  getMyGroups(@Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.groupsSvc.getMyGroups(id);
  }

  @Post()
  createGroup(@Body() body: { name: string; description?: string }, @Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.groupsSvc.createGroup(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteGroup(@Param('id') groupId: string, @Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.groupsSvc.deleteGroup(id, groupId);
  }

  @Get(':id/members')
  getMembers(@Param('id') groupId: string, @Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.groupsSvc.getMembers(id, groupId);
  }

  @Post(':id/members')
  addMember(
    @Param('id') groupId: string,
    @Body() body: { userId: string },
    @Req() req: Request,
  ) {
    const { id } = req.user as JwtUser;
    return this.groupsSvc.addMember(id, groupId, body.userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id') groupId: string,
    @Param('userId') userId: string,
    @Req() req: Request,
  ) {
    const { id } = req.user as JwtUser;
    return this.groupsSvc.removeMember(id, groupId, userId);
  }
}
