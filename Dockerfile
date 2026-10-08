# Build stage: reproducible install (`npm ci` fails if package.json and the lockfile disagree)
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* values into the bundle at *build* time, so they are build arguments, not
# runtime environment variables. Both values are public by design (see .env.example).
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
# Without the API address the image would build fine and then show an error page to everybody.
RUN test -n "$VITE_API_URL" || { echo "VITE_API_URL is empty: build with --build-arg VITE_API_URL=<backend address including /api>" >&2; exit 1; }
RUN npm run build

# Runtime stage: static files behind nginx (unprivileged image: non-root user, listens on 8080)
FROM nginxinc/nginx-unprivileged:alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
