# Use the official Node.js image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Accept build arguments
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ADMIN
ARG NEXT_PUBLIC_API_USERNAME
ARG NEXT_PUBLIC_API_PASSWORD

# Set them as environment variables so Next.js can access them during build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ADMIN=$NEXT_PUBLIC_ADMIN
ENV NEXT_PUBLIC_API_USERNAME=$NEXT_PUBLIC_API_USERNAME
ENV NEXT_PUBLIC_API_PASSWORD=$NEXT_PUBLIC_API_PASSWORD

# Build the Next.js app (this is where NEXT_PUBLIC_* vars get baked in)
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Start the app
CMD ["npm", "start"]