import { IsInt, IsNotEmpty, IsString, Length, Min } from 'class-validator';

export class VerifyDto {
  @Length(32, 32, { message: 'fileHash错误' })
  @IsString({ message: 'fileHash必须为字符串' })
  @IsNotEmpty({ message: 'fileHash不能为空' })
  readonly fileHash: string;

  @Length(32, 32, { message: 'startHash错误' })
  @IsString({ message: 'startHash必须为字符串' })
  @IsNotEmpty({ message: 'startHash不能为空' })
  readonly startHash: string;

  @Length(32, 32, { message: 'endHash错误' })
  @IsString({ message: 'endHash必须为字符串' })
  @IsNotEmpty({ message: 'endHash不能为空' })
  readonly endHash: string;

  @Length(1, 64, { message: 'filename错误' })
  @IsString({ message: 'filename必须为字符串' })
  @IsNotEmpty({ message: 'filename不能为空' })
  readonly filename: string;

  @Min(1, { message: 'size错误' })
  @IsInt({ message: 'size类型错误' })
  @IsNotEmpty({ message: 'size不能为空' })
  readonly size: number;
}
