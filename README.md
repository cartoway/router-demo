# Router Demo

Multi-modal route calculator with French and English support.

## Docker Deployment

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd router-demo

# Start the application
docker-compose up -d

# The application will be available at http://localhost:3000
```

### Option 2: Docker directly

```bash
# Build the image
docker build -t router-demo .

# Start the container
docker run -d -p 3000:80 --name router-demo router-demo

# The application will be available at http://localhost:3000
```

### Option 3: Production deployment

```bash
# Build the image for production
docker build -t router-demo:latest .

# Start with environment variables
docker run -d \
  -p 80:80 \
  -e NODE_ENV=production \
  --name router-demo \
  router-demo:latest
```

## Environment Variables

- `NODE_ENV`: Environment (development/production)
- `ROUTER_API_URL`: Router API base URL (defaults to https://router.cartoway.com)
- `ROUTER_API_KEY`: Router API key (defaults to 'demo')

## Health Check

The application exposes a health endpoint at `/health` for availability checks.

## Support

For any questions or issues, please open an issue on the repository.
