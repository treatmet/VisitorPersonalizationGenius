import { Router } from 'express';
import { handleCapture } from '../controllers/visitorController';

const router = Router();

router.post('/capture', handleCapture); // Later we can add middleware such as auth, rate limiting, or request logging

export default router;
