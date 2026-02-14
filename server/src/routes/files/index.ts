/**
 * File routes
 */

import type { ExpressRequest, ExpressResponse } from '../../types/express.js';
import express, { type Router } from 'express';

const router: Router = express.Router();

// GET /api/files - List all markdown files
router.get('/', async (_req: ExpressRequest, res: ExpressResponse) => {
  res.json({ files: [], message: 'TODO: Implement file listing' });
});

export { router as filesRouter };
