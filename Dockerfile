# Etapa de construcción (Build Stage)
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos primero el package.json para aprovechar la caché de Docker
COPY package*.json ./
RUN npm install

# Copiamos el resto de los archivos del frontend
COPY . .

# Usamos la configuración de .env.docker para la construcción
RUN cp .env.docker .env || true

# Compilamos el proyecto (Vue/Vite)
RUN npm run build

# Etapa de producción (Production Stage)
FROM nginx:alpine

# Removemos el archivo por defecto de nginx
RUN rm /etc/nginx/conf.d/default.conf

# Agregamos nuestra configuración adaptada para SPA y puerto 85
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos los archivos generados ('dist') en el paso anterior a nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponemos el puerto 85 solicitado
EXPOSE 85

CMD ["nginx", "-g", "daemon off;"]
