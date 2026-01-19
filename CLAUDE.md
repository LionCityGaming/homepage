# Homepage Dashboard Configuration

This folder contains configuration files for a Homepage dashboard (https://gethomepage.dev/).

## Files

- `services.yaml` - Main service definitions with widgets, icons, and links
- `.env` - Environment variables (secrets, URLs, API keys) - DO NOT COMMIT
- `.env.example` - Template with placeholder values for sharing

## Conventions

### Icons
- Use selfh.st CDN format: `https://cdn.jsdelivr.net/gh/selfhst/icons/webp/{name}.webp`
- Prefer `.webp` format
- Local icons in `/images/icons/` for custom services only

### URLs in services.yaml
- All URLs should use environment variables: `{{HOMEPAGE_VAR_*}}`
- Never hardcode IPs, domains, or personal URLs directly
- Pattern: `"https://service.{{HOMEPAGE_VAR_DOMAIN}}"`

### Environment Variable Naming
- API keys: `HOMEPAGE_VAR_{SERVICE}_API_KEY`
- URLs: `HOMEPAGE_VAR_{SERVICE}_URL`
- Stats endpoints: `HOMEPAGE_VAR_{SERVICE}_STATS_URL`
- Passwords: `HOMEPAGE_VAR_{SERVICE}_PASSWORD`
- Usernames: `HOMEPAGE_VAR_{SERVICE}_USERNAME`

## Infrastructure

- **Synology NAS** (192.168.1.69): AdGuard, SABnzbd, Scrutiny, main Docker host
- **Proxmox**: Home Assistant (192.168.1.77), Plex (192.168.1.120)
- **Docker containers**: Most services use Docker DNS names (e.g., `http://sonarr:8989`)

## Recent Changes

See `CHANGELOG.md` for detailed history.
