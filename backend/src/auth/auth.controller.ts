import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DevLoginDto } from './dto/dev-login.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

interface JwtUser {
  id: string;
  email: string;
  name: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  // ── Google OAuth ──────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Passport redirige automáticamente a Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const token = this.authService.generateToken(user);
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:4200');

    // Redirige al frontend con el JWT como query param
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  // ── JWT ───────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async getMe(@Req() req: Request) {
    const { id } = req.user as JwtUser;
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { googleId: _googleId, ...publicUser } = user;
    return publicUser;
  }

  @Get('logout')
  @HttpCode(200)
  logout() {
    return { message: 'Sesión cerrada' };
  }

  // ── Dev Auth (solo development + DEV_AUTH_ENABLED=true) ──

  @Get('dev-credentials')
  @HttpCode(200)
  devCredentials() {
    if (
      this.configService.get('NODE_ENV') === 'production' ||
      this.configService.get('DEV_AUTH_ENABLED') !== 'true'
    ) {
      return null;
    }
    return {
      email: this.configService.get('DEV_AUTH_EMAIL', ''),
      password: this.configService.get('DEV_AUTH_PASSWORD', ''),
    };
  }

  @Post('dev-login')
  @HttpCode(200)
  async devLogin(@Body() dto: DevLoginDto) {
    const token = await this.authService.devLogin(dto.email, dto.password);
    return { token };
  }
}
