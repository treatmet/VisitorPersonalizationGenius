import { Router, Request, Response } from 'express';
import { database } from '../db/database';
import { Project, ApiResponse } from '../types';

const router = Router();

/**
 * GET /api/projects - Retrieve all projects
 */
router.get('/', async (req: Request, res: Response<ApiResponse<Project[]>>) => {
  try {
    const projects = await database.all<Project>('SELECT * FROM projects');
    res.json({
      success: true,
      data: projects,
      message: `Retrieved ${projects.length} projects`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching projects'
    });
  }
});

/**
 * GET /api/projects/:id - Retrieve a specific project by ID
 */
router.get('/:id', async (req: Request, res: Response<ApiResponse<Project>>) => {
  try {
    const { id } = req.params;
    const project = await database.get<Project>(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: project,
      message: 'Project retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching project'
    });
  }
});

/**
 * POST /api/projects - Create a new project
 */
router.post('/', async (req: Request, res: Response<ApiResponse<{ id: number }>>) => {
  try {
    const { title, description, userId } = req.body;

    if (!title || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Title and userId are required'
      });
    }

    const result = await database.run(
      'INSERT INTO projects (title, description, userId) VALUES (?, ?, ?)',
      [title, description || null, userId]
    );

    res.status(201).json({
      success: true,
      data: { id: result.lastID },
      message: 'Project created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error creating project'
    });
  }
});

export default router;
