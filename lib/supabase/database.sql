-- QR Snappy Database Schema
-- Run this SQL in your Supabase SQL Editor
--
-- This file contains the complete database schema including:
-- - Tables (profiles, events, event_assignments, media)
-- - Row Level Security (RLS) policies
-- - Storage bucket policies
-- - Triggers and functions
-- - Indexes for performance
--
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'client')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  password TEXT NOT NULL,
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  background_image_path TEXT,
  auto_approve BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_assignments table
CREATE TABLE IF NOT EXISTS event_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, client_id)
);

-- Create media table (supports both images and videos)
CREATE TABLE IF NOT EXISTS media (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  thumbnail_path TEXT,
  preview_path TEXT,
  file_size BIGINT,
  thumbnail_size BIGINT,
  preview_size BIGINT,
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  author TEXT,
  comment TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Function to check if current user is admin (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Function to check if current user has a specific role (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(check_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = check_role
  );
END;
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE USING (public.is_admin());

-- RLS Policies for events
-- Admins can see all events (active or not)
CREATE POLICY "Admins can view all events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Clients can see events assigned to them
CREATE POLICY "Clients can view assigned events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN event_assignments ea ON ea.client_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role = 'client'
      AND ea.event_id = events.id
    )
  );

-- Anonymous users can view active events (for QR/link access)
CREATE POLICY "Anyone can view active events" ON events
  FOR SELECT USING (is_active = true);

-- Only admins can create events
CREATE POLICY "Admins can insert events" ON events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admins can update their own events, clients can update events assigned to them
CREATE POLICY "Admins can update their own events" ON events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      AND events.admin_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update assigned events" ON events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN event_assignments ea ON ea.client_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role = 'client'
      AND ea.event_id = events.id
    )
  );

-- Only admins can delete events
CREATE POLICY "Admins can delete their own events" ON events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      AND events.admin_id = auth.uid()
    )
  );

-- RLS Policies for event_assignments
-- Admins can view all event assignments
CREATE POLICY "Admins can view all event assignments" ON event_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Clients can view their own assignments
CREATE POLICY "Clients can view their own assignments" ON event_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'client'
      AND event_assignments.client_id = auth.uid()
    )
  );

-- Only admins can create event assignments
CREATE POLICY "Admins can insert event assignments" ON event_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update event assignments
CREATE POLICY "Admins can update event assignments" ON event_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete event assignments
CREATE POLICY "Admins can delete event assignments" ON event_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for media
CREATE POLICY "Anyone can view approved media" ON media
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Event admins can view all media for their events" ON media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = media.event_id
      AND e.admin_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Assigned clients can view all media (pending and approved) for their assigned events
CREATE POLICY "Assigned clients can view all media for their events" ON media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_assignments ea
      JOIN profiles p ON p.id = auth.uid()
      WHERE ea.event_id = media.event_id
      AND ea.client_id = auth.uid()
      AND p.role = 'client'
    )
  );

CREATE POLICY "Anyone can insert media to active events" ON media
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.is_active = true
    )
  );

CREATE POLICY "Event admins can update media status" ON media
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = media.event_id
      AND e.admin_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Assigned clients can update media status for their assigned events
CREATE POLICY "Assigned clients can update media status" ON media
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM event_assignments ea
      JOIN profiles p ON p.id = auth.uid()
      WHERE ea.event_id = media.event_id
      AND ea.client_id = auth.uid()
      AND p.role = 'client'
    )
  );

CREATE POLICY "Event admins can delete media from their events" ON media
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = media.event_id
      AND e.admin_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Assigned clients can delete media from their assigned events
CREATE POLICY "Assigned clients can delete media from their events" ON media
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM event_assignments ea
      JOIN profiles p ON p.id = auth.uid()
      WHERE ea.event_id = media.event_id
      AND ea.client_id = auth.uid()
      AND p.role = 'client'
    )
  );

CREATE INDEX IF NOT EXISTS idx_events_admin_id ON events(admin_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);

CREATE INDEX IF NOT EXISTS idx_event_assignments_event_id ON event_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_assignments_client_id ON event_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_event_assignments_assigned_by ON event_assignments(assigned_by);

CREATE INDEX IF NOT EXISTS idx_media_event_id ON media(event_id);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON media(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_media_media_type ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_file_size ON media(file_size) WHERE file_size IS NOT NULL;

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on events
DROP TRIGGER IF EXISTS handle_events_updated_at ON events;
CREATE TRIGGER handle_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- STORAGE BUCKETS SETUP
-- ============================================================================
-- Note: You need to create storage buckets manually in Supabase Dashboard:
-- 1. Go to Storage > Create Bucket
-- 2. Create bucket named "Photos" (public or private as needed)
--    - This bucket stores:
--      * Media (images & videos): Photos/{eventId}/originals/{filename}
--      * Thumbnails: Photos/{eventId}/thumbnails/{filename}
--      * Video Previews: Photos/{eventId}/previews/{filename}
--      * QR Codes: Photos/qr/{eventId}/event-qr.png
--      * Background Images: Photos/backgrounds/{eventId}/background.jpg
--
-- The following policies will apply once the bucket is created.

-- 2. Allow authenticated users to upload media
CREATE POLICY "Allow authenticated uploads to Photos bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Photos'
  AND (
    -- Admin can upload to any event
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Client can upload if assigned to the event
    EXISTS (
      SELECT 1 
      FROM public.event_assignments 
      WHERE client_id = auth.uid() 
      AND event_id = (storage.foldername(name))[1]::uuid
    )
  )
);

-- 3. Allow users to view media from their assigned events
CREATE POLICY "Allow authenticated reads from Photos bucket"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'Photos'
  AND (
    -- Admin can view all media
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Client can view media from assigned events
    EXISTS (
      SELECT 1 
      FROM public.event_assignments 
      WHERE client_id = auth.uid() 
      AND event_id = (storage.foldername(name))[1]::uuid
    )
  )
);

-- 4. Admins and assigned clients can delete media
CREATE POLICY "Admins can delete from Photos bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'Photos'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Assigned clients can delete from Photos bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'Photos'
  AND EXISTS (
    SELECT 1 
    FROM public.event_assignments 
    WHERE client_id = auth.uid() 
    AND event_id = (storage.foldername(name))[1]::uuid
  )
);

-- Performance indexes
-- Add indexes for better media query performance
CREATE INDEX IF NOT EXISTS idx_media_event_status_uploaded
ON media(event_id, status, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_status_uploaded
ON media(status, uploaded_at DESC);

-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_media_user_email ON media(user_email) WHERE user_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON media(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_admin_id ON events(admin_id);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_event_assignments_client_event ON event_assignments(client_id, event_id);

-- 5. Admins and assigned clients can update/move media
CREATE POLICY "Admins can update Photos bucket"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'Photos'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  bucket_id = 'Photos'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Assigned clients can update Photos bucket"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'Photos'
  AND EXISTS (
    SELECT 1 
    FROM public.event_assignments 
    WHERE client_id = auth.uid() 
    AND event_id = (storage.foldername(name))[1]::uuid
  )
)
WITH CHECK (
  bucket_id = 'Photos'
  AND EXISTS (
    SELECT 1
    FROM public.event_assignments
    WHERE client_id = auth.uid()
    AND event_id = (storage.foldername(name))[1]::uuid
  )
);

-- ============================================================================
-- MIGRATION FROM PHOTOS TO MEDIA TABLE
-- ============================================================================
-- If you have an existing 'photos' table, run these commands to migrate to the new 'media' structure:
--
-- 1. Add new columns to existing photos table (if not already done):
--    ALTER TABLE photos ADD COLUMN media_type TEXT CHECK (media_type IN ('image', 'video'));
--    ALTER TABLE photos ADD COLUMN thumbnail_path TEXT;
--    ALTER TABLE photos ADD COLUMN preview_path TEXT;
--    ALTER TABLE photos ADD COLUMN file_size BIGINT;
--    ALTER TABLE photos ADD COLUMN thumbnail_size BIGINT;
--    ALTER TABLE photos ADD COLUMN preview_size BIGINT;
--    ALTER TABLE photos ADD COLUMN width INTEGER;
--    ALTER TABLE photos ADD COLUMN height INTEGER;
--    ALTER TABLE photos ADD COLUMN duration INTEGER;
--
-- 2. Update existing records to have media_type (you'll need to determine this based on file extensions):
--    UPDATE photos SET media_type = 'image' WHERE file_name ~ '\.(jpg|jpeg|png|gif|webp|bmp|tiff)$';
--    UPDATE photos SET media_type = 'video' WHERE file_name ~ '\.(mp4|avi|mov|mkv|webm|flv)$';
--
-- 3. Rename the table (this preserves all data and RLS policies):
--    ALTER TABLE photos RENAME TO media;
--
-- 4. Update any storage bucket references in your application code from 'photos/' to 'media/'
--
-- Note: The storage bucket remains named "Photos" for backward compatibility,
-- but the file organization now follows: Photos/{eventId}/{originals|thumbnails|previews}/