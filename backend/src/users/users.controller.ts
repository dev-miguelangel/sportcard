import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService, UserProfileDto } from './users.service';
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

  @Get('me/guardian')
  @UseGuards(JwtAuthGuard)
  getGuardian(@Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.usersService.getGuardian(id);
  }

  @Post('me/guardian')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  setGuardian(@Req() req: Request, @Body('identifier') identifier: string) {
    const { id } = req.user as JwtUser;
    return this.usersService.setGuardian(id, identifier);
  }

  @Delete('me/guardian')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  removeGuardian(@Req() req: Request) {
    const { id } = req.user as JwtUser;
    return this.usersService.removeGuardian(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') userId: string) {
    return this.usersService.getStats(userId);
  }

  @Get(':id/profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Param('id') userId: string): Promise<UserProfileDto> {
    return this.usersService.getPublicProfile(userId);
  }
}
