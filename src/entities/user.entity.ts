import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tb_user' })
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'text',
    nullable: false,
    default: '',
    comment: '账号',
  })
  account: string;

  @Column({
    type: 'text',
    nullable: false,
    default: '',
    comment: '密码',
  })
  pwd: string;
}
