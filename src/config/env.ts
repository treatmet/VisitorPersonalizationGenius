import path from 'path';

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../data.sqlite'),
  cookieName: 'sg_vid',
  nodeEnv: process.env.NODE_ENV || 'development',
};
