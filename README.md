# The Lion's Den - Homepage Dashboard

A custom [Homepage](https://gethomepage.dev/) dashboard configuration for managing self-hosted services across Synology NAS and Proxmox infrastructure.

![Home Tab](home.png)
![Calendars Tab](calendars.png)
![Applications Tab](applications.png)

## Features

- **3 Tab Layout**: Home, Calendars, and Applications
- **45+ Service Integrations**: Media, networking, productivity, and monitoring tools
- **Custom Theming**: Dark emerald theme with custom CSS styling
- **Home Assistant Integration**: Embedded dashboards, calendars, and device status
- **Environment Variable Security**: All sensitive data externalized to `.env`

## Services

### Home & Monitoring
- Home Assistant (smart home control)
- Plex / Tautulli (media streaming & analytics)
- Proxmox (virtualization)
- Synology NAS (storage)

### Media Management
- Sonarr, Radarr, Bazarr (TV, movies, subtitles)
- Prowlarr (indexers)
- SABnzbd (downloads)
- Jellyseerr (requests)
- Plex / Tautulli (streaming)
- Audiobookshelf (audiobooks)
- Dispatcharr (IPTV)

### Productivity
- Paperless-ngx (documents)
- Mealie (recipes)
- FreshRSS (news)
- Linkding (bookmarks)
- Booklore (ebooks)
- Wallos (subscriptions)
- Immich (photos)

### Infrastructure
- AdGuard Home (DNS)
- Caddy (reverse proxy)
- CrowdSec (security)
- WireGuard (VPN)
- Komodo (container management)
- Backrest (backups)
- Scrutiny (disk health)

### Utilities
- Gitea, Vaultwarden, Gotify, MeTube, Zipline, and more

## File Structure

```
├── services.yaml      # Service definitions with widgets
├── settings.yaml      # Layout, theme, and display settings
├── widgets.yaml       # Header widgets (logo, datetime, resources)
├── custom.css         # Custom styling and theme overrides
├── custom.js          # Custom JavaScript (if any)
├── .env.example       # Template for environment variables
└── .env               # Your secrets (not committed)
```

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/LionCityGaming/homepage.git
   ```

2. **Create your environment file**
   ```bash
   cp .env.example .env
   ```

3. **Configure your variables** in `.env`:
   - API keys for each service
   - Your domain name
   - Internal IP addresses
   - Usernames and passwords

4. **Deploy to Homepage**
   - Copy files to your Homepage config directory
   - Or mount as a volume in Docker

## Environment Variables

All sensitive data uses the `HOMEPAGE_VAR_` prefix pattern:

| Pattern | Example |
|---------|---------|
| `HOMEPAGE_VAR_{SERVICE}_API_KEY` | `HOMEPAGE_VAR_SONARR_API_KEY` |
| `HOMEPAGE_VAR_{SERVICE}_URL` | `HOMEPAGE_VAR_SONARR_URL` |
| `HOMEPAGE_VAR_{SERVICE}_USERNAME` | `HOMEPAGE_VAR_SONARR_USERNAME` |
| `HOMEPAGE_VAR_{SERVICE}_PASSWORD` | `HOMEPAGE_VAR_SONARR_PASSWORD` |

## Icons

Icons are sourced from the [selfh.st icon repository](https://selfh.st/icons/):
```
https://cdn.jsdelivr.net/gh/selfhst/icons/webp/{name}.webp
```

## Requirements

- [Homepage](https://gethomepage.dev/) v0.8+
- Docker (recommended)
- Services configured with API access enabled

## Credits

- [Homepage](https://gethomepage.dev/) - The dashboard framework
- [selfh.st Icons](https://selfh.st/icons/) - Service icons
- [Home Assistant](https://www.home-assistant.io/) - Smart home platform

## License

MIT
