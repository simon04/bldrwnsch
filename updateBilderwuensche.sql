SELECT page.page_title, pagelinks.pl_title
FROM pagelinks JOIN page ON pagelinks.pl_from = page.page_id
WHERE page.page_id IN (SELECT cl_from FROM categorylinks WHERE cl_to LIKE 'Wikipedia:Bilderwunsch%')
AND pagelinks.pl_title LIKE 'Bilderwunsch/code%';
