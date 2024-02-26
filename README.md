# 文件管理
一个功能齐全的web文件管理器

技术栈：NestJS +SQLite + Vue + Element-Plus

## 特性
* 断点续传（切片上传）
* 秒传
* 上传/下载限速
* 简单的权限管理

## 预览Demo
https://fm-kv4b.onrender.com/fm/web/login?account=admin&pwd=admin123

## 启动

<details>
  <summary style="font-size: 1.5em; font-weight: 700;">在本机启动</summary>

#### 1.填写环境变量
```bash
cp .env.dist .env
vim .env
```

#### 2.安装依赖
  ```bash
  npm ci
  ```

#### 3.构建代码
```bash
npm run build
```

#### 4.执行初始化脚本
```bash
node scripts/init.js
```

#### 5.启动服务
```bash
npm run start:prod
  ```
</details>

<details>
  <summary style="font-size: 1.5em; font-weight: 700;">docker启动</summary>


#### 环境变量
| 环境变量      | 是否必选 |
|-----------|------|
| COOKIE_SECRET      | 可选   | 

#### 文件目录
| 简介         | 环境变量            | 默认值               |
|------------|------------------|-------------------|
| 上传文件的存放目录  | UPLOAD_FILE_DIR  | /data/files       |
| 上传文件的切片的存放目录 | UPLOAD_CHUNK_DIR | /data/chunks      |
| sqlite的数据文件存放目录 | DATABASE_DIR     | /data/db          |


<details>
  <summary style="font-size: 1.5em; font-weight: 700;">1.docker-compose启动</summary>

#### 1.1.复制配置信息，并更改
```bash
cp docker-compose.dist.yml docker-compose.yml
```

#### 1.2.启动
```bash
docker-compose up -d
```
</details>


<details>
  <summary style="font-size: 1.5em; font-weight: 700;">2.docker命令启动</summary>

```bash
docker run -it --name file-manager \
  -e COOKIE_SECRET=xxxxxx \
  -v /tmp/db:/data/db -v /tmp/files:/data/files  \
  -p 8888:8888 \
  shenx2021/file-manager
```
</details>


</details>

## 命令
```bash
# 编译
npm run build
# 启动服务
npm start:prod
# 初始化目录和数据库
npm run init
# 构建init脚本
npm run build:init
# 清除目录和数据库
npm run reset
# 构建reset脚本
npm run build:reset
```

## TODO
- [ ] 邮件通知
- [ ] 修改密码
