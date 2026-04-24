import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, ParseIntPipe, HttpCode,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SportsService } from './sports.service';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';

@Controller()
export class SportsController {
  constructor(private readonly svc: SportsService) {}

  @Get('sports')
  findAll() {
    return this.svc.findAll();
  }

  @Get('admin/sports')
  @UseGuards(AdminGuard)
  findAllAdmin(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.svc.findAllAdmin(+page, +limit, search);
  }

  @Post('admin/sports')
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateSportDto) {
    return this.svc.create(dto);
  }

  @Patch('admin/sports/:id')
  @UseGuards(AdminGuard)
  @HttpCode(200)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSportDto) {
    return this.svc.update(id, dto);
  }

  @Delete('admin/sports/:id')
  @UseGuards(AdminGuard)
  @HttpCode(200)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
