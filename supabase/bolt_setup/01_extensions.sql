-- Extensions GreenZone migrations expect (gen_random_uuid, etc.)
-- Run immediately after 00_wipe_public_schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
