import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { LoginService } from '@src/modules/account/login/service/login.service';
import { LoginDto } from '@src/modules/account/login/dtos';
import { Response } from 'express';
import { AuthGuard } from '@src/guards/auth/auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('login')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  /**
   * 登录
   */
  @Throttle(15, 60)
  @Post()
  login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.loginService.login(loginDto, res);
  }

  /**
   * 刷新cookie过期时间
   */
  @UseGuards(AuthGuard)
  @Post('cookie')
  updateCookie(@Res({ passthrough: true }) res: Response) {
    return this.loginService.updateCookie(res);
  }

  /**
   * 登出
   */
  @UseGuards(AuthGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    return this.loginService.logout(res);
  }
}
