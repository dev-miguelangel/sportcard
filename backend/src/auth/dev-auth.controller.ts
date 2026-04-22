import { Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/dev-login.dto';

@Throttle({ auth: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class DevAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('dev-credentials')
  @HttpCode(200)
  devCredentials() {
    return {
      email:    this.configService.get('DEV_AUTH_EMAIL', ''),
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
