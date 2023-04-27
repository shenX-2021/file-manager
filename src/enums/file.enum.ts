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

// 文件校验状态
export enum FileCheckStatusEnum {
  /**
   * 未校验
   */
  UNCHECKED = 0,
  /**
   * 校验成功
   */
  SUCCESSFUL = 1,
  /**
   * 校验失败
   */
  FAILURE = 2,
}
