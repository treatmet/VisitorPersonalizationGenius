/**
 * Type definitions for the application
 */

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  userId: number;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
