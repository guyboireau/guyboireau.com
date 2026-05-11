import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitContact, validateContactInput } from './contact';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

vi.mock('resend', () => ({
  Resend: vi.fn()
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}));

const mockResendSend = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseFrom = vi.fn(() => ({
  insert: mockSupabaseInsert
}));

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(Resend).mockImplementation(() => ({
    emails: {
      send: mockResendSend