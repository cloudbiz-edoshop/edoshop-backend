FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN chmod +x scripts/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=9999

EXPOSE 9999

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
