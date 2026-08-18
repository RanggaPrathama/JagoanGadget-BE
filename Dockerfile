#Node.js 22-alpine image
FROM node:22-alpine

WORKDIR /usr/src/app

ENV CI=true

# Pin pnpm to the same major as the host lockfile to avoid frozen-lockfile mismatches.
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# cache dependencies
# --ignore-scripts: pnpm v10+ blocks native build scripts by default and our approval
# config is ignored in this container, so we skip all build scripts. @swc/core was removed
# (SWC builder disabled in nest-cli.json), so nothing functional depends on them.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prefer-offline --ignore-scripts

# Copy source code
COPY . .

# Build for production
RUN pnpm build

EXPOSE 3000

# Run the application if the container use the default command
CMD ["pnpm", "start:prod"]