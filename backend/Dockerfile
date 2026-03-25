# Stage 1: Build the TypeScript backend module
FROM node:alpine AS builder
WORKDIR /backend
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Create the Nakama Production Image
FROM heroiclabs/nakama:3.21.1

# We only expose 7350 for Render to route external traffic to Nakama
EXPOSE 7350

# Copy our compiled TypeScript module into Nakama's module directory
COPY --from=builder /backend/build/*.js /nakama/data/modules/

# Set the entrypoint to run the database migrations and then boot the server using Render's DB_URL
ENTRYPOINT ["/bin/sh", "-ecx", "/nakama/nakama migrate up --database.address $DB_URL && exec /nakama/nakama --name nakama1 --database.address $DB_URL --logger.level INFO --session.token_expiry_sec 7200 --metrics.prometheus_port 9100"]
