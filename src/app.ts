import express from 'express';
import cookieParser from 'cookie-parser';
import visitorRoutes from './routes/visitorRoutes';
import personalizationRoutes from './routes/personalizationRoutes';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/v1/visitors', visitorRoutes);
app.use('/v1/personalization', personalizationRoutes);

export default app;
