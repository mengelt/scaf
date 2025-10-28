import { describe, it, expect } from 'vitest';
import { createUserSchema, updateUserSchema, userIdSchema } from './user.validation';

describe('User Validation', () => {
  describe('createUserSchema', () => {
    it('should validate a valid user creation payload', () => {
      const validUser = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const { error, value } = createUserSchema.validate(validUser);

      expect(error).toBeUndefined();
      expect(value).toEqual(validUser);
    });

    it('should reject invalid email', () => {
      const invalidUser = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
      };

      const { error } = createUserSchema.validate(invalidUser);

      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid email');
    });

    it('should reject missing required fields', () => {
      const incompleteUser = {
        email: 'test@example.com',
      };

      const { error } = createUserSchema.validate(incompleteUser);

      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('required');
    });

    it('should reject firstName that exceeds max length', () => {
      const invalidUser = {
        email: 'test@example.com',
        firstName: 'a'.repeat(51),
        lastName: 'Doe',
      };

      const { error } = createUserSchema.validate(invalidUser);

      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('50 characters');
    });
  });

  describe('updateUserSchema', () => {
    it('should validate a valid user update payload', () => {
      const validUpdate = {
        firstName: 'Jane',
        isActive: false,
      };

      const { error, value } = updateUserSchema.validate(validUpdate);

      expect(error).toBeUndefined();
      expect(value).toEqual(validUpdate);
    });

    it('should allow partial updates', () => {
      const partialUpdate = {
        firstName: 'Jane',
      };

      const { error, value } = updateUserSchema.validate(partialUpdate);

      expect(error).toBeUndefined();
      expect(value).toEqual(partialUpdate);
    });

    it('should reject empty update object', () => {
      const emptyUpdate = {};

      const { error } = updateUserSchema.validate(emptyUpdate);

      expect(error).toBeDefined();
    });

    it('should reject invalid email in update', () => {
      const invalidUpdate = {
        email: 'not-an-email',
      };

      const { error } = updateUserSchema.validate(invalidUpdate);

      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid email');
    });
  });

  describe('userIdSchema', () => {
    it('should validate a valid user ID', () => {
      const validId = { id: 123 };

      const { error, value } = userIdSchema.validate(validId);

      expect(error).toBeUndefined();
      expect(value).toEqual(validId);
    });

    it('should reject negative IDs', () => {
      const invalidId = { id: -1 };

      const { error } = userIdSchema.validate(invalidId);

      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('positive');
    });

    it('should reject non-integer IDs', () => {
      const invalidId = { id: 1.5 };

      const { error } = userIdSchema.validate(invalidId);

      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('integer');
    });

    it('should reject string IDs', () => {
      const invalidId = { id: 'abc' };

      const { error } = userIdSchema.validate(invalidId);

      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('number');
    });
  });
});
