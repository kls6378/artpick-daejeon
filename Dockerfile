# Node.js 22 버전을 기반으로 이미지 생성
FROM node:22.14.0

# Oracle DB 클라이언트 및 필수 라이브러리 설치
RUN apt-get update && apt-get install -y \
    libaio1 \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Oracle Instant Client 압축 해제 및 설치
COPY instantclient-basic-linux.x64-19.27.0.0.0dbru.zip /opt/oracle/
RUN cd /opt/oracle && \
    unzip instantclient-basic-linux.x64-19.27.0.0.0dbru.zip && \
    rm instantclient-basic-linux.x64-19.27.0.0.0dbru.zip

# 환경변수 설정
ENV LD_LIBRARY_PATH="/opt/oracle/instantclient_19_27:$LD_LIBRARY_PATH"
ENV PATH="/opt/oracle/instantclient_19_27:$PATH"

# 작업 디렉토리 설정
WORKDIR /usr/src/app

# package.json 및 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm install

# 프로젝트 파일 복사
COPY . .

# 포트 노출
EXPOSE 80

# 애플리케이션 시작 명령
CMD [ "npm", "start" ]
