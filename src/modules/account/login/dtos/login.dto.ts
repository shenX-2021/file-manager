import { IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class LoginDto {
  @MinLength(1, { message: '账号不能为空字符串' })
  @IsString({ message: '账号数据类型错误' })
  @IsNotEmpty({ message: '账号不能为空' })
  readonly account: string;

  @Length(64, 64, { message: '密码错误' })
  @IsString({ message: '密码数据类型错误' })
  @IsNotEmpty({ message: '密码不能为空' })
  readonly pwd: string;
}
