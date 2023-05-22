import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigEntity } from '@src/entities';
import { Repository } from 'typeorm';
import { SetDto } from '@src/modules/app/config/dtos';
import { isDefined } from 'class-validator';
import { ConfigService } from '@src/modules/shared/services/config/config.service';
import { ConfigRo } from '@src/modules/app/config/ros';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class AppConfigService {
  constructor(
    @InjectRepository(ConfigEntity)
    private readonly configEntity: Repository<ConfigEntity>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 获取配置信息
   */
  async config(): Promise<ConfigRo> {
    let configEntity = this.configService.data();

    if (!configEntity) {
      await this.configService.init();

      configEntity = this.configService.data();
    }

    return {
      id: configEntity.id,
      uploadBandwidth: configEntity.uploadBandwidth,
      uploadBandwidthStatus: configEntity.uploadBandwidthStatus,
      downloadBandwidthStatus: configEntity.downloadBandwidthStatus,
      downloadBandwidth: configEntity.downloadBandwidth,
    };
  }

  /**
   * 更新配置
   */
  async set(setDto: SetDto): Promise<void> {
    const {
      uploadBandwidth,
      uploadBandwidthStatus,
      downloadBandwidthStatus,
      downloadBandwidth,
    } = setDto;

    const configEntity = this.configService.data();

    if (!configEntity) {
      throw new InternalServerErrorException('配置文件不存在');
    }

    const data: QueryDeepPartialEntity<ConfigEntity> = {};

    if (isDefined(uploadBandwidth)) {
      data.uploadBandwidth = uploadBandwidth;
    }
    if (isDefined(uploadBandwidthStatus)) {
      data.uploadBandwidthStatus = uploadBandwidthStatus;
    }
    if (isDefined(downloadBandwidthStatus)) {
      data.downloadBandwidthStatus = downloadBandwidthStatus;
    }
    if (isDefined(downloadBandwidth)) {
      data.downloadBandwidth = downloadBandwidth;
    }

    await this.configService.update(data);
  }
}
