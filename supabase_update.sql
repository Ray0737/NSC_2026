-- Run this script in your Supabase SQL Editor to update the profiles table for the new fields.

-- 1. Add new columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS school TEXT,
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS major TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- 2. Storage Setup (Run these to allow authenticated users to manage their own avatars)

-- Policy: Allow public access to view all avatars
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Policy: Allow authenticated users to upload files to their own folder in 'avatars' bucket
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to update/delete their own files in 'avatars' bucket
CREATE POLICY "Owner Access"
ON storage.objects FOR ALL
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

/* 
Important Implementation Note:
Make sure to create the 'avatars' bucket manually in the Supabase Dashboard 
first, and set its privacy setting to 'PUBLIC'.
*/
