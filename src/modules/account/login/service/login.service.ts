import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginDto } from '@src/modules/account/login/dtos';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '@src/entities';
import { Repository } from 'typeorm';
import { sha256 } from '@src/utils';
import { Response } from 'express';
import { nanoid } from 'nanoid';

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
    let userEntity = await this.userEntityRepository.findOneBy({ id: 1 });

    if (!userEntity) {
      const salt = nanoid(10);
      const secretPwd = sha256(`${pwd}${salt}`);
      userEntity = await this.userEntityRepository
        .create({
          id: 1,
          account,
          pwd: secretPwd,
          salt,
        })
        .save();
    } else {
      const secretPwd = sha256(`${pwd}${userEntity.salt}`);
      if (account !== userEntity.account) {
        throw new BadRequestException('账号密码错误');
      }
      if (secretPwd !== userEntity.pwd) {
        throw new BadRequestException('账号或密码错误');
      }
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
