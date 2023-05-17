import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginDto } from '@src/modules/account/login/dtos';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '@src/entities';
import { Repository } from 'typeorm';
import { sha256 } from '@src/utils';
import { Response } from 'express';

@Injectable()
export class LoginService {
  static userEntity: UserEntity;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userEntityRepository: Repository<UserEntity>,
  ) {}

  /**
   * 登录
   */
  async login(loginDto: LoginDto, res: Response) {
    const { account, pwd } = loginDto;
    const userEntity = await this.userEntityRepository.findOneBy({ account });
    if (!userEntity) {
      throw new BadRequestException('账号密码错误');
    }

    const secretPwd = sha256(`${pwd}${userEntity.salt}`);
    if (secretPwd !== userEntity.pwd) {
      throw new BadRequestException('账号或密码错误');
    }

    LoginService.userEntity = userEntity;

    this.setCookie(res, userEntity.account);
  }

  /**
   * 刷新cookie过期时间
   */
  async updateCookie(res: Response) {
    this.setCookie(res, LoginService.userEntity.account);
  }

  /**
   * 登出
   */
  async logout(res: Response) {
    res.clearCookie('sign', {
      httpOnly: true,
      signed: true,
      path: '/fm/api',
    });
  }

  private setCookie(res: Response, account: string) {
    const value = JSON.stringify({
      account: Buffer.from(account).toString('base64'),
      expire: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('sign', value, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      signed: true,
      path: '/fm/api',
    });
  }
}
