import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { NotFoundError, ValidationError } from '../../core/middleware/error.middleware';
import { CreateUserDto, UpdateUserDto, User } from './user.model';

// Mock the repository
vi.mock('./user.repository');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: any;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create mock repository
    mockUserRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    // Create service instance
    userService = new UserService();
    // Replace the repository instance with our mock
    (userService as any).userRepository = mockUserRepository;
  });

  describe('getUserById', () => {
    it('should return a user when found', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById(1);

      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when user is not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById(999)).rejects.toThrow(NotFoundError);
      await expect(userService.getUserById(999)).rejects.toThrow('User with ID 999 not found');
    });
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const createDto: CreateUserDto = {
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        ...createDto,
        id: 2,
      });

      const result = await userService.createUser(createDto);

      expect(result.email).toBe('new@example.com');
      expect(result.firstName).toBe('Jane');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should throw ValidationError when email already exists', async () => {
      const createDto: CreateUserDto = {
        email: 'existing@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(userService.createUser(createDto)).rejects.toThrow(ValidationError);
      await expect(userService.createUser(createDto)).rejects.toThrow('Email already exists');
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      const updateDto: UpdateUserDto = {
        firstName: 'Updated',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Updated',
      });

      const result = await userService.updateUser(1, updateDto);

      expect(result.firstName).toBe('Updated');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError when user does not exist', async () => {
      const updateDto: UpdateUserDto = {
        firstName: 'Updated',
      };

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUser(999, updateDto)).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      mockUserRepository.delete.mockResolvedValue(true);

      await expect(userService.deleteUser(1)).resolves.toBeUndefined();
      expect(mockUserRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.delete.mockResolvedValue(false);

      await expect(userService.deleteUser(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users', async () => {
      const mockPaginatedResult = {
        data: [mockUser],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockUserRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await userService.getAllUsers(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(mockUserRepository.findAll).toHaveBeenCalled();
    });
  });
});
