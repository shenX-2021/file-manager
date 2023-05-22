import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateOutsideDownloadDto {
  @IsEnum({ 禁用: 0, 启用: 1 }, { message: '状态类型错误' })
  @IsNotEmpty({ message: '状态不能为空' })
  readonly outsideDownload: 0 | 1;
}
