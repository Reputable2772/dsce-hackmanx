FROM docker.io/library/python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system utilities for network inspection and proc metrics
RUN apt-get update && apt-get install -y --no-install-recommends \
    iputils-ping \
    procps \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose Streamlit dashboard port
EXPOSE 8501

# Default test command
CMD ["pytest", "tests/", "-v"]
