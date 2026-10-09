# syntax=docker/dockerfile:1

# build: compile the app and bundle the server into one file
# the digest pins the exact base image, Dependabot opens a PR when it changes
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
WORKDIR /app

# corepack installs the pnpm version pinned in package.json
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
# --ignore-scripts because there's no git in here for husky's prepare step
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm build

# runtime: just the built output, no source, no node_modules, no keys
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    STATIC_DIR=./dist
WORKDIR /app

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/dist-server ./dist-server

# don't run as root
USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

CMD ["node", "dist-server/index.js"]
