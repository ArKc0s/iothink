# Activer uniquement le backend HTTP
BACKEND_CDB ?= no
BACKEND_MYSQL ?= no
BACKEND_SQLITE ?= no
BACKEND_REDIS ?= no
BACKEND_POSTGRES ?= no
BACKEND_LDAP ?= no
BACKEND_HTTP ?= yes
BACKEND_JWT ?= no
BACKEND_MONGO ?= no
BACKEND_FILES ?= no
BACKEND_MEMCACHED ?= no

# Mosquitto installé dans l'image officielle utilise ce chemin par défaut
MOSQUITTO_SRC = /usr/include

# OpenSSL sur la plupart des systèmes Linux
OPENSSLDIR = /usr

# Pas besoin des hashers Django
SUPPORT_DJANGO_HASHERS ?= no

# Compilation dans Docker : chemins standards
CFG_LDFLAGS =
CFG_CFLAGS = -I$(MOSQUITTO_SRC)
