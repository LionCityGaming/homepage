# Homepage Configuration Changelog

## 2026-01-19 - Configuration Cleanup & Standardization

### Icons Standardized
- Updated all service icons to use selfh.st CDN format: `https://cdn.jsdelivr.net/gh/selfhst/icons/webp/{name}.webp`
- Converted `.svg` and `.png` icons to `.webp` where available
- Local icons kept for custom services: `singapore-dollar.png`, `tcm.png`, `daps.png`, `mavis.png`

### URLs Converted to Environment Variables
Hardcoded URLs moved to `.env` variables for easier configuration:

**Synology Services (192.168.1.69):**
- `HOMEPAGE_VAR_ADGUARD_URL`
- `HOMEPAGE_VAR_SABNZBD_URL`
- `HOMEPAGE_VAR_SCRUTINY_URL`
- `HOMEPAGE_VAR_SYNOLOGY_URL`

**Proxmox VMs:**
- `HOMEPAGE_VAR_HOME_ASSISTANT_INTERNAL_URL`
- `HOMEPAGE_VAR_PLEX_INTERNAL_URL`

**Stats Proxy URLs:**
- `HOMEPAGE_VAR_BOOKLORE_STATS_URL`
- `HOMEPAGE_VAR_DISPATCHARR_STATS_URL`
- `HOMEPAGE_VAR_LINKDING_STATS_URL`
- `HOMEPAGE_VAR_MAINTAINERR_STATS_URL`
- `HOMEPAGE_VAR_METUBE_STATS_URL`
- `HOMEPAGE_VAR_STEAM_STATS_URL`
- `HOMEPAGE_VAR_VAULTWARDEN_STATS_URL`
- `HOMEPAGE_VAR_WATCHYOURLAN_STATS_URL`
- `HOMEPAGE_VAR_ZIGBEE2MQTT_STATS_URL`

### Personal URLs Hidden for GitHub Sharing
New variables added to hide personal information:
- `HOMEPAGE_VAR_GITEA_REPO_PATH` - Gitea repository path
- `HOMEPAGE_VAR_GITHUB_REPO_URL` - GitHub repository URL
- `HOMEPAGE_VAR_MAVIS_LMS_URL` - Learning platform URL
- `HOMEPAGE_VAR_SMLIGHT_URL` - Zigbee coordinator hostname
- `HOMEPAGE_VAR_STEAM_PROFILE_URL` - Steam profile URL

### Files Created/Updated
- `services.yaml` - All icons and URLs now use environment variables
- `.env` - Cleaned up, removed 49 unused variables
- `.env.example` - Created with placeholder values for GitHub sharing

### Removed Unused Variables
Cleaned up variables not referenced in services.yaml:
- Account IDs: Cloudflare, Steam
- API Keys: Authentik, Cloudflare, Lidarr, Mylar, Overseerr, Palworld, Portainer, Readarr, Scrutiny, Syncthing, Tube Archivist, Watchtower
- Calendar URLs: All Google Calendar variables
- IP Addresses: LOCAL_IP, PC_IP, PROXMOX_HA_IP, PROXMOX_PLEX_IP
- Passwords: Calibre Web, Kavita, Komga, Myspeed
- Service URLs: Calibre Web, Gitea, Kavita, Lidarr, Netalertx, Readarr
- Usernames: Calibre Web, Kavita, Komga
- Widget URLs: Chelsea, EPL, Weather

### For GitHub
Add to `.gitignore`:
```
.env
```
Commit only:
- `services.yaml`
- `.env.example`
