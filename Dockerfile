# syntax=docker/dockerfile:1
#
# Two stages: build the React frontend, then run the Express server with the
# built frontend copied in. The server serves client/dist itself (there is no
# nginx in the cloud deployment — see server/src/index.js).

# ---- stage 1: build the frontend ----------------------------------------------
# No NODE_ENV here, so `npm ci` installs devDependencies (Vite is one).
FROM node:22-slim AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build          # -> /app/client/dist

# ---- stage 2: the server -----------------------------------------------------
FROM node:22-slim
ENV NODE_ENV=production
ENV HOST=0.0.0.0            # the platform's router must reach the process
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev      # express, express-session, bcryptjs, @libsql/client
COPY server/ ./
COPY --from=client /app/client/dist /app/client/dist
EXPOSE 3000
CMD ["node", "src/index.js"]
