<p align="center">
  <img src="logo.png" alt="The Lion's Den" width="200">
</p>

<h1 align="center">The Lion's Den</h1>

<p align="center">
  <strong>A custom Homepage dashboard for self-hosted services</strong>
</p>

<p align="center">
  <a href="https://gethomepage.dev/"><img src="https://img.shields.io/badge/Homepage-v0.10-blue?style=flat-square" alt="Homepage"></a>
  <a href="#license"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License"></a>
  <a href="#services"><img src="https://img.shields.io/badge/Services-45+-orange?style=flat-square" alt="Services"></a>
</p>

---

## Screenshots

<details open>
<summary><strong>Home</strong></summary>
<br>
<img src="home.png" alt="Home Tab" width="800">
</details>

<details>
<summary><strong>Calendars</strong></summary>
<br>
<img src="calendars.png" alt="Calendars Tab" width="800">
</details>

<details>
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
| **Secure Config** | All secrets in environment variables |

---

## Services

<details>
<summary><strong>Media Management</strong></summary>

| Service | Description |
|---------|-------------|
| Plex | Media server for streaming movies, TV shows, and music |
| Tautulli | Plex monitoring and statistics dashboard |
| Sonarr | Automated TV show downloading and management |
| Radarr | Automated movie downloading and management |
| Bazarr | Automatic subtitle downloading for Sonarr and Radarr |
| Prowlarr | Indexer manager and proxy for the *arr stack |
| SABnzbd | Usenet binary newsreader for automated downloads |
| Jellyseerr | Media request and discovery platform for Plex |
| Audiobookshelf | Self-hosted audiobook and podcast server |
| Dispatcharr | IPTV proxy and stream management |
| TitleCardMaker | Automated title card generation for TV shows |
| Maintainerr | Automated media cleanup and library maintenance |
| RomM | ROM management and organization for retro gaming |

</details>

<details>
<summary><strong>Home & Monitoring</strong></summary>

| Service | Description |
|---------|-------------|
| Home Assistant | Open-source home automation platform |
| Proxmox | Enterprise virtualization platform for VMs and containers |
| Synology NAS | Network attached storage with DSM operating system |
| Scrutiny | Hard drive S.M.A.R.T. monitoring and alerting |
| WatchYourLAN | Lightweight network device scanner and monitor |
| Zigbee2MQTT | Zigbee to MQTT bridge for smart home devices |

</details>

<details>
<summary><strong>Productivity</strong></summary>

| Service | Description |
|---------|-------------|
| Paperless-ngx | Document management system with OCR and tagging |
| Mealie | Recipe manager and meal planner with shopping lists |
| FreshRSS | Self-hosted RSS feed aggregator |
| Linkding | Bookmark manager with tagging and search |
| Booklore | Ebook library manager and reader |
| Shelfmark | Book download and metadata management |
| Wallos | Subscription and recurring expense tracker |
| Immich | Self-hosted photo and video backup solution |
| SilverBullet | Markdown-based note-taking and knowledge base |

</details>

<details>
<summary><strong>Infrastructure</strong></summary>

| Service | Description |
|---------|-------------|
| AdGuard Home | Network-wide DNS ad blocking and privacy protection |
| Caddy | Modern web server with automatic HTTPS |
| CrowdSec | Collaborative security engine for threat detection |
| WG-Easy | WireGuard VPN server with web-based management |
| Komodo | Docker container deployment and management |
| Backrest | Restic-based backup solution with web UI |
| Dozzle | Real-time Docker container log viewer |
| File Browser | Web-based file manager for remote access |

</details>

<details>
<summary><strong>Utilities</strong></summary>

| Service | Description |
|---------|-------------|
| Gitea | Lightweight self-hosted Git service |
| Vaultwarden | Bitwarden-compatible password manager |
| Gotify | Self-hosted push notification server |
| Apprise | Universal notification service supporting 80+ platforms |
| MeTube | YouTube and other sites video downloader |
| Zipline | ShareX-compatible file and image hosting |
| Code-server | VS Code running in the browser |
| Profilarr | Quality profile sync for Sonarr and Radarr |
| Steam | Gaming library statistics and tracking |
| DAPS Dashboard | Docker Auto Proxy Stack management interface |

</details>

---

## Quick Start

```bash
# Clone
git clone https://github.com/LionCityGaming/homepage.git

# Configure
cp .env.example .env
# Edit .env with your API keys, URLs, and passwords

# Deploy to your Homepage instance
```

---

## File Structure

```
services.yaml      # Service definitions with widgets
settings.yaml      # Layout, theme, and display settings
widgets.yaml       # Header widgets (logo, datetime, resources)
custom.css         # Custom styling and theme overrides
custom.js          # Custom JavaScript
.env.example       # Template for environment variables
```

---

## Environment Variables

| Pattern | Example |
|---------|---------|
| `HOMEPAGE_VAR_{SERVICE}_API_KEY` | `HOMEPAGE_VAR_SONARR_API_KEY` |
| `HOMEPAGE_VAR_{SERVICE}_URL` | `HOMEPAGE_VAR_SONARR_URL` |
| `HOMEPAGE_VAR_{SERVICE}_USERNAME` | `HOMEPAGE_VAR_SYNOLOGY_USERNAME` |
| `HOMEPAGE_VAR_{SERVICE}_PASSWORD` | `HOMEPAGE_VAR_SYNOLOGY_PASSWORD` |

---

## Credits

- [Homepage](https://gethomepage.dev/) — Dashboard framework
- [selfh.st Icons](https://selfh.st/icons/) — Service icons
- [Home Assistant](https://www.home-assistant.io/) — Smart home platform

---

## License

MIT
