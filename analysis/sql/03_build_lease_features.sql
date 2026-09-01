-- Builds analysis.lease_features: one row per lease with the leased
-- motorcycle model plus delinquency signals derived from the full
-- collection-status history (status_records_statusrecord), not from
-- fees_fees.paid — that column turned out to be unused in production
-- (always false/NULL for every fee row).
--
-- Run after raw.* has been populated (see scripts/02_generate_schema.py).

CREATE SCHEMA IF NOT EXISTS analysis;
DROP TABLE IF EXISTS analysis.lease_features CASCADE;

CREATE TABLE analysis.lease_features AS
WITH prod AS (
  SELECT
    id,
    upper(trim(name)) AS model_norm,
    upper(trim(brand)) AS brand_norm,
    category_id,
    NULLIF(cash_price,'')::numeric AS cash_price,
    NULLIF(lease_price,'')::numeric AS lease_price
  FROM raw.products_product
),
status_agg AS (
  SELECT
    lease_id,
    count(*) FILTER (WHERE type = 'collection status') AS n_collection_events,
    count(*) FILTER (WHERE type = 'collection status' AND status NOT IN ('OK','ok','')) AS n_negative_events,
    count(*) FILTER (WHERE status = 'BREACHES_PROMISE_OF_PAYMENT') AS n_breach_events,
    count(*) FILTER (WHERE status IN ('SUED','FISCALIA','EXTERNAL_MANAGEMENT')) AS n_severe_events,
    count(*) FILTER (WHERE status = 'NO_RESPONSE') AS n_no_response_events,
    max(created_at) AS last_status_at
  FROM raw.status_records_statusrecord
  GROUP BY lease_id
)
SELECT
  l.id AS lease_id,
  l.status AS lease_status,
  NULLIF(l.collection_status,'') AS collection_status_current,
  l.product_id,
  p.model_norm,
  p.brand_norm,
  p.category_id,
  p.cash_price,
  p.lease_price,
  NULLIF(l.monthly_fee,'')::numeric AS monthly_fee,
  NULLIF(l.initial_fee,'')::numeric AS initial_fee,
  NULLIF(l.fees_number,'')::numeric AS fees_number,
  l.location,
  l.payment_type,
  l.lease_reason,
  NULLIF(l.created_at,'')::timestamptz AS created_at,
  l.user_id,
  l.rider_id,
  COALESCE(sa.n_collection_events,0) AS n_collection_events,
  COALESCE(sa.n_negative_events,0) AS n_negative_events,
  COALESCE(sa.n_breach_events,0) AS n_breach_events,
  COALESCE(sa.n_severe_events,0) AS n_severe_events,
  COALESCE(sa.n_no_response_events,0) AS n_no_response_events,
  CASE WHEN COALESCE(sa.n_negative_events,0) > 0 THEN 1 ELSE 0 END AS ever_delinquent,
  CASE WHEN COALESCE(sa.n_severe_events,0) > 0 THEN 1 ELSE 0 END AS ever_severe_delinquent
FROM raw.leases_lease l
LEFT JOIN prod p ON p.id = l.product_id
LEFT JOIN status_agg sa ON sa.lease_id = l.id
WHERE l.status NOT IN ('REJECTED','ANNULLED','CANCELED','PENDING_APPROVAL','WAITING');

SELECT count(*) FROM analysis.lease_features;
