# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

ARG APP_VERSION=dev
ARG BUILD_VERSION_ARG=dev

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Write version files so vite.config.ts can read them
RUN echo "${APP_VERSION}" > /app/VERSION && echo "${BUILD_VERSION_ARG}" > /app/BUILD_VERSION

# Build
RUN pnpm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
