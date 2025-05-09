FROM node:24-slim

WORKDIR /app

COPY package.json .

RUN npm install

RUN npm i -g serve

COPY . .
COPY ../certs ./certs

RUN npm run build

EXPOSE 5173

CMD [ "serve", "-s", "dist" ]