FROM node:18-slim

# Set the working directory
WORKDIR /app

# Copy package definition and install dependencies first
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Generate Prisma client (will use the existing schema)
RUN npx prisma generate

# Make the custom start script executable
RUN chmod +x ./start.sh

# By default run the custom start script which runs migrations and the dev server
CMD ["./start.sh"]
