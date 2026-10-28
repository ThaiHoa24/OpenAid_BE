FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json prisma.config.ts .npmrc ./
COPY prisma ./prisma
RUN npm ci
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
# Keep the Prisma CLI in this prototype image so migrate:deploy can run as a one-off command.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
EXPOSE 3001
USER node
CMD ["node", "dist/main.js"]
