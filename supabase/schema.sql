-- PizzAI Dashboard Database Schema
-- Run this in the Supabase SQL Editor (supabase.com/dashboard/project/YOUR_PROJECT/sql)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for day tags
CREATE TYPE day_tag AS ENUM ('event', 'short-staffed', 'bad-weather', 'promotion', 'holiday', 'slow-day');

-- Actual daily data (orders, revenue, labor)
CREATE TABLE actual_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    actual_orders INTEGER NOT NULL,
    actual_revenue DECIMAL(10,2) NOT NULL,
    labor_hours DECIMAL(5,2),
    labor_cost DECIMAL(10,2),
    notes TEXT,
    tags day_tag[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Custom prep tasks
CREATE TABLE custom_prep_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom inventory items
CREATE TABLE custom_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ingredient TEXT NOT NULL,
    unit TEXT NOT NULL,
    par_level DECIMAL(10,2) NOT NULL DEFAULT 0,
    on_hand DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_per_unit DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly revenue goals
CREATE TABLE weekly_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    revenue DECIMAL(10,2) NOT NULL,
    week_start DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- Employees
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    hourly_rate DECIMAL(6,2) NOT NULL,
    availability JSONB NOT NULL DEFAULT '{}',
    max_hours INTEGER NOT NULL DEFAULT 40,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE actual_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_prep_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see/modify their own data
CREATE POLICY "Users can view own actual_data" ON actual_data
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own actual_data" ON actual_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own actual_data" ON actual_data
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own actual_data" ON actual_data
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own prep_tasks" ON custom_prep_tasks
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prep_tasks" ON custom_prep_tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prep_tasks" ON custom_prep_tasks
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prep_tasks" ON custom_prep_tasks
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own inventory" ON custom_inventory
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory" ON custom_inventory
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory" ON custom_inventory
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own inventory" ON custom_inventory
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own goals" ON weekly_goals
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON weekly_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON weekly_goals
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON weekly_goals
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own employees" ON employees
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own employees" ON employees
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own employees" ON employees
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own employees" ON employees
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_actual_data_user_date ON actual_data(user_id, date DESC);
CREATE INDEX idx_actual_data_date ON actual_data(date DESC);
CREATE INDEX idx_custom_inventory_user ON custom_inventory(user_id);
CREATE INDEX idx_employees_user ON employees(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_actual_data_updated_at BEFORE UPDATE ON actual_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_inventory_updated_at BEFORE UPDATE ON custom_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
