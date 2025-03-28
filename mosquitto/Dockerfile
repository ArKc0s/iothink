FROM eclipse-mosquitto:2.0

# Installer les dépendances nécessaires
RUN apk add --no-cache \
    git \
    build-base \
    cmake \
    openssl-dev \
    c-ares-dev \
    curl-dev \
    util-linux-dev

# Télécharger mosquitto-auth-plug
WORKDIR /build
RUN git clone https://github.com/jpmens/mosquitto-auth-plug.git
WORKDIR /build/mosquitto-auth-plug

# Copier un config.mk personnalisé (tu peux aussi l’éditer directement ici si tu veux)
COPY config/config.mk ./

# Compiler le plugin
RUN make

# Copier le plugin compilé dans le dossier de config Mosquitto
RUN mkdir -p /mosquitto/auth && \
    cp auth-plug.so /mosquitto/auth/

# Nettoyage
RUN apt-get remove -y git build-essential && apt-get autoremove -y && rm -rf /build

# Copier la config Mosquitto depuis ton host
COPY config/ /mosquitto/config/
