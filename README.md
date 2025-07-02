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
- `VITE_ROUTER_API_URL`: Router API base URL (defaults to https://router.cartoway.com)
- `VITE_ROUTER_API_KEY`: Router API key (defaults to 'demo')
- `VITE_ENABLED_TRANSPORT_MODES`: A comma-separated list of transport modes to be displayed in the interface, controlling the available options for selection. The following modes are available: `car`, `cargo_bike`, `scooter`, `van`, `truck_19`, `truck_75`, `truck_12`, `truck_26`, `truck_32`, `truck_44`, `bicycle`, `foot`. The default value is `car,cargo_bike,scooter,van,truck_19`. For a complete list of modes, refer to the Router API at https://router.cartoway.com/0.1/capability.
- `VITE_ACTIVE_TRANSPORT_MODES`: Comma-separated list of transport modes to pre-select when the application starts. These modes will be automatically selected in the interface. Must be a subset of `VITE_ENABLED_TRANSPORT_MODES`. Default: `car,cargo_bike`

## Health Check

The application exposes a health endpoint at `/health` for availability checks.

## Support

For any questions or issues, please open an issue on the repository.
