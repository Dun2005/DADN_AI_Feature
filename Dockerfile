FROM python:3.12-slim

# Install system dependencies required for OpenCV, PyAudio, and other libraries
RUN apt-get update && apt-get install -y \
    gcc \
    git \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    portaudio19-dev \
    python3-dev \
    alsa-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose web dashboard port
EXPOSE 8000

# Run the application
CMD ["python", "main.py"]
