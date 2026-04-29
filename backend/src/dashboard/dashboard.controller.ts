import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Дашборд')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Статистика системы' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('my-tasks')
  @ApiOperation({ summary: 'Документы, ожидающие решения текущего пользователя' })
  getMyTasks(@Request() req: any) {
    return this.dashboardService.getMyTasks(req.user.id);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Последние события по документам пользователя' })
  getRecentActivity(@Request() req: any) {
    return this.dashboardService.getRecentActivity(req.user.id);
  }
}
