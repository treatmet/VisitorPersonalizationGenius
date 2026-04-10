import { Router } from 'express';
import { handleDecide } from '../controllers/personalizationController';

const router = Router();

router.post('/decide', handleDecide); // Later we can add middleware such as auth, rate limiting, or request logging

export default router;
