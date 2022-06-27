FROM node:16-alpine

RUN apk --no-cache add curl
RUN curl -f https://get.pnpm.io/v6.32.js | node - add --global pnpm

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --production=false --frozen-lockfile

COPY . .
RUN pnpm run build

ENV DRIVE_DATA /home/node/data

USER node
RUN mkdir -p "$DRIVE_DATA"

EXPOSE 8000
CMD ["node", "dist/index.js"]
