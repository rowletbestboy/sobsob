-- migrations.sql
-- Run as: psql -d <your_db> -f migrations.sql
-- Creates tables if they do not exist. Adjust types/constraints as needed.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  profile_pic TEXT,
  bio TEXT,
  location TEXT,
  contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cafes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo_path TEXT,
  images TEXT[], -- optional array of additional image URLs/paths
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cafe_id INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  text TEXT,
  rating INTEGER CHECK (rating >= 0 AND rating <= 5),
  photo TEXT, -- path served under /uploads/...
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Optional: insert sample cafes if none exist
INSERT INTO cafes (name, description, logo_path)
SELECT v.name, v.description, v.logo FROM (VALUES
  ('Brewngan','Cozy spot with classic brews near the bay.','/images/Brewngan/logo.jpg'),
  ('Cafe Bon','Pastas? Pastries? Food? We have it all!','/images/Cafe Bon/logo.jpg'),
  ('Surf and Turf','One of the best in the city — and we serve coffee too!','/images/Surf and Turf/logo.jpg'),
  ('Backdoor Coffee','Come and chill after a long ride.','/images/Backdoor Coffee/logo.jpg'),
  ('Bistro Gang','For your late-night study sessions.','/images/Bistro Gang/logo.jpg'),
  ('Bo''s Coffee','Your nationwide coffee craze!','/images/Bos Coffee/logo.jpg'),
  ('Brew and Bistro','Good music and great coffee awaits you!','/images/Brew and Bistro/logo.jpg'),
  ('Brewers Best','Comfort is our top priority.','/images/Brewers Best/logo.jpg'),
  ('Dirty Grinder Coffee','Chill with dim lights and music.','/images/Dirty Grinder Coffee/logo.jpg'),
  ('Growing Grounds','Where coffee meets greenery.','/images/Growing Grounds/logo.jpg'),
  ('Kapehan','Resort + Restaurant + Coffee.','/images/Kapehan/logo.jpg'),
  ('Thirdtry Coffee','Live the Instagram café aesthetic.','/images/Thirdtry/logo.jpg')
) AS v(name, description, logo)
WHERE NOT EXISTS (SELECT 1 FROM cafes WHERE name = v.name);
