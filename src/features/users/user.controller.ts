import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Route,
  Tags,
  Body,
  Path,
  Query,
  SuccessResponse,
  Response,
  Security,
} from 'tsoa';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './user.model';
import { PaginatedResult } from '../../types';
import { createUserSchema, updateUserSchema, userIdSchema } from './user.validation';
import { ValidationError } from '../../core/middleware/error.middleware';

/**
 * User controller with TSOA decorators for Swagger generation
 */
@Route('api/v1/users')
@Tags('Users')
export class UserController extends Controller {
  private userService: UserService;

  constructor() {
    super();
    this.userService = new UserService();
  }

  /**
   * Get all users with pagination
   * @param page Page number (default: 1)
   * @param limit Items per page (default: 10)
   */
  @Get()
  @SuccessResponse(200, 'Users retrieved successfully')
  public async getUsers(
    @Query() page: number = 1,
    @Query() limit: number = 10
  ): Promise<PaginatedResult<UserResponseDto>> {
    return this.userService.getAllUsers(page, limit);
  }

  /**
   * Get a user by ID
   * @param id User ID
   */
  @Get('{id}')
  @SuccessResponse(200, 'User retrieved successfully')
  @Response(404, 'User not found')
  public async getUserById(@Path() id: number): Promise<UserResponseDto> {
    // Validate ID parameter
    const { error } = userIdSchema.validate({ id });
    if (error) {
      throw new ValidationError('Invalid user ID', error.details);
    }

    return this.userService.getUserById(id);
  }

  /**
   * Create a new user
   * @param requestBody User creation data
   */
  @Post()
  @SuccessResponse(201, 'User created successfully')
  @Response(400, 'Validation error')
  public async createUser(@Body() requestBody: CreateUserDto): Promise<UserResponseDto> {
    // Validate request body
    const { error } = createUserSchema.validate(requestBody);
    if (error) {
      throw new ValidationError('Validation failed', error.details);
    }

    const user = await this.userService.createUser(requestBody);
    this.setStatus(201);
    return user;
  }

  /**
   * Update a user by ID
   * @param id User ID
   * @param requestBody User update data
   */
  @Put('{id}')
  @SuccessResponse(200, 'User updated successfully')
  @Response(404, 'User not found')
  @Response(400, 'Validation error')
  public async updateUser(
    @Path() id: number,
    @Body() requestBody: UpdateUserDto
  ): Promise<UserResponseDto> {
    // Validate ID parameter
    const idValidation = userIdSchema.validate({ id });
    if (idValidation.error) {
      throw new ValidationError('Invalid user ID', idValidation.error.details);
    }

    // Validate request body
    const bodyValidation = updateUserSchema.validate(requestBody);
    if (bodyValidation.error) {
      throw new ValidationError('Validation failed', bodyValidation.error.details);
    }

    return this.userService.updateUser(id, requestBody);
  }

  /**
   * Delete a user by ID
   * @param id User ID
   */
  @Delete('{id}')
  @SuccessResponse(204, 'User deleted successfully')
  @Response(404, 'User not found')
  public async deleteUser(@Path() id: number): Promise<void> {
    // Validate ID parameter
    const { error } = userIdSchema.validate({ id });
    if (error) {
      throw new ValidationError('Invalid user ID', error.details);
    }

    await this.userService.deleteUser(id);
    this.setStatus(204);
  }
}
