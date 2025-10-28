import { UserRepository } from './user.repository';
import { CreateUserDto, UpdateUserDto, User, UserResponseDto } from './user.model';
import { NotFoundError, ValidationError } from '../../core/middleware/error.middleware';
import logger from '../../core/logger';
import { PaginationParams, PaginatedResult } from '../../types';

/**
 * User service containing business logic
 */
export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResult<UserResponseDto>> {
    try {
      const offset = (page - 1) * limit;
      const pagination: PaginationParams = { page, limit, offset };

      const result = await this.userRepository.findAll(undefined, pagination);

      return {
        ...result,
        data: result.data.map(user => this.mapToResponseDto(user)),
      };
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findById(id);

      if (!user) {
        throw new NotFoundError(`User with ID ${id} not found`);
      }

      return this.mapToResponseDto(user);
    } catch (error) {
      logger.error(`Error getting user by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(createUserDto.email);

      if (existingUser) {
        throw new ValidationError('Email already exists');
      }

      const newUser = await this.userRepository.create({
        ...createUserDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User);

      logger.info(`User created: ${newUser.id}`);
      return this.mapToResponseDto(newUser);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user by ID
   */
  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(id);

      if (!existingUser) {
        throw new NotFoundError(`User with ID ${id} not found`);
      }

      // If email is being updated, check for duplicates
      if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
        const emailExists = await this.userRepository.findByEmail(updateUserDto.email);
        if (emailExists) {
          throw new ValidationError('Email already exists');
        }
      }

      const updatedUser = await this.userRepository.update(id, {
        ...updateUserDto,
        updatedAt: new Date(),
      } as Partial<User>);

      if (!updatedUser) {
        throw new NotFoundError(`User with ID ${id} not found`);
      }

      logger.info(`User updated: ${id}`);
      return this.mapToResponseDto(updatedUser);
    } catch (error) {
      logger.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete user by ID
   */
  async deleteUser(id: number): Promise<void> {
    try {
      const deleted = await this.userRepository.delete(id);

      if (!deleted) {
        throw new NotFoundError(`User with ID ${id} not found`);
      }

      logger.info(`User deleted: ${id}`);
    } catch (error) {
      logger.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  }

  /**
   * Map User model to UserResponseDto
   */
  private mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
