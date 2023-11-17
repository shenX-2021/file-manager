#!/bin/sh
# docker镜像构建并上传
# 命令: ./docker-release.sh [tag]

set -e

TAG=$1

# 构建最新版本
docker buildx build --platform linux/amd64 -t shenx2021/file-manager:latest .
# 登录
docker login
# 上传docker hub
docker push shenx2021/file-manager:latest

# tag不为空，则需要指定版本
if test ${#TAG} -ne 0 ;then
  # 打上指定tag
  docker tag shenx2021/file-manager:latest shenx2021/file-manager:$TAG
  # 上传docker hub
  docker push shenx2021/file-manager:$TAG
fi

