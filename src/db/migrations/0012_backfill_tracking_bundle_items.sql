INSERT INTO tracking_bundle_items (bundle_id, order_id, created_at)
SELECT DISTINCT
  tb.id,
  o.id,
  NOW()
FROM tracking_bundles tb
INNER JOIN tracking_steps ts ON ts.id = tb.current_step_id
INNER JOIN bundles sb ON sb.id = tb.source_bundle_id
INNER JOIN series s ON s.bundle_id = sb.id
INNER JOIN items i ON i.series_id = s.id
INNER JOIN variants v ON v.item_id = i.id
INNER JOIN order_items oi ON oi.variant_id = v.id
INNER JOIN orders o ON o.id = oi.order_id
WHERE ts.step_order >= 7
ON CONFLICT DO NOTHING;
