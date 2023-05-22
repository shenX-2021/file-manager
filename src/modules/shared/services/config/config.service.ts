import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigEntity } from '../../../../entities';
import { Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class ConfigService {
  private configEntity: ConfigEntity;

  constructor(
    @InjectRepository(ConfigEntity)
    private readonly configEntityRepository: Repository<ConfigEntity>,
  ) {
    this.init();
  }

  async init() {
    let configEntity = await this.configEntityRepository.findOneBy({ id: 1 });
    if (!configEntity) {
      configEntity = await this.configEntityRepository
        .create({
          id: 1,
          downloadBandwidth: 0,
          downloadBandwidthStatus: 0,
          uploadBandwidthStatus: 0,
          uploadBandwidth: 0,
        })
        .save();
    }

    this.configEntity = configEntity;
  }

  /**
   * 获取上传的带宽，未限制时返回0；
   */
  get uploadBandwidth(): number {
    return this.configEntity?.uploadBandwidthStatus === 1
      ? this.configEntity.uploadBandwidth
      : 0;
  }

  data(): ConfigEntity {
    return this.configEntity;
  }

  async update(
    data: QueryDeepPartialEntity<ConfigEntity>,
  ): Promise<ConfigEntity> {
    await this.configEntityRepository.update(1, data);

    await this.init();

    return this.configEntity;
  }
}
