WITH pages_with_bilderwunsch AS (
  SELECT categorylinks.cl_from AS page_id FROM categorylinks 
  JOIN linktarget ON categorylinks.cl_target_id = linktarget.lt_id
  WHERE linktarget.lt_namespace = 14 AND linktarget.lt_title LIKE 'Wikipedia:Bilderwunsch%'
)
SELECT page.page_title, linktarget.lt_title, geo_tags.gt_lat, geo_tags.gt_lon
FROM page
JOIN pagelinks ON pagelinks.pl_from = page.page_id
JOIN linktarget ON linktarget.lt_id = pagelinks.pl_target_id
LEFT JOIN geo_tags ON geo_tags.gt_primary=1 AND geo_tags.gt_globe='earth' AND geo_tags.gt_page_id=page.page_id
WHERE page.page_id IN (SELECT page_id FROM pages_with_bilderwunsch)
AND linktarget.lt_title LIKE 'Bilderwunsch/code%';
