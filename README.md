# Aegithalos_Caudatus

## Overview
discord.js를 사용한 싱글 파일 디스코드 봇 프로젝트

## Tech Stack
- Language: JavaScript (Node.js 18 이상 권장)
- Libraries/Frameworks: discord.js
- Build Tool: npm

## Description
이 프로젝트는 discord.js 라이브러리를 기반으로 한 디스코드 챗봇이다.
핵심 기능 및 로직은 모두 루트 디렉토리의 index.js 한 파일에 작성되어 있으며, 
bot의 명령어 및 메시지 응답 로직이 단일 파일 내에 구현되어 있다.
이미지, json 등 리소스는 resources 디렉토리에 포함됨.
또한, 원할한 구동을 위해 discord devloper portal에서 config.json을 작성해야 한다.

## Directory
- /node_modules           : npm 패키지 디렉토리
- /resources
  - /images               : 이미지 리소스 (예: main.jpg, gallery 등)
  - /jsons                : json 데이터 (예: fortune.json, lunch.json 등)
- README.md               : 프로젝트 설명 파일
- index.js                : 메인 소스 코드(봇 기능 전체 구현)
- package.json            : 의존성 및 메타 정보
- package-lock.json       : 의존성 lock 파일
- temp.js                 : 임시/실험용 코드

## Installation & Usage
1. Node.js 18 이상 환경 필요
2. 아래 명령어로 의존성 설치
   npm install
3. 디스코드 봇 토큰을 환경변수로 지정하거나 index.js에 입력
4. 아래 명령어로 실행
   node index.js

## Contact
문의: sincelife777@gmail.com (illuminateP)
