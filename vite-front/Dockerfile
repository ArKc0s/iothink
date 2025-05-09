FROM node:18

WORKDIR /app

COPY vite-front/package.json .
RUN npm install
RUN npm i -g serve

# Copie des sources
COPY vite-front/ .

# Vérification des certificats
RUN ls -la /app/certs || (echo "❌ Certs directory not found" && exit 1)

RUN npm run build

EXPOSE 5173
CMD ["serve", "-s", "dist"]
