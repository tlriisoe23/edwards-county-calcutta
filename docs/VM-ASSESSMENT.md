# VM portability assessment

Read-only assessment completed 2026-09-14 over authenticated Tailscale SSH.
No source, databases, services, firewall rules or public routes were changed.

## Verified host state

- Host: tanner-ai-vm, Ubuntu 26.04 LTS, four logical CPUs.
- LAN address: 192.168.4.10/24 on eth0, verified through the authenticated VM
  session; TCP port 22 is reachable from Windows. Tailscale address is
  100.76.144.61. Direct LAN SSH authentication has not yet been tested, and the
  existing SSH alias still targets Tailscale. LAN connectivity is an additional
  connection option, not a change to application exposure or authentication.
- Memory: 7.2 GiB total; approximately 3.8 GiB available at inspection.
- Root/home filesystem: 124 GB total, 83 GB available.
- Docker 29.7.2 and Compose v5.5.0 available to the SSH user.
- Node v24.19.0 runs from /home/tanner/.nvm/versions/node/v24.19.0/bin/node;
  Node is not on the noninteractive SSH PATH. Production containers should carry
  their own pinned runtime rather than depend on the user's shell setup.
- /home/tanner/development is writable. Its WORKSPACE.md requires independent
  repositories, data and deployment lifecycles.
- Existing workloads include WordPress/MariaDB and preview gateway containers,
  Fairway Ops, Golf Management Modern, Cloudflare Tunnel and Tailscale.
- Existing listeners include 8080, 8081, 8099, 5198 and Tailscale-only 8370.
  Ports 5181 and 5182 were absent from the listener snapshot; recheck before use.
- The proposed application directories below do not yet exist.

## Proposed isolated deployment

| Application | New repository directory | Initial binding |
|---|---|---|
| Calcutta | /home/tanner/development/edwards-county-calcutta | 127.0.0.1:5181 |
| Leaderboard | /home/tanner/development/ecgc-leaderboard | 127.0.0.1:5182 |

Use independent Compose projects, images, persistent database volumes and backup
locations. Inspect via SSH forwarding initially. Do not add either application
to the existing WordPress Compose project or reuse its database.

The host has capacity to begin a small isolated rehearsal. This is a point-in-time
resource assessment, not a load test or production capacity guarantee. Build and
test one application at a time and measure memory/CPU under representative polling
and concurrent edits.

## Next implementation work

Follow each application's PORTABILITY.md. First verify a production Node/container
framework target locally, then adapt D1 storage with equivalent atomic behavior
and add verified standalone sign-in. Calcutta's Sites identity headers and the
leaderboard's local-host operator restriction are not standalone authentication.

Keep all implementation and synthetic-data verification separate from the current
review databases. Then rehearse a complete backup restore on a second instance
before migrating owner data.

Public domains, authentication provider credentials, TLS routing and backup
destination/retention remain to be configured. An active Cloudflare Tunnel does
not establish available DNS routes or authorization to reuse its access policies.
No tunnel credentials were read. No public routing or restore test was performed.

The VM assessment is complete. Portable implementation, data migration and hosted
validation remain pending.
