import { Body, Controller, Get, Patch } from '@nestjs/common';
import { AppConfigService } from '@src/modules/app/config/service/app-config.service';
import { SetDto } from '@src/modules/app/config/dtos';

@Controller('app/config')
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  /**
   * 获取配置信息
   */
  @Get()
  config() {
    return this.appConfigService.config();
  }

  /**
   * 更新配置
   */
  @Patch()
  set(@Body() setDto: SetDto) {
    return this.appConfigService.set(setDto);
  }
}
