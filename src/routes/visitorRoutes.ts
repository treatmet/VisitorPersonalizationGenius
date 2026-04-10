import { Router } from 'express';
import { handleCapture } from '../controllers/visitorController';

const router = Router();

router.post('/capture', handleCapture);

export default router;
