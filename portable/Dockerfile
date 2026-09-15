FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY app ./app
COPY lib ./lib
COPY components ./components
COPY hooks ./hooks
COPY public ./public
COPY drizzle ./drizzle
COPY portable ./portable
COPY vendor ./vendor
COPY types ./types
COPY scripts/stage-portable.mjs ./scripts/stage-portable.mjs
COPY tsconfig.json postcss.config.mjs ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN node scripts/stage-portable.mjs && node node_modules/next/dist/bin/next build --webpack .sites-runtime/portable-build

FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 DATABASE_PATH=/data/calcutta.sqlite
COPY --from=build --chown=node:node /src/.sites-runtime/portable-build/.next/standalone ./
COPY --from=build --chown=node:node /src/.sites-runtime/portable-build/.next/static ./.sites-runtime/portable-build/.next/static
COPY --from=build --chown=node:node /src/public ./.sites-runtime/portable-build/public
COPY --chown=node:node portable ./portable
COPY --chown=node:node drizzle ./drizzle
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", ".sites-runtime/portable-build/server.js"]
