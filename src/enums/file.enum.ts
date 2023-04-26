// 文件状态
export enum FileStatusEnum {
  /**
   * 初始化，生成数据表记录
   */
  INIT = 0,
  /**
   * 完成上传切片
   */
  CHUNK_UPLOADED = 1,
  /**
   * 完成合并切片
   */
  FINISHED = 2,
}
