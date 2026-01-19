<p align="center">
  <img src="logo.png" alt="The Lion's Den" width="200">
</p>

<h1 align="center">The Lion's Den</h1>

<p align="center">
  <strong>A custom Homepage dashboard for self-hosted services</strong>
</p>

<p align="center">
  <a href="https://gethomepage.dev/"><img src="https://img.shields.io/badge/Homepage-v0.10+-blue?style=flat-square" alt="Homepage"></a>
  <a href="#license"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License"></a>
  <a href="#services"><img src="https://img.shields.io/badge/Services-45+-orange?style=flat-square" alt="Services"></a>
  <a href="https://github.com/LionCityGaming/homepage/commits/main"><img src="https://img.shields.io/github/last-commit/LionCityGaming/homepage?style=flat-square" alt="Last Commit"></a>
  <a href="https://github.com/LionCityGaming/homepage"><img src="https://img.shields.io/github/repo-size/LionCityGaming/homepage?style=flat-square" alt="Repo Size"></a>
  <a href="https://github.com/LionCityGaming/homepage/stargazers"><img src="https://img.shields.io/github/stars/LionCityGaming/homepage?style=flat-square" alt="Stars"></a>
</p>

---

## Table of Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Services](#services)
- [Custom Widgets](#custom-widgets)
- [File Structure](#file-structure)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)
- [License](#license)

---

## Screenshots

<details open>
<summary><strong>Home</strong></summary>
<br>
<img src="home.png" alt="Home Tab" width="800">
</details>

<details open>
<summary><strong>Calendars</strong></summary>
<br>
<img src="calendars.png" alt="Calendars Tab" width="800">
</details>

<details open>
<summary><strong>Applications</strong></summary>
<br>
<img src="applications.png" alt="Applications Tab" width="800">
</details>

---

## Features

| Feature | Description |
|---------|-------------|
| **3 Tab Layout** | Home, Calendars, Applications |
| **45+ Services** | Media, networking, productivity, monitoring |
| **Custom Theme** | Dark emerald with custom CSS |
| **Home Assistant** | Embedded dashboards and device status |
| **Custom Widgets** | Currency exchange, upcoming games, media stats |
| **Secure Config** | All secrets in environment variables |

---

## Prerequisites

Before you begin, ensure you have:

| Requirement | Version | Notes |
|-------------|---------|-------|
| [Homepage](https://gethomepage.dev/) | v0.8+ | Dashboard framework |
| [Docker](https://www.docker.com/) | 20.10+ | Container runtime |
| [Docker Compose](https://docs.docker.com/compose/) | v2.0+ | Container orchestration |
| API Access | — | Enable API keys for each service |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/LionCityGaming/homepage.git
cd homepage

# Create your environment file
cp .env.example .env

# Edit .env with your API keys, URLs, and passwords
nano .env  # or use your preferred editor

# Copy files to your Homepage config directory
cp *.yaml /path/to/homepage/config/
cp custom.css custom.js /path/to/homepage/config/
```

---

## Services

<details>
<summary><strong>Media Management</strong></summary>

| Service | Description |
|---------|-------------|
| [Plex](https://www.plex.tv/) | Media server for streaming movies, TV shows, and music |
| [Tautulli](https://tautulli.com/) | Plex monitoring and statistics dashboard |
| [Sonarr](https://sonarr.tv/) | Automated TV show downloading and management |
| [Radarr](https://radarr.video/) | Automated movie downloading and management |
| [Bazarr](https://www.bazarr.media/) | Automatic subtitle downloading for Sonarr and Radarr |
| [Prowlarr](https://prowlarr.com/) | Indexer manager and proxy for the *arr stack |
| [SABnzbd](https://sabnzbd.org/) | Usenet binary newsreader for automated downloads |
| [Jellyseerr](https://github.com/Fallenbagel/jellyseerr) | Media request and discovery platform for Plex |
| [Audiobookshelf](https://www.audiobookshelf.org/) | Self-hosted audiobook and podcast server |
| [Dispatcharr](https://github.com/Dispatcharr/Dispatcharr) | IPTV proxy and stream management |
| [TitleCardMaker](https://github.com/CollinHeist/TitleCardMaker) | Automated title card generation for TV shows |
| [Maintainerr](https://github.com/jorenn92/Maintainerr) | Automated media cleanup and library maintenance |
| [RomM](https://github.com/rommapp/romm) | ROM management and organization for retro gaming |

</details>

<details>
<summary><strong>Home & Monitoring</strong></summary>

| Service | Description |
|---------|-------------|
| [Home Assistant](https://www.home-assistant.io/) | Open-source home automation platform |
| [Proxmox](https://www.proxmox.com/) | Enterprise virtualization platform for VMs and containers |
| [Synology DSM](https://www.synology.com/) | Network attached storage with DSM operating system |
| [Scrutiny](https://github.com/AnalogJ/scrutiny) | Hard drive S.M.A.R.T. monitoring and alerting |
| [WatchYourLAN](https://github.com/aceberg/WatchYourLAN) | Lightweight network device scanner and monitor |
| [Zigbee2MQTT](https://www.zigbee2mqtt.io/) | Zigbee to MQTT bridge for smart home devices |

</details>

<details>
<summary><strong>Productivity</strong></summary>

| Service | Description |
|---------|-------------|
| [Paperless-ngx](https://docs.paperless-ngx.com/) | Document management system with OCR and tagging |
| [Mealie](https://mealie.io/) | Recipe manager and meal planner with shopping lists |
| [FreshRSS](https://freshrss.org/) | Self-hosted RSS feed aggregator |
| [Linkding](https://github.com/sissbruecker/linkding) | Bookmark manager with tagging and search |
| [Booklore](https://github.com/booklore-app/booklore) | Ebook library manager and reader |
| [Shelfmark](https://github.com/calibrain/shelfmark) | Book download and metadata management |
| [Wallos](https://github.com/ellite/Wallos) | Subscription and recurring expense tracker |
| [Immich](https://immich.app/) | Self-hosted photo and video backup solution |
| [SilverBullet](https://silverbullet.md/) | Markdown-based note-taking and knowledge base |

</details>

<details>
<summary><strong>Infrastructure</strong></summary>

| Service | Description |
|---------|-------------|
| [AdGuard Home](https://adguard.com/adguard-home.html) | Network-wide DNS ad blocking and privacy protection |
| [Caddy](https://caddyserver.com/) | Modern web server with automatic HTTPS |
| [CrowdSec](https://www.crowdsec.net/) | Collaborative security engine for threat detection |
| [WG-Easy](https://github.com/wg-easy/wg-easy) | WireGuard VPN server with web-based management |
| [Komodo](https://github.com/mbecker20/komodo) | Docker container deployment and management |
| [Backrest](https://github.com/garethgeorge/backrest) | Restic-based backup solution with web UI |
| [Dozzle](https://dozzle.dev/) | Real-time Docker container log viewer |
| [File Browser](https://filebrowser.org/) | Web-based file manager for remote access |

</details>

<details>
<summary><strong>Utilities</strong></summary>

| Service | Description |
|---------|-------------|
| [Gitea](https://gitea.io/) | Lightweight self-hosted Git service |
| [Vaultwarden](https://github.com/dani-garcia/vaultwarden) | Bitwarden-compatible password manager |
| [Gotify](https://gotify.net/) | Self-hosted push notification server |
| [Apprise](https://github.com/caronc/apprise) | Universal notification service supporting 80+ platforms |
| [MeTube](https://github.com/alexta69/metube) | YouTube and other sites video downloader |
| [Zipline](https://zipline.diced.sh/) | ShareX-compatible file and image hosting |
| [Code-server](https://github.com/coder/code-server) | VS Code running in the browser |
| [Profilarr](https://github.com/Dictionarry-Hub/profilarr) | Quality profile sync for Sonarr and Radarr |

</details>

---

## Custom Widgets

This dashboard includes several custom API widgets that extend Homepage's functionality:

| Widget | Description | Refresh Rate |
|--------|-------------|--------------|
| **Currency Exchange** | Real-time SGD exchange rates (MYR, USD, EUR, JPY) | 1 hour |
| **Upcoming PC Games** | Next 15 PC game releases from custom API | 24 hours |
| **Recently Downloaded** | Latest movies and TV episodes from Tautulli | 5 minutes |
| **Backrest Stats** | Last backup date, status, and data processed | 30 minutes |
| **Dispatcharr Stats** | Active streams, total channels, VOD content | 1 minute |
| **Linkding Stats** | Bookmark counts (total, active, archived, tags) | 5 minutes |
| **Maintainerr Stats** | Active rules and collections | 5 minutes |
| **MeTube Stats** | Download queue status | 5 minutes |
| **Steam Stats** | Games owned, total playtime, most played | 10 minutes |
| **Vaultwarden Stats** | Active and total users | 10 minutes |
| **Wallos Stats** | Subscriptions, next due, monthly total | 5 minutes |
| **WatchYourLAN Stats** | Online, known, unknown, and total devices | 1 minute |
| **Zigbee2MQTT Stats** | Device counts and battery status | 5 minutes |
| **Zipline Stats** | File count and storage usage | 5 minutes |

---

## File Structure

```
├── services.yaml      # Service definitions with widgets
├── settings.yaml      # Layout, theme, and display settings
├── widgets.yaml       # Header widgets (logo, datetime, resources)
├── custom.css         # Custom styling and theme overrides
├── custom.js          # Custom JavaScript
└── .env.example       # Template for environment variables
```

---

## Environment Variables

All sensitive data uses the `HOMEPAGE_VAR_` prefix pattern:

| Pattern | Example | Description |
|---------|---------|-------------|
| `HOMEPAGE_VAR_{SERVICE}_API_KEY` | `HOMEPAGE_VAR_SONARR_API_KEY` | Service API keys |
| `HOMEPAGE_VAR_{SERVICE}_URL` | `HOMEPAGE_VAR_SONARR_URL` | Internal service URLs |
| `HOMEPAGE_VAR_{SERVICE}_USERNAME` | `HOMEPAGE_VAR_SYNOLOGY_USERNAME` | Service usernames |
| `HOMEPAGE_VAR_{SERVICE}_PASSWORD` | `HOMEPAGE_VAR_SYNOLOGY_PASSWORD` | Service passwords |
| `HOMEPAGE_VAR_DOMAIN` | `example.com` | Your domain name |

See [.env.example](.env.example) for the complete list of required variables.

---

## Troubleshooting

<details>
<summary><strong>Widget shows "Error" or won't load</strong></summary>

- Verify the API key is correct in your `.env` file
- Check if the service URL is accessible from the Homepage container
- Ensure the service is running and healthy
- Check Homepage logs: `docker logs homepage`

</details>

<details>
<summary><strong>Custom CSS not applying</strong></summary>

- Verify `custom.css` is in the correct config directory
- Clear your browser cache (Ctrl+Shift+R)
- Check for CSS syntax errors in the file

</details>

<details>
<summary><strong>Environment variables not working</strong></summary>

- Ensure variable names match exactly (case-sensitive)
- Restart the Homepage container after `.env` changes
- Check for trailing spaces in variable values

</details>

<details>
<summary><strong>iFrame widgets not loading</strong></summary>

- Verify the source URL allows embedding (X-Frame-Options)
- Check if the URL requires authentication
- Ensure HTTPS is used for secure contexts

</details>

<details>
<summary><strong>Service shows offline but is running</strong></summary>

- Check if `siteMonitor` URL is correct
- Verify network connectivity between containers
- Some services may need specific health check endpoints

</details>

---

## Credits

- [Homepage](https://gethomepage.dev/) — Dashboard framework
- [Homepage Discord](https://discord.gg/ppNwk9Skux) — Community support
- [selfh.st Icons](https://selfh.st/icons/) — Service icons
- [Home Assistant](https://www.home-assistant.io/) — Smart home platform
- [Shields.io](https://shields.io/) — README badges
- [r/selfhosted](https://www.reddit.com/r/selfhosted/) — Community inspiration

---

## License

This project is licensed under the MIT License.

<details>
<summary><strong>View MIT License</strong></summary>

```
MIT License

Copyright (c) 2025 LionCityGaming

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

</details>

---

<p align="center">
  <strong>Built with ❤️ in Singapore</strong>
</p>
