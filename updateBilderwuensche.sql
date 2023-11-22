SELECT CONCAT(page.page_title, char(9), pagelinks.pl_title, char(9), geo_tags.gt_lat, char(9), geo_tags.gt_lon)
FROM pagelinks JOIN page ON pagelinks.pl_from = page.page_id
LEFT JOIN geo_tags ON geo_tags.gt_primary=1 AND geo_tags.gt_globe='earth' AND geo_tags.gt_page_id=page.page_id
WHERE page.page_id IN (SELECT cl_from FROM categorylinks WHERE cl_to LIKE 'Wikipedia:Bilderwunsch%')
AND pagelinks.pl_title LIKE 'Bilderwunsch/code%';
