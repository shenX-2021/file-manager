#!/bin/bash

BASE_DIR=$(pwd)
DATABASE_DIR="$(pwd)/target/db";
INIT_SQL="$(pwd)/bin/init.sql";

if [ -f "$BASE_DIR/init.lock" ]; then
  echo "已初始化"
  exit;
fi

# 创建目录
if [ ! -d "$DATABASE_DIR" ];then
    mkdir -p $DATABASE_DIR
fi

cat $INIT_SQL | sqlite3 $DATABASE_DIR/file.db

echo "INSERT INTO tb_user(id, account, pwd) VALUES(1, 'test', 'pwd');" | sqlite3 $DATABASE_DIR/file.db

#touch $BASE_DIR/init.lock
