import { BaseModel } from '../../types';

/**
 * User model representing a user in the system
 */
export interface User extends BaseModel {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a user
 */
export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * DTO for updating a user
 */
export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

/**
 * DTO for user response (without sensitive fields)
 */
export interface UserResponseDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
