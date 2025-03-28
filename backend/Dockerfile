# Étape 1 : base image officielle Node.js
FROM node:18

# Étape 2 : répertoire de travail dans le conteneur
WORKDIR /app

# Étape 5 : copie du reste du code
COPY . .

# Étape 4 : installation des dépendances
RUN npm install

# Étape 6 : exposer le port de l'app
EXPOSE 3000

# Étape 7 : commande de lancement
CMD [ "npm", "start" ]
