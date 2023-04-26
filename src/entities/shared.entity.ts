import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  BeforeUpdate,
  BeforeInsert,
} from 'typeorm';

export class BaseTableEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'integer',
    nullable: false,
    name: 'gmt_created',
    comment: '创建时间',
  })
  gmtCreated: number;

  @Column({
    type: 'integer',
    nullable: false,
    name: 'gmt_modified',
    comment: '更新时间',
  })
  gmtModified: number;

  @BeforeUpdate()
  beforeUpdate() {
    this.gmtModified = Date.now();
  }

  @BeforeInsert()
  beforeInsert() {
    const now = Date.now();
    this.gmtModified = now;
    this.gmtCreated = now;
  }
}
