import { Router } from 'express';
import { handleDecide } from '../controllers/personalizationController';

const router = Router();

router.post('/decide', handleDecide);

export default router;
