# Cost and service activation model

## Current assumption

Local development uses only installed tooling and synthetic fixtures. No hosted account, paid tier, production connector, notification provider, extraction provider, custom domain, or remote repository has been activated.

For a low-usage production pilot, the currently verified base estimate is about **US$30 per month**:

- Supabase Pro starts at US$25 per month.
- Cloudflare Workers Paid has a US$5 per month account minimum.

This estimate excludes database/compute/storage/egress overages, domain registration, licensed vehicle-volume data, email or SMS delivery, document scanning/extraction, enterprise SSO, support, and regional/compliance options. These are approval-gated because their price and architecture depend on the selected provider and customer requirements.

Primary pricing references, verified 2026-08-21:

- https://supabase.com/pricing
- https://developers.cloudflare.com/workers/platform/pricing/

## Activation controls

Before any paid activation, record the chosen plan, region, included quotas, overage rates, spend alerts/caps, log sampling, backup features, retention, owner, and cancellation path. Revalidate published pricing at the time of purchase; this document is an estimate, not a supplier quote.
