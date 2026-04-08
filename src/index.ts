import express, { Express, Request, Response } from 'express';
import { database } from './db/database';
import usersRouter from './routes/users';
import projectsRouter from './routes/projects';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

/**
 * Initialize the application
 */
async function initialize(): Promise<void> {
  try {
    // Initialize database
    await database.initialize();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Visitor Personalization Genius API',
    version: '1.0.0',
    endpoints: {
      users: {
        get_all: 'GET /api/users',
        get_by_id: 'GET /api/users/:id',
        create: 'POST /api/users'
      },
      projects: {
        get_all: 'GET /api/projects',
        get_by_id: 'GET /api/projects/:id',
        create: 'POST /api/projects'
      }
    }
  });
});

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);

// Start server
async function start(): Promise<void> {
  await initialize();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  await database.close();
  process.exit(0);
});

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
