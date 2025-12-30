#!/usr/bin/env python3
import re

# Читаем текущий конфиг
with open('/etc/nginx/sites-available/api.playflon.com', 'r') as f:
    content = f.read()

# Увеличиваем client_max_body_size
content = re.sub(r'client_max_body_size 50M;', 'client_max_body_size 100M;', content)

# Находим место перед 'location / {' и вставляем новые location блоки
audio_location = '''    # Audio files serving
    location ^~ /audio/ {
        proxy_pass http://10.9.0.2:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_set_header Range $http_range;
        proxy_set_header If-Range $http_if_range;
        add_header Cache-Control "public, max-age=86400" always;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://10.9.0.2:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

'''

# Вставляем перед 'location / {'
content = re.sub(r'(    location / \{)', audio_location + r'\1', content)

# Сохраняем
with open('/etc/nginx/sites-available/api.playflon.com', 'w') as f:
    f.write(content)

print('Config updated successfully')

