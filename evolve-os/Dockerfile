# Evolve AI OS — control plane image
# Multi-stage: build with devDeps, run lean. Runs as non-root.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY test ./test
RUN npm run build && node --test dist/test/*.test.js

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# The core has no runtime deps, so we copy only compiled output.
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.EVOLVE_PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--enable-source-maps", "dist/src/server.js"]
