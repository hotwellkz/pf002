FROM node:20-alpine

WORKDIR /app

# Устанавливаем зависимости для сборки
COPY package*.json ./
RUN npm ci

# Копируем исходники и собираем
COPY . .
RUN npm run build

# Удаляем dev зависимости
RUN npm ci --only=production && npm cache clean --force

EXPOSE 3000

CMD ["node", "dist/index.js"]

