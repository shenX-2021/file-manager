import { Global, Module } from '@nestjs/common';
import { ConfigService } from './services/config/config.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigEntity } from '../../entities';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ConfigEntity])],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class SharedModule {}
