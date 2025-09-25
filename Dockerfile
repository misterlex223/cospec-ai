# 功能項目: 1.1.1 建立 Dockerfile
FROM node:20-alpine

# 設定工作目錄
WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm

# 複製前端應用程式的 package.json
COPY app/package.json ./

# 安裝前端依賴
RUN pnpm install

# 複製前端源碼
COPY app/index.html ./
COPY app/vite.config.js ./
COPY app/src ./src
COPY app/public ./public

# 建立後端目錄
WORKDIR /server

# 複製後端 package.json
COPY app/server/package.json ./

# 安裝後端依賴
RUN npm install

# 複製後端源碼
COPY app/server/index.js ./

# 建立 markdown 目錄
RUN mkdir -p /markdown

# 複製啟動腳本
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 暴露端口
EXPOSE 3000 3001

# 設定啟動命令
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
