# Visitor Personalization Genius

A TypeScript-based backend service for managing visitors and their personalized projects. Built with Express.js and SQLite.

## Project Structure

```
├── src/
│   ├── index.ts              # Main server entry point
│   ├── db/
│   │   └── database.ts       # SQLite database setup and utilities
│   ├── routes/
│   │   ├── users.ts          # Users API endpoints
│   │   └── projects.ts       # Projects API endpoints
│   └── types/
│       └── index.ts          # TypeScript type definitions
├── package.json              # Project dependencies
├── tsconfig.json             # TypeScript configuration
├── .gitignore                # Git ignore rules
└── README.md                 # This file
```

## Features

- **Express.js API Server** - RESTful API with TypeScript support
- **SQLite Database** - Lightweight database with table relationships
- **Two API Endpoints**:
  - `/api/users` - Manage users (create, read)
  - `/api/projects` - Manage projects (create, read)
- **Type Safety** - Full TypeScript support with interfaces
- **Database Layer** - Promise-based database wrapper for clean async/await syntax

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

### Running the Server

**Development mode** (with hot reload):

```bash
npm run dev
```

**Production mode**:

```bash
npm start
```

The server will start on `http://localhost:3000`

## API Documentation

### Health Check

**GET** `/`

Returns API information and available endpoints.

```bash
curl http://localhost:3000
```

### Users Endpoints

#### Get All Users

**GET** `/api/users`

```bash
curl http://localhost:3000/api/users
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "message": "Retrieved 1 users"
}
```

#### Get User by ID

**GET** `/api/users/:id`

```bash
curl http://localhost:3000/api/users/1
```

#### Create User

**POST** `/api/users`

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

**Request body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Projects Endpoints

#### Get All Projects

**GET** `/api/projects`

```bash
curl http://localhost:3000/api/projects
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Project Alpha",
      "description": "A test project",
      "userId": 1,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "message": "Retrieved 1 projects"
}
```

#### Get Project by ID

**GET** `/api/projects/:id`

```bash
curl http://localhost:3000/api/projects/1
```

#### Create Project

**POST** `/api/projects`

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"title": "Project Alpha", "description": "A test project", "userId": 1}'
```

**Request body:**

```json
{
  "title": "Project Alpha",
  "description": "A test project",
  "userId": 1
}
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Projects Table

```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  userId INTEGER NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
)
```

## Development

### Building the Project

```bash
npm run build
```

Compiles TypeScript to JavaScript in the `dist/` directory.

### Running in Development

```bash
npm run dev
```

Uses `ts-node` to run TypeScript directly without compilation.

## Project Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run development server with ts-node
- `npm start` - Run production server
- `npm test` - Run tests (not yet implemented)

## Notes

- The SQLite database file (`data.sqlite`) is created automatically on first run
- All timestamps are stored in ISO format (CURRENT_TIMESTAMP in SQLite)
- The database is initialized automatically when the server starts
- All API responses follow a consistent format with `success`, `data`, and optional `error`/`message` fields

## Future Enhancements

- Add authentication and authorization
- Implement request validation middleware
- Add unit and integration tests
- Add API documentation with Swagger/OpenAPI
- Implement pagination for list endpoints
- Add update and delete operations
- Add logging and error handling improvements
- Deploy to production environment

## License

ISC
