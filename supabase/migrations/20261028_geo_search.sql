-- Geographic search for the map-first discovery screen.
-- Run after schema.sql on existing projects (schema.sql already includes
-- lat/lng for fresh installs).

alter table listings add column if not exists lat double precision;
alter table listings add column if not exists lng double precision;

-- Viewport queries filter on both axes; a composite btree is enough at this
-- scale and needs no PostGIS. Switch to a GiST index on a geography column
-- when the catalogue outgrows it.
create index if not exists listings_lat_lng_idx on listings (lat, lng) where status = 'published';

-- Rental category chosen in the listing builder (short / seasonal / long).
alter table listings add column if not exists rental_duration text
  check (rental_duration in ('short', 'seasonal', 'long'));

-- Marks coordinates that came from a city/area lookup rather than the
-- owner's address, so the UI can ask the owner to pin the exact spot.
alter table listings add column if not exists location_approximate boolean not null default false;
