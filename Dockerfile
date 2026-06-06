# Use an official Node.js runtime as the base image
FROM node:20

# Set working directory inside the container
WORKDIR /app

# Copy .npmrc to ensure GreenSock registry and token are available in the container
COPY .npmrc .npmrc

# Copy only package.json and package-lock.json for dependency caching
COPY package*.json ./

# Install dependencies only if package.json or package-lock.json changes
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Vike app with Vite
RUN npm run build

# Expose the port that the app will use
EXPOSE 3000

# Start the server with the built files
CMD ["node", "server"]
