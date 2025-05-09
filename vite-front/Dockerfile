FROM node:24-slim

WORKDIR /app

COPY ./vite-front/package.json ./

RUN npm install

RUN npm i -g serve

COPY ./vite-front ./
COPY ../certs ./certs

RUN npm run build

EXPOSE 5173

CMD [ "serve", "-s", "dist", "-l", "5173" ]
