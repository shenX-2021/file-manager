import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigEntity } from '@src/entities';
import { Repository } from 'typeorm';
import { SetDto } from '@src/modules/app/config/dtos';
import { isDefined } from 'class-validator';
import { ConfigService } from '@src/modules/shared/services/config/config.service';

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
  async config(): Promise<ConfigEntity> {
    const configEntity = await this.configEntity.findOne({
      where: {
        id: 1,
      },
      select: {
        id: true,
        downloadBandwidth: true,
        downloadBandwidthStatus: true,
        uploadBandwidthStatus: true,
        uploadBandwidth: true,
      },
    });

    if (!configEntity) {
      throw new InternalServerErrorException('配置文件不存在');
    }

    return configEntity;
  }

  /**
   * 更新配置
   */
  async set(setDto: SetDto) {
    const {
      uploadBandwidth,
      uploadBandwidthStatus,
      downloadBandwidthStatus,
      downloadBandwidth,
    } = setDto;

    const configEntity = await this.configEntity.findOne({
      where: {
        id: 1,
      },
      select: {
        id: true,
        downloadBandwidth: true,
        downloadBandwidthStatus: true,
        uploadBandwidthStatus: true,
        uploadBandwidth: true,
      },
    });

    if (!configEntity) {
      throw new InternalServerErrorException('配置文件不存在');
    }

    if (isDefined(uploadBandwidth)) {
      configEntity.uploadBandwidth = uploadBandwidth;
    }
    if (isDefined(uploadBandwidthStatus)) {
      configEntity.uploadBandwidthStatus = uploadBandwidthStatus;
    }
    if (isDefined(downloadBandwidthStatus)) {
      configEntity.downloadBandwidthStatus = downloadBandwidthStatus;
    }
    if (isDefined(downloadBandwidth)) {
      configEntity.downloadBandwidth = downloadBandwidth;
    }

    await configEntity.save();
    await this.configService.init();
  }
}
