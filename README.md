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
docker run --rm -p 3000:80 router-demo

# The application will be available at http://localhost:3000
```

### Option 3: Production deployment

```bash
# Build the image for production
docker build -t router-demo:latest .

# Start with a custom runtime configuration
docker run -d \
  -p 80:80 \
  -e NODE_ENV=production \
  -v $(pwd)/.env.js:/usr/share/nginx/html/env.js:ro \
  --name router-demo \
  router-demo:latest
```

## Runtime Configuration

Configuration is loaded at **runtime** from `/env.js` (not at build time). The file is plain JavaScript that must set a global `config` object. See [`.env.example.js`](./.env.example.js) for the full template:

```js
var config = {
    "ROUTER_API_KEY": "demo",
    "ROUTER_API_BUILD_URL": "https://router.cartoway.com",
    "ROUTER_API_RUNTIME_URL": "https://router.cartoway.com",
    "ENABLED_TRANSPORT_MODES": ["car", "cargo_ebike", "scooter", "van", "truck_19"],
    "ACTIVE_TRANSPORT_MODES": ["car", "cargo_ebike"],
    "GEOCODER_API_URL": "https://geocoder.cartoway.com",
    "GEOCODER_API_KEY": "demo",
    "ISOLINE_MAX_PROFILES": 6,
};
```

- Local development: copy `.env.example.js` to `.env.js` and adjust. The dev server serves it at `/env.js` and `vite build` copies it to `dist/env.js`.
- Docker: mount your configuration over the baked-in one (no rebuild needed):

```bash
docker run -v $(pwd)/.env.js:/usr/share/nginx/html/env.js:ro ...
```

All keys are optional; sensible defaults apply when omitted.

## Configuration Keys

- `ROUTER_API_BUILD_URL`: Router API base URL used by `scripts/sync-router-modes.mjs` (build-time mode sync)
- `ROUTER_API_RUNTIME_URL`: Router API base URL used by the app in the browser (defaults to https://router.cartoway.com)
- `ROUTER_API_KEY`: Router API key (defaults to 'demo')
- `ENABLED_TRANSPORT_MODES`: Array of transport modes displayed in the interface, controlling the available options for selection and their order. The following modes are available: `car`, `cargo_ebike`, `scooter`, `van`, `truck_75`, `truck_10`, `truck_12`, `truck_19`, `truck_26`, `truck_32`, `truck_44`, `bicycle`, `ebike`, `foot`. When omitted, all modes reported by the Router API are enabled. For a complete list of modes, refer to the Router API at https://router.cartoway.com/0.1/capability.
- `ACTIVE_TRANSPORT_MODES`: Array of transport modes pre-selected when the application starts. Must be a subset of `ENABLED_TRANSPORT_MODES`. Default: `["car", "cargo_ebike"]`
- `GEOCODER_API_URL`: Geocoder API base URL
- `GEOCODER_API_KEY`: Geocoder API key
- `ISOLINE_MAX_PROFILES`: Maximum number of isoline profiles (defaults to 6)

## Health Check

The application exposes a health endpoint at `/health` for availability checks.

## Support

For any questions or issues, please open an issue on the repository.
