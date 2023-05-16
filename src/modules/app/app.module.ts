import { Module } from '@nestjs/common';
import { AppConfigController } from './config/controller/app-config.controller';
import { AppConfigService } from './config/service/app-config.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigEntity } from '@src/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ConfigEntity])],
  controllers: [AppConfigController],
  providers: [AppConfigService],
})
export class AppModule {}
