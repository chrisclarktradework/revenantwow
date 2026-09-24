# Revenant guild website

Static site for the Revenant Horde guild on WoW: Forever. Live at https://www.revenantwow.com

## Files
- `index.html` - the full site. No build step.
- `staticwebapp.config.json` - Azure Static Web Apps routing and headers.
- `revenant-banner.jpg` (hero), `revenant-crest-512.png` (crest), `revenant-icon.png` (favicon and nav) - images.

## Application form
The form posts to a Discord webhook. Set `WEBHOOK_URL` near the bottom of `index.html` to the webhook URL from Discord (Server Settings > Integrations > Webhooks).

## Deploy
Azure Static Web Apps builds from GitHub Actions on every push to `main`. App location `/`, no API, output location `/`.

## DNS (Network Solutions)
- `www` CNAME to the Static Web App default hostname (`<app>.azurestaticapps.net`).
- Bare domain: web forwarding to `https://www.revenantwow.com`.
