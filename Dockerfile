# UniArchive — Backend Flask
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dépendances d'abord (cache des couches Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 120 -r requirements.txt

# Code applicatif
COPY . .

# Entrypoint exécutable
RUN chmod +x docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
