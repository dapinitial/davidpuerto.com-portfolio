#!/bin/bash

set -e

echo "Pulling latest Docker image..."
docker pull registry.digitalocean.com/davidpuerto-com/myapp:latest

echo "Stopping current container..."
docker stop myapp || true
docker rm myapp || true

echo "Starting new container..."
docker run -d --name myapp -p 3000:3000 registry.digitalocean.com/davidpuerto-com/myapp:latest

echo "Deployment complete!"
