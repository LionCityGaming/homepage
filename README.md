<p align="center">
  <img src="home.png" alt="The Lion's Den Dashboard" width="800">
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

- Plex / Tautulli (streaming & analytics)
- Sonarr, Radarr, Bazarr (TV, movies, subtitles)
- Prowlarr (indexers)
- SABnzbd (downloads)
- Jellyseerr (requests)
- Audiobookshelf (audiobooks)
- Dispatcharr (IPTV)

</details>

<details>
<summary><strong>Home & Monitoring</strong></summary>

- Home Assistant (smart home)
- Proxmox (virtualization)
- Synology NAS (storage)
- Scrutiny (disk health)
- WatchYourLAN (network devices)

</details>

<details>
<summary><strong>Productivity</strong></summary>

- Paperless-ngx (documents)
- Mealie (recipes)
- FreshRSS (news)
- Linkding (bookmarks)
- Booklore (ebooks)
- Wallos (subscriptions)
- Immich (photos)

</details>

<details>
<summary><strong>Infrastructure</strong></summary>

- AdGuard Home (DNS)
- Caddy (reverse proxy)
- CrowdSec (security)
- WireGuard (VPN)
- Komodo (containers)
- Backrest (backups)

</details>

<details>
<summary><strong>Utilities</strong></summary>

- Gitea, Vaultwarden, Gotify, MeTube, Zipline, and more

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
