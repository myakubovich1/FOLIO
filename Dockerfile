FROM node:22.17-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:22.17-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3100
COPY --from=build --chown=node:node /app /app
RUN mkdir -p .data && chown node:node .data
USER node
EXPOSE 3100
CMD ["npm", "start"]
