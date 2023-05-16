import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class SetDto {
  @Min(0, { message: '下载带宽不能为负数' })
  @IsInt({ message: '下载带宽类型错误' })
  @IsOptional()
  readonly downloadBandwidth?: number;

  @IsEnum({ 禁用: 0, 启用: 1 }, { message: '下载带宽状态类型错误' })
  @IsOptional()
  readonly downloadBandwidthStatus?: 0 | 1;

  @Min(0, { message: '上传带宽不能为负数' })
  @IsInt({ message: '上传带宽类型错误' })
  @IsOptional()
  readonly uploadBandwidth?: number;

  @IsEnum({ 禁用: 0, 启用: 1 }, { message: '上传带宽状态类型错误' })
  @IsOptional()
  readonly uploadBandwidthStatus?: 0 | 1;
}
