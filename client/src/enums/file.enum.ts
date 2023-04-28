// 文件上传状态
export enum UploadStatusEnum {
  /**
   * 等待上传
   */
  WAIT = 'wait',
  /**
   * 暂停上传
   */
  PAUSE = 'pause',
  /**
   * 上传中
   */
  UPLOADING = 'uploading',
}

// 文件状态
export enum FileStatusEnum {
  /**
   * 初始化，生成数据表记录
   */
  INIT = 0,
  /**
   * 正在上传切片
   */
  CHUNK_UPLOADING = 1,
  /**
   * 完成上传切片
   */
  CHUNK_UPLOADED = 2,
  /**
   * 正在合并切片
   */
  CHUNK_MERGING = 3,
  /**
   * 完成合并切片
   */
  FINISHED = 4,
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
