import { Module } from '@nestjs/common';
import { LoginService } from './login/service/login.service';
import { LoginController } from './login/controller/login.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@src/entities';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [LoginService],
  controllers: [LoginController],
})
export class AccountModule {}
