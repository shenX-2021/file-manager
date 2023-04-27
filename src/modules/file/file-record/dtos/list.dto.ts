import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListDto {
  @Min(1, { message: 'pageSize值错误' })
  @IsInt({ message: 'pageSize类型错误' })
  @Type(() => Number)
  @IsNotEmpty({ message: 'pageSize不能为空' })
  readonly pageSize: number;

  @Min(1, { message: 'pageNumber值错误' })
  @IsInt({ message: 'pageNumber类型错误' })
  @Type(() => Number)
  @IsNotEmpty({ message: 'pageNumber不能为空' })
  readonly pageNumber: number;

  @IsString({ message: 'filename类型错误' })
  @IsOptional()
  readonly filename?: string;
}
