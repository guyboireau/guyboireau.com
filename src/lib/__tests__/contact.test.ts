import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { submitContact, type ContactFormData } from '@/lib/contact';
import { getSupabase } from '@/lib/supabase/client';

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: vi.fn(),
}));

describe('contact', () => {
  const mockInsert = vi.fn();
  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    (getSupabase as Mock).mockReturnValue({
      from: mockFrom,
    });
  });

  describe('submitContact', () => {
    const validData: ContactFormData = {
      name: 'Guy Boireau',
      email: 'guy@example.com',
      message: 'Bonjour, je voudrais vous contacter.',
    };

    it('should successfully submit contact data to supabase', async () => {
      mockInsert.mockResolvedValueOnce({ error: null });

      const result = await submitContact(validData);

      expect(result).toEqual({ success: true });
      expect(getSupabase).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenCalledWith('contacts');
      expect(mockInsert).toHaveBeenCalledWith(validData);
    });

    it('should throw when name is empty', async () => {
      const invalidData = { ...validData, name: '' };
      await expect(submitContact(invalidData)).rejects.toThrow('Name is required');
    });

    it('should throw when email is invalid', async () => {
      const invalidData = { ...validData, email: 'invalid-email' };
      await expect(submitContact(invalidData)).rejects.toThrow('Invalid email');
    });

    it('should throw when message is empty', async () => {
      const invalidData = { ...validData, message: '' };
      await expect(submitContact(invalidData)).rejects.toThrow('Message is required');
    });

    it('should throw when supabase returns an error', async () => {
      const error = new Error('insertion failed');
      mockInsert.mockResolvedValueOnce({ error });

      await expect(submitContact(validData)).rejects.toThrow('insertion failed');
    });

    it('should propagate unexpected errors from supabase', async () => {
      mockInsert.mockRejectedValueOnce(new Error('network error'));

      await expect(submitContact(validData)).rejects.toThrow('network error');
    });
  });
});