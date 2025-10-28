import Joi from 'joi';
import { CreateUserDto, UpdateUserDto } from './user.model';

/**
 * Validation schema for creating a user
 * Strongly typed to align with CreateUserDto
 */
export const createUserSchema = Joi.object<CreateUserDto>({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
    }),
  firstName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 1 character',
      'string.max': 'First name must not exceed 50 characters',
      'any.required': 'First name is required',
    }),
  lastName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name must be at least 1 character',
      'string.max': 'Last name must not exceed 50 characters',
      'any.required': 'Last name is required',
    }),
});

/**
 * Validation schema for updating a user
 * Strongly typed to align with UpdateUserDto
 */
export const updateUserSchema = Joi.object<UpdateUserDto>({
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Email must be a valid email address',
    }),
  firstName: Joi.string()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.min': 'First name must be at least 1 character',
      'string.max': 'First name must not exceed 50 characters',
    }),
  lastName: Joi.string()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Last name must be at least 1 character',
      'string.max': 'Last name must not exceed 50 characters',
    }),
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean',
    }),
}).min(1);

/**
 * Validation schema for user ID parameter
 */
export const userIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'ID must be a number',
      'number.integer': 'ID must be an integer',
      'number.positive': 'ID must be positive',
      'any.required': 'ID is required',
    }),
});
