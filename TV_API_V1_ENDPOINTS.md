# EDOSHOP TV API v1 Update

A dedicated TV API endpoint has been prepared for the EDOSHOP TV Magazine application.

## Base URL

https://tv.edoshop.online/api/v1

## TV Client Endpoints

- POST /auth/token
- POST /auth/refresh
- GET /magazine/version
- GET /magazine/feed

## Authentication

The TV app uses device-specific authentication.

Each TV device receives:
- deviceKey
- deviceSecret

The authentication endpoint returns a short-lived access token and refresh token.

Protected endpoints require:

Authorization: Bearer <accessToken>

## Security

- No shared permanent API key is used.
- Device access can be disabled or revoked individually.
- Refresh tokens are rotated.
- TV access is read-only.
- Customer, order, payment, admin, and employee data are not exposed to the TV app.

## Deployment

The TV API is deployed separately from the main EDOSHOP API at:

https://tv.edoshop.online

The service uses the `feature/tv-api-v1` branch during testing.

## Current Status

The endpoint:

GET /api/v1/magazine/version

is reachable and correctly returns HTTP 401 when no valid TV device token is supplied.

This confirms the domain, routing, backend service, and TV authentication middleware are working.

The next step is to register the first TV device and validate:
- device authentication
- token refresh
- magazine version retrieval
- magazine feed retrieval
- device revocation
