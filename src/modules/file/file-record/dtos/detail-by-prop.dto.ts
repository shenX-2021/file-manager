import { IsInt, IsNotEmpty, IsString, Length, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DetailByPropDto {
  @Length(32, 32, { message: 'startHash错误' })
  @IsString({ message: 'startHash必须为字符串' })
  @IsNotEmpty({ message: 'startHash不能为空' })
  readonly startHash: string;

  @Length(32, 32, { message: 'endHash错误' })
  @IsString({ message: 'endHash必须为字符串' })
  @IsNotEmpty({ message: 'endHash不能为空' })
  readonly endHash: string;

  @Min(1, { message: 'size错误' })
  @IsInt({ message: 'size类型错误' })
  @Type(() => Number)
  @IsNotEmpty({ message: 'size不能为空' })
  readonly size: number;
}
