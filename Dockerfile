# Self-hosting image (production target is GitHub Pages; this is the same static site in a container).
# Stage 1 builds with the pinned Node; stage 2 serves the static files from an unprivileged nginx:
# no sources, no node_modules, no root user (BUG-135).
#
#   docker build --build-arg VITE_SITE_URL=https://www.example.com -t fateboard .
#   docker run --rm -p 8080:8080 fateboard        # http://localhost:8080

FROM node:26.13.0-slim AS build
WORKDIR /app

# deps first (layer cache); --ignore-scripts: no husky git hooks inside the image
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts

COPY . .

# Public build-time config (see .env.example); VITE_SITE_URL is required, the build fails without it
ARG VITE_SITE_URL
ARG VITE_GA_ID=
ENV VITE_SITE_URL=${VITE_SITE_URL} \
    VITE_GA_ID=${VITE_GA_ID}
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.31.7-alpine AS serve
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# the base image already runs as the unprivileged `nginx` user and listens on 8080
EXPOSE 8080
