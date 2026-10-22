# Customer onboarding web app: built once, served as static files by nginx. The nginx configuration
# (TLS certificate, the /api1 and /api2 routes to the backend) is mounted when the container runs.
# API addresses default to https://onboard.zemenbank.com/api1 and /api2; another domain (e.g. UAT):
#   docker build --build-arg VITE_API_BASE_URL=https://uat.example/api1 --build-arg VITE_DASHBOARD_URL=https://uat.example/api2 .

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=
ARG VITE_DASHBOARD_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_DASHBOARD_URL=$VITE_DASHBOARD_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443
