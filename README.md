# 文件管理

## 在本机启动
### 1.安装SQLite3
#### linux
```bash
sudo apt upgrade
sudo apt install sqlite3
```

### 2.填写环境变量
```bash
cp .env.dist .env
vim .env
```

### 3.启动后端服务
```bash
npm ci
npm start
```

## TODO
-[ ] 账号系统
-[ ] 邮件通知
