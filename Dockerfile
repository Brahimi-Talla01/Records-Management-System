# UniArchive - Frontend (build Vite puis serveur Nginx)

# --- Étape 1 : build de l'application ---
FROM node:20-alpine AS build

# URL de base de l'API, injectée à la compilation (Vite ne lit que les vars VITE_*).
# "/api" = URL relative : même origine, Nginx proxifie vers le backend,
# aucun port supplémentaire à publier et pas de CORS à gérer.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# --- Étape 2 : serveur Nginx ---
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
