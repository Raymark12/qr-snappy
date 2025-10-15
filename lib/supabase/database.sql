-- QR Snappy Database Schema
-- Run this SQL in your Supabase SQL Editor
--
-- This file contains the complete database schema including:
-- - Tables (profiles, events, event_assignments, photos)
-- - Row Level Security (RLS) policies
-- - Storage bucket policies
-- - Triggers and functions
-- - Indexes for performance
--
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add role constraint to profiles table
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user', 'client'));

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

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
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
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

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

-- RLS Policies for photos
CREATE POLICY "Anyone can view approved photos" ON photos
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Event admins can view all photos for their events" ON photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = photos.event_id 
      AND e.admin_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Assigned clients can view all photos (pending and approved) for their assigned events
CREATE POLICY "Assigned clients can view all photos for their events" ON photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_assignments ea
      JOIN profiles p ON p.id = auth.uid()
      WHERE ea.event_id = photos.event_id 
      AND ea.client_id = auth.uid()
      AND p.role = 'client'
    )
  );

CREATE POLICY "Anyone can insert photos to active events" ON photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_id 
      AND events.is_active = true
    )
  );

CREATE POLICY "Event admins can update photo status" ON photos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = photos.event_id 
      AND e.admin_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Assigned clients can update photo status for their assigned events
CREATE POLICY "Assigned clients can update photo status" ON photos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM event_assignments ea
      JOIN profiles p ON p.id = auth.uid()
      WHERE ea.event_id = photos.event_id 
      AND ea.client_id = auth.uid()
      AND p.role = 'client'
    )
  );

CREATE POLICY "Event admins can delete photos from their events" ON photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = photos.event_id 
      AND e.admin_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Assigned clients can delete photos from their assigned events
CREATE POLICY "Assigned clients can delete photos from their events" ON photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM event_assignments ea
      JOIN profiles p ON p.id = auth.uid()
      WHERE ea.event_id = photos.event_id 
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

CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploaded_at);

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
--      * Photos: Photos/{eventId}/{filename}
--      * QR Codes: Photos/qr/{eventId}/event-qr.png
--      * Background Images: Photos/backgrounds/{eventId}/background.jpg
--
-- The following policies will apply once the bucket is created.

-- 2. Allow authenticated users to upload photos
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

-- 3. Allow users to view photos from their assigned events
CREATE POLICY "Allow authenticated reads from Photos bucket"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'Photos'
  AND (
    -- Admin can view all photos
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Client can view photos from assigned events
    EXISTS (
      SELECT 1 
      FROM public.event_assignments 
      WHERE client_id = auth.uid() 
      AND event_id = (storage.foldername(name))[1]::uuid
    )
  )
);

-- 4. Admins and assigned clients can delete photos
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
-- Add indexes for better photo query performance
CREATE INDEX IF NOT EXISTS idx_photos_event_status_uploaded 
ON photos(event_id, status, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_photos_status_uploaded 
ON photos(status, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_photos_user_email 
ON photos(user_email) WHERE user_email IS NOT NULL;

-- 5. Admins and assigned clients can update/move photos
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