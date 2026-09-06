# syntax=docker/dockerfile:1
#
# Two stages: build the React frontend, then run the Express server with the
# built frontend copied in. The server serves client/dist itself (there is no
# nginx in the cloud deployment - see server/src/index.js).

# ---- stage 1: build the frontend --------------------------------------------
# No NODE_ENV here, so `npm ci` installs devDependencies (Vite is one).
FROM node:22-slim AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
# produces /app/client/dist
RUN npm run build

# ---- stage 2: the server ---------------------------------------------------
FROM node:22-slim
# NODE_ENV=production -> npm ci installs prod deps only; app enables trust proxy
# + Secure cookie. HOST=0.0.0.0 so the platform's router can reach the process.
ENV NODE_ENV=production
ENV HOST=0.0.0.0
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
# the built frontend, served by Express (src/index.js -> ../../client/dist)
COPY --from=client /app/client/dist /app/client/dist
EXPOSE 3000
CMD ["node", "src/index.js"]
