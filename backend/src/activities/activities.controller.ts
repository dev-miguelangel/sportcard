import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';

interface JwtUser {
  id: string;
  email: string;
  name: string;
}

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly svc: ActivitiesService) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateActivityDto, @Request() req: { user: JwtUser }) {
    return this.svc.create(dto, req.user.id);
  }

  @Get()
  findMine(@Request() req: { user: JwtUser }) {
    return this.svc.findMyRecent(req.user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteOwn(@Param('id') id: string, @Request() req: { user: JwtUser }) {
    await this.svc.deleteOwn(id, req.user.id);
  }
}
