import { BaseRepository } from '../../core/database/base-repository';
import { User } from './user.model';
import logger from '../../core/logger';

/**
 * User repository extending the base repository
 * Demonstrates how to use the generic CRUD operations with a specific table
 */
export class UserRepository extends BaseRepository<User> {
  protected tableName = 'USERS';
  protected idColumn = 'USER_ID';

  /**
   * Map Oracle database row to User model
   * Handle Oracle's column naming conventions (usually UPPER_CASE)
   */
  protected mapRowToModel(row: any): User {
    return {
      id: row.USER_ID,
      email: row.EMAIL,
      firstName: row.FIRST_NAME,
      lastName: row.LAST_NAME,
      isActive: row.IS_ACTIVE === 1,
      createdAt: new Date(row.CREATED_AT),
      updatedAt: new Date(row.UPDATED_AT),
    };
  }

  /**
   * Map User model to Oracle database row
   * Handle conversion to Oracle's column naming conventions
   */
  protected mapModelToRow(model: Partial<User>): any {
    const row: any = {};

    if (model.email !== undefined) row.EMAIL = model.email;
    if (model.firstName !== undefined) row.FIRST_NAME = model.firstName;
    if (model.lastName !== undefined) row.LAST_NAME = model.lastName;
    if (model.isActive !== undefined) row.IS_ACTIVE = model.isActive ? 1 : 0;

    return row;
  }

  /**
   * Find user by email (custom method beyond base repository)
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      logger.info(`Finding user by email: ${email}`);

      // TODO: Implement with actual OracleDB
      // const connection = await getConnection();
      // const result = await connection.execute(
      //   `SELECT * FROM ${this.tableName} WHERE EMAIL = :email`,
      //   [email]
      // );

      // if (result.rows.length === 0) {
      //   return null;
      // }

      // return this.mapRowToModel(result.rows[0]);

      return null; // Stub
    } catch (error) {
      logger.error(`Error finding user by email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Find all active users (custom method)
   */
  async findActiveUsers(): Promise<User[]> {
    try {
      logger.info('Finding all active users');

      // TODO: Implement with actual OracleDB
      // const connection = await getConnection();
      // const result = await connection.execute(
      //   `SELECT * FROM ${this.tableName} WHERE IS_ACTIVE = 1`
      // );

      // return result.rows.map(row => this.mapRowToModel(row));

      return []; // Stub
    } catch (error) {
      logger.error('Error finding active users:', error);
      throw error;
    }
  }
}
