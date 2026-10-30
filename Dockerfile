# The build stages produce platform-independent JavaScript, so they run on the
# build platform and only the runtime stages are built for the target platform.
FROM --platform=$BUILDPLATFORM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --global "pnpm@$(node -p 'require("./package.json").devEngines.packageManager.version')"
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile --ignore-scripts

FROM dependencies AS api-build
RUN pnpm exec vp run @appligator/api#build
RUN pnpm deploy --filter @appligator/api --prod /deploy

FROM dependencies AS web-build
RUN pnpm exec vp run @appligator/web#build

FROM node:24-alpine AS api
ENV HOST=0.0.0.0
WORKDIR /app
COPY --from=api-build /deploy/package.json ./
COPY --from=api-build /deploy/node_modules ./node_modules
COPY --from=api-build /app/apps/api/dist ./dist
COPY apps/api/drizzle ./drizzle
USER node
EXPOSE 3000
CMD ["node", "dist/server.mjs"]

FROM nginx:stable-alpine AS web
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
