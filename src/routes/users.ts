import { Router, Request, Response } from 'express';
import { database } from '../db/database';
import { User, ApiResponse } from '../types';

const router = Router();

/**
 * GET /api/users - Retrieve all users
 */
router.get('/', async (req: Request, res: Response<ApiResponse<User[]>>) => {
  try {
    const users = await database.all<User>('SELECT * FROM users');
    res.json({
      success: true,
      data: users,
      message: `Retrieved ${users.length} users`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching users'
    });
  }
});

/**
 * GET /api/users/:id - Retrieve a specific user by ID
 */
router.get('/:id', async (req: Request, res: Response<ApiResponse<User>>) => {
  try {
    const { id } = req.params;
    const user = await database.get<User>('SELECT * FROM users WHERE id = ?', [id]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'User retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching user'
    });
  }
});

/**
 * POST /api/users - Create a new user
 */
router.post('/', async (req: Request, res: Response<ApiResponse<{ id: number }>>) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    const result = await database.run(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, email]
    );

    res.status(201).json({
      success: true,
      data: { id: result.lastID },
      message: 'User created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error creating user'
    });
  }
});

export default router;
