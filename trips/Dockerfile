# Use Node.js base image
FROM node:22

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build TypeScript files
RUN npm run build

# Expose the application's port
EXPOSE 3003

# Start the application
CMD ["npm", "run", "start"]
