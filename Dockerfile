# Same Node as .nvmrc / package.json engines
FROM node:26.13.0-slim

WORKDIR /app

# Copy and install dependencies
COPY package*.json .npmrc ./
RUN npm ci

# Copy all project files
COPY . .

# Build the Vite app
RUN npm run build

# Expose Vite's preview server port
EXPOSE 4173

# Run Vite preview in production
# CMD ["npm", "run", "preview"]
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]


# FROM node:21
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# # Comment out the build for now
# # RUN npm run build
# CMD ["sh"]
