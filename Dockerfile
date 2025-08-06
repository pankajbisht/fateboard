FROM node:21

WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Build the Vite app
# RUN npm run build
RUN npm run build:no-check

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
