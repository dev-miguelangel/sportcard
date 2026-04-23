import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

interface JwtUser {
  id: string;
  email: string;
  name: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('onboarding')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateOnboarding(@Req() req: Request, @Body() dto: UpdateOnboardingDto) {
    const { id } = req.user as JwtUser;
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const nextStep = user.onboardingStep >= 4 ? 4 : Math.min(user.onboardingStep + 1, 4);
    const updated = await this.usersService.update(id, { ...dto, onboardingStep: nextStep });
    const { googleId: _googleId, ...publicUser } = updated!;
    return publicUser;
  }

  @Get(':id/stats')
  getStats(@Param('id') userId: string) {
    return this.usersService.getStats(userId);
  }
}
