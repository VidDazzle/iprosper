FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY accounts.example.yaml ./
VOLUME ["/app/data"]

# Mount your real accounts.yaml and .env at runtime, e.g.:
#   docker run -v $(pwd)/accounts.yaml:/app/accounts.yaml \
#              -v $(pwd)/data:/app/data \
#              --env-file .env iprosper-social-agent
CMD ["node", "dist/cli.js", "daemon"]
