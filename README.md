# 文件管理
一个功能齐全的web文件管理器

## 特性
* 断点续传（切片上传）
* 秒传
* 上传/下载限速
* 简单的权限管理

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
|-----------|-|
| COOKIE_SECRET      | 必选 | 

#### 文件目录
| 简介         | path             |
|------------|------------------|
| 上传文件的存放目录  | UPLOAD_FILE_DIR  | 
| 上传文件的切片的存放目录 | UPLOAD_CHUNK_DIR | 
| sqlite的数据文件存放目录 | DATABASE_DIR     | 
| 日志文件       | LOG_PATH         | 

### 启动
```bash
docker-compose up -d
```

</details>

## TODO
-[ ] 邮件通知
