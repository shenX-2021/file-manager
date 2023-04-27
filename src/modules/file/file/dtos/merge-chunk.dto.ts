import { IsInt, IsNotEmpty, IsString, Length, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MergeChunkDto {
  @Length(32, 32, { message: 'fileHash错误' })
  @IsString({ message: 'fileHash类型错误' })
  @IsNotEmpty({ message: 'fileHash不能为空' })
  readonly fileHash: string;

  @Min(1, { message: 'size错误' })
  @IsInt({ message: 'size类型错误' })
  @Type(() => Number)
  @IsNotEmpty({ message: 'size不能为空' })
  readonly size: number;
}
