# Cost and service activation model

## Current assumption

Local development uses installed tooling and synthetic fixtures. The approved GitHub remote and the confirmed non-production Supabase staging project are active for version control and database validation, without an authorized production rollout or paid-service activation. No paid tier, production connector, notification provider, extraction provider, custom domain, or production resource has been activated.

P2 Contracts acceptance used only the existing no-spend staging database/Auth allocation and a synthetic agreement/master-data fixture. It did not create a document bucket, invoke scanning/extraction, enable a paid Auth feature, or connect a live provider, so it adds no approved recurring service cost.

P3 Programs/Parts acceptance also used only the existing no-spend staging allocation and clearly synthetic retained master-data records. It added no provider, Storage object, paid Auth control, deployment, or recurring service cost.

For a low-usage production pilot, the currently verified base estimate is about **US$30 per month**:

- Supabase Pro starts at US$25 per month.
- Cloudflare Workers Paid has a US$5 per month account minimum.

The current no-spend Supabase staging project supports the tested one-hour JWT, refresh rotation, public-signup denial, email confirmation, and basic TOTP boundary. Supabase documents time-boxed/inactivity/single-session controls and leaked-password protection as Pro-plan features; they remain unactivated until the production plan and spend are approved. They are included in the US$25 Pro base assumption above rather than treated as a separate provider charge.

This estimate excludes database/compute/storage/egress overages, domain registration, licensed vehicle-volume data, email or SMS delivery, document scanning/extraction, enterprise SSO, support, and regional/compliance options. These are approval-gated because their price and architecture depend on the selected provider and customer requirements.

Primary pricing references, verified 2026-08-21:

- https://supabase.com/pricing
- https://developers.cloudflare.com/workers/platform/pricing/

## Activation controls

Before any paid activation, record the chosen plan, region, included quotas, overage rates, spend alerts/caps, log sampling, backup features, retention, owner, and cancellation path. Revalidate published pricing at the time of purchase; this document is an estimate, not a supplier quote.
