
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG VITE_APP_VERSION=1.0.0
ARG VITE_APP_BUILD=1

ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_APP_BUILD=$VITE_APP_BUILD

RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
