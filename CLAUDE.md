# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Configuration files for a [Homepage](https://gethomepage.dev/) dashboard managing 45+ self-hosted services across Synology NAS, Proxmox, and Docker infrastructure.

## Key Files

- `services.yaml` - Service definitions organized by sections (Home, News, Calendars, Applications, etc.)
- `settings.yaml` - Layout configuration, theme settings, tab definitions
- `widgets.yaml` - Header widgets (logo, datetime, resource monitors)
- `custom.css` - Dark emerald theme with custom styling
- `.env.example` - Environment variable template (copy to `.env` with real values)

## Conventions

### Icons
- Use selfh.st CDN: `https://cdn.jsdelivr.net/gh/selfhst/icons/webp/{name}.webp`
- Prefer `.webp` format
- Local icons (`/images/icons/`) only for services without selfh.st icons

### URLs in services.yaml
- **Never hardcode** IPs, domains, or personal URLs
- Use environment variables: `{{HOMEPAGE_VAR_*}}`
- External URLs: `"https://service.{{HOMEPAGE_VAR_DOMAIN}}"`
- Internal URLs: `"{{HOMEPAGE_VAR_SERVICE_URL}}"`

### Environment Variable Naming
| Type | Pattern | Example |
|------|---------|---------|
| API keys | `HOMEPAGE_VAR_{SERVICE}_API_KEY` | `HOMEPAGE_VAR_SONARR_API_KEY` |
| URLs | `HOMEPAGE_VAR_{SERVICE}_URL` | `HOMEPAGE_VAR_SONARR_URL` |
| Stats APIs | `HOMEPAGE_VAR_{SERVICE}_STATS_URL` | `HOMEPAGE_VAR_STEAM_STATS_URL` |
| Passwords | `HOMEPAGE_VAR_{SERVICE}_PASSWORD` | `HOMEPAGE_VAR_SYNOLOGY_PASSWORD` |
| Usernames | `HOMEPAGE_VAR_{SERVICE}_USERNAME` | `HOMEPAGE_VAR_SYNOLOGY_USERNAME` |

## Widget Types

### Official Homepage Widgets
Most services use built-in Homepage widgets (sonarr, radarr, plex, tautulli, etc.). Check [Homepage docs](https://gethomepage.dev/widgets/) for supported services.

### Custom API Widgets
Some services use `customapi` widget type with custom proxy endpoints:
- Currency exchange, upcoming games, recently downloaded media
- Stats for: Backrest, Dispatcharr, Linkding, Maintainerr, MeTube, Steam, Vaultwarden, Wallos, WatchYourLAN, Zigbee2MQTT, Zipline

## Infrastructure

| Host | IP | Services |
|------|-----|----------|
| Synology NAS | 192.168.1.69 | AdGuard, SABnzbd, Scrutiny, Docker host |
| Proxmox VM | 192.168.1.77 | Home Assistant |
| Proxmox VM | 192.168.1.120 | Plex |
| Docker | DNS names | Most services (e.g., `http://sonarr:8989`) |

## Adding a New Service

1. Add entry to appropriate section in `services.yaml`
2. Use selfh.st icon if available
3. Add any new environment variables to both `.env` and `.env.example`
4. Use official Homepage widget if supported, otherwise `customapi`
