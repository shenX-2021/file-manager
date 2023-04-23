import { IsInt, IsNotEmpty, IsString, Length, Min } from 'class-validator';

export class UploadChunkDto {
  @Length(32, 32, { message: 'fileHash错误' })
  @IsString({ message: 'fileHash类型错误' })
  @IsNotEmpty({ message: 'fileHash不能为空' })
  readonly fileHash: string;

  @Length(4, 64, { message: 'filename错误' })
  @IsString({ message: 'filename类型错误' })
  @IsNotEmpty({ message: 'filename不能为空' })
  readonly filename: string;

  @Min(1, { message: 'chunkCount错误' })
  @IsInt({ message: 'chunkCount类型错误' })
  @IsNotEmpty({ message: 'chunkCount不能为空' })
  readonly chunkCount: number;

  @Min(0, { message: 'chunkIndex错误' })
  @IsInt({ message: 'chunkIndex类型错误' })
  @IsNotEmpty({ message: 'chunkIndex不能为空' })
  readonly chunkIndex: number;
}
