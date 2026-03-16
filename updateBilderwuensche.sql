WITH pages_with_bilderwunsch AS (
SELECT templatelinks.tl_from FROM templatelinks 
JOIN linktarget ON templatelinks.tl_target_id = linktarget.lt_id 
WHERE linktarget.lt_namespace = 10 AND linktarget.lt_title = 'Bilderwunsch/encode'
)
SELECT page.page_title, linktarget.lt_title, geo_tags.gt_lat, geo_tags.gt_lon
FROM page
JOIN pagelinks ON pagelinks.pl_from = page.page_id
JOIN linktarget ON linktarget.lt_id = pagelinks.pl_target_id
LEFT JOIN geo_tags ON geo_tags.gt_primary=1 AND geo_tags.gt_globe='earth' AND geo_tags.gt_page_id=page.page_id
WHERE page.page_id IN (SELECT tl_from FROM pages_with_bilderwunsch)
AND linktarget.lt_title LIKE 'Bilderwunsch/code%';
