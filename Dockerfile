# 功能項目: 1.1.1 建立 Dockerfile
FROM node:20-alpine

# 設定工作目錄
WORKDIR /app-react

# 安裝依賴
COPY app-react/package*.json ./
RUN npm install

# 複製前端源碼，但排除 node_modules 目錄
COPY app-react/src ./src
COPY app-react/public ./public
COPY app-react/*.js ./
COPY app-react/*.ts ./
COPY app-react/*.json ./
COPY app-react/*.html ./
COPY app-react/*.cjs ./

# 複製後端源碼
WORKDIR /server
COPY server/ ./
RUN npm install

# 設置環境變數
# 預設為生產環境，但會被 docker-compose 中的設置覆蓋
ENV NODE_ENV=production
ENV MARKDOWN_DIR=/markdown

# 建立 markdown 目錄
RUN mkdir -p /markdown

# 暴露端口
EXPOSE 3000
EXPOSE 3001

# 複製啟動腳本
WORKDIR /
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 啟動應用
CMD ["/docker-entrypoint.sh"]
