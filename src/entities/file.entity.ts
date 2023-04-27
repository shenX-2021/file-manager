import { Column, Entity } from 'typeorm';
import { BaseTableEntity } from './shared.entity';
import { FileCheckStatusEnum, FileStatusEnum } from '../enums';

@Entity({ name: 'tb_file' })
export class FileEntity extends BaseTableEntity {
  @Column({
    type: 'text',
    name: 'file_name',
    nullable: false,
    default: '',
    comment: '文件名',
  })
  filename: string;

  @Column({
    type: 'text',
    name: 'file_hash',
    nullable: false,
    default: '',
    comment: '文件hash',
  })
  fileHash: string;

  @Column({
    type: 'text',
    name: 'start_hash',
    nullable: false,
    default: '',
    comment: '文件起始部分的hash',
  })
  startHash: string;

  @Column({
    type: 'text',
    name: 'end_hash',
    nullable: false,
    default: '',
    comment: '文件末尾部分的hash',
  })
  endHash: string;

  @Column({
    type: 'text',
    name: 'file_path',
    nullable: false,
    default: '',
    comment: '文件存储路径',
  })
  filePath: string;

  @Column({
    type: 'integer',
    nullable: false,
    default: 0,
    comment: '文件大小',
  })
  size: number;

  @Column({
    type: 'integer',
    nullable: false,
    default: 0,
    comment: '文件状态',
  })
  status: FileStatusEnum;

  @Column({
    type: 'integer',
    name: 'check_status',
    nullable: false,
    default: 0,
    comment: '文件校验状态',
  })
  checkStatus: FileCheckStatusEnum;
}
