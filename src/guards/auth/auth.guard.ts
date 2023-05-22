import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { LoginService } from '@src/modules/account/login/service/login.service';
import { SKIP_AUTH_KEY } from '@src/decorators';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();

    // 判断是否跳过鉴权
    const isSkipAuth = Reflect.getMetadata(SKIP_AUTH_KEY, context.getHandler());
    if (isSkipAuth) return true;

    const str = req.signedCookies.sign;
    let data;
    try {
      data = JSON.parse(str);
      if (typeof data !== 'object') throw new Error('错误的cookie值');
    } catch (e) {
      throw new UnauthorizedException('cookie已失效');
    }
    const account = Buffer.from(data.account, 'base64').toString('utf-8');
    const expire = data.expire;

    if (
      Date.now() >= expire ||
      !account ||
      !LoginService.userEntity ||
      LoginService.userEntity.account !== account
    ) {
      throw new UnauthorizedException('cookie已失效');
    }

    return true;
  }
}
