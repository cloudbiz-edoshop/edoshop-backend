INSERT INTO "entities" ("name", "description")
SELECT 'ticket_page_create', 'Ticketing — Create Ticket'
WHERE NOT EXISTS (SELECT 1 FROM "entities" WHERE "name" = 'ticket_page_create');

INSERT INTO "entities" ("name", "description")
SELECT 'ticket_page_my_requests', 'Ticketing — My Requests'
WHERE NOT EXISTS (SELECT 1 FROM "entities" WHERE "name" = 'ticket_page_my_requests');

INSERT INTO "entities" ("name", "description")
SELECT 'ticket_page_requests_to_approve', 'Ticketing — Requests to Approve'
WHERE NOT EXISTS (SELECT 1 FROM "entities" WHERE "name" = 'ticket_page_requests_to_approve');

INSERT INTO "entities" ("name", "description")
SELECT 'ticket_page_my_approvals', 'Ticketing — My Approvals'
WHERE NOT EXISTS (SELECT 1 FROM "entities" WHERE "name" = 'ticket_page_my_approvals');

INSERT INTO "entities" ("name", "description")
SELECT 'ticket_page_takeout_queue', 'Ticketing — Takeout Queue'
WHERE NOT EXISTS (SELECT 1 FROM "entities" WHERE "name" = 'ticket_page_takeout_queue');

INSERT INTO "entities" ("name", "description")
SELECT 'ticket_page_return_queue', 'Ticketing — Return Queue'
WHERE NOT EXISTS (SELECT 1 FROM "entities" WHERE "name" = 'ticket_page_return_queue');

INSERT INTO "entities" ("name", "description")
SELECT 'ticket_page_borrowed_products', 'Ticketing — Borrowed Products'
WHERE NOT EXISTS (SELECT 1 FROM "entities" WHERE "name" = 'ticket_page_borrowed_products');

INSERT INTO "entities" ("name", "description")
SELECT 'ticket_page_management', 'Ticketing — Ticket Management'
WHERE NOT EXISTS (SELECT 1 FROM "entities" WHERE "name" = 'ticket_page_management');
