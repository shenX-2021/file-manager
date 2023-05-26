FROM node:18-alpine

ENV LOG_PATH=/log/log.txt
ENV UPLOAD_CHUNK_DIR=/data/chunks
ENV UPLOAD_FILE_DIR=/data/files
ENV DATABASE_DIR=/data/db

WORKDIR /opt/app
COPY . /opt/app

EXPOSE 8888

RUN npm config set registry https://registry.npmmirror.com
RUN npm ci \
  && npm run init \
  && npm run build \
  && rm -rf node_modules/ \
  && rm -rf client/node_modules/ \
  && rm -rf /root/.npm/_cacache

RUN cp -f docker-package.json package.json \
  && npm i

CMD ["/bin/sh", "-c", "npm run start:prod"]
