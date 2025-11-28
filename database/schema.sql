-- ======================================
-- Supabase Database Schema for Timetable App
-- ======================================
-- Run this SQL in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query)

-- ======================================
-- 1. User Enrollment Table
-- ======================================
CREATE TABLE user_enrollment (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- 2. Enrollment Courses Table
-- ======================================
CREATE TABLE enrollment_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_enrollment(user_id) ON DELETE CASCADE NOT NULL,
  course_code TEXT NOT NULL,
  session_type TEXT NOT NULL,  -- 'LEC', 'CLA', 'SEM', etc.
  class_group INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure unique course/session combination per user
  UNIQUE(user_id, course_code, session_type)
);

-- Index for faster queries
CREATE INDEX idx_enrollment_courses_user_id ON enrollment_courses(user_id);

-- ======================================
-- 3. Row Level Security (RLS) Policies
-- ======================================

-- Enable RLS on both tables
ALTER TABLE user_enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_courses ENABLE ROW LEVEL SECURITY;

-- Policies for user_enrollment
CREATE POLICY "Users can view their own enrollment"
  ON user_enrollment FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enrollment"
  ON user_enrollment FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollment"
  ON user_enrollment FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own enrollment"
  ON user_enrollment FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for enrollment_courses
-- Users can only access courses from their own enrollment
CREATE POLICY "Users can view their courses"
  ON enrollment_courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their courses"
  ON enrollment_courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their courses"
  ON enrollment_courses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their courses"
  ON enrollment_courses FOR DELETE
  USING (auth.uid() = user_id);

-- ======================================
-- 4. Automatic Updated Timestamp Trigger
-- ======================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_enrollment
CREATE TRIGGER update_user_enrollment_updated_at
    BEFORE UPDATE ON user_enrollment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


