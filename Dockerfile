# Base image
FROM node:latest


# Set working directory
WORKDIR /app


# Copy package info and install dependencies
COPY package*.json ./
RUN npm install -g supervisor
RUN npm install


# Copy the rest of your files
COPY . .


# Expose the port
EXPOSE 3000


# Start the app
CMD ["node", "src/index.js"]
