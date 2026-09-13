# EDOSHOP TV API v1

Target base URL:

`https://tv.edoshop.online/api/v1`

The Roku app should keep this value as its base URL and append only the child paths below.

## TV device endpoints

### Authenticate device

`POST /auth/token`

Full URL:

`https://tv.edoshop.online/api/v1/auth/token`

Request JSON:

```json
{
  "deviceKey": "<registered-device-key>",
  "deviceSecret": "<device-secret-issued-on-registration>"
}
```

Successful response data contains:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

### Refresh device token

`POST /auth/refresh`

Full URL:

`https://tv.edoshop.online/api/v1/auth/refresh`

Request JSON:

```json
{
  "refreshToken": "..."
}
```

A successful refresh rotates the refresh token and returns a new access token + refresh token pair.

### Check magazine version

`GET /magazine/version`

Full URL:

`https://tv.edoshop.online/api/v1/magazine/version`

Header:

`Authorization: Bearer <accessToken>`

The Roku app should call this lightweight endpoint before downloading the full magazine feed.

### Download magazine feed

`GET /magazine/feed`

Full URL:

`https://tv.edoshop.online/api/v1/magazine/feed`

Header:

`Authorization: Bearer <accessToken>`

The feed is read-only and is built from existing EDOSHOP products, discounts, banners, TV ads, TV settings, and the How EDOSHOP Works video configuration.

## Admin endpoints remain under `/tv/...`

The Admin Panel/backend management routes remain unchanged, for example:

- `GET /api/v1/tv/overview`
- `GET/PATCH /api/v1/tv/settings`
- `GET/POST/PATCH/DELETE /api/v1/tv/ads...`
- `GET/POST/PATCH /api/v1/tv/devices...`
- `GET/PATCH /api/v1/tv/catalog`
- `GET /api/v1/tv/how-it-works-videos`

These routes use normal EDOSHOP admin JWT + role/permission middleware and are not Roku-device endpoints.

## Security behavior already present

- Each TV is registered as an individual device.
- Device secrets are Argon2 hashed in the database.
- Device authentication returns a short-lived 15-minute access token.
- Refresh tokens are hashed at rest and rotated on refresh.
- Disabled/revoked TVs are rejected before protected TV feed access.
- Device access scope is read-only (`tv:read`).
- No shared permanent Roku API key is used.

## Deployment note

`tv.edoshop.online` must reverse-proxy to this backend service without stripping `/api/v1`. HTTPS should terminate at Cloudflare/Traefik as already used by EDOSHOP.
