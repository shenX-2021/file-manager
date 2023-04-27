import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangeFilenameDto {
  @MinLength(1, { message: 'filename值错误' })
  @IsString({ message: 'filename类型错误' })
  @IsNotEmpty({ message: 'filename不能为空' })
  readonly filename: string;
}
