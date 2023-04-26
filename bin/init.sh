#!/bin/bash

BASE_DIR=$(pwd)
DATABASE_DIR="$(pwd)/target/db";
INIT_SQL="$(pwd)/bin/init.sql";

echo $BASE_DIR;
cd $DATABASE_DIR;

if [ -f "$BASE_DIR/init.lock" ]; then
  echo "已初始化"
  exit;
fi


cat $INIT_SQL | sqlite3 file.db

echo "INSERT INTO tb_user(id, account, pwd) VALUES(1, 'test', 'pwd');" | sqlite3 file.db

#touch $BASE_DIR/init.lock
