import express, { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import prisma from '../db/prisma';
import fs from 'fs';
import path from 'path';
import { cacheMiddleware, invalidateCache, CacheKeys } from '../middleware/cache.middleware';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = path.join(process.cwd(), 'static', 'uploads');
    if (file.fieldname === 'image') {
      dir = path.join(process.cwd(), 'static', 'uploads', 'images');
    }
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/upload-chat-file', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const file_url = `/static/uploads/${req.file.filename}`;
  res.json({ file_url, file_name: req.file.originalname });
});

router.post('/upload-image', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  const image_url = `/static/uploads/images/${req.file.filename}`;
  res.json({ image_url });
});

const TEMPLATES_PATH = path.join(__dirname, '../../slide_templates.json');

const getTemplates = () => {
  try {
    if (!fs.existsSync(TEMPLATES_PATH)) {
      return [];
    }
    const data = fs.readFileSync(TEMPLATES_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

const saveTemplates = (templates: any[]) => {
  fs.writeFileSync(TEMPLATES_PATH, JSON.stringify(templates, null, 2));
};

// ─── GET /templates — Redis cache (TTL: 1 saat) ──────────────────────────────
router.get('/templates', cacheMiddleware(() => CacheKeys.templates(), 3600), (req, res) => {
  const templates = getTemplates();
  res.json(templates);
});

// ─── POST /templates — Oluştur + Cache Invalidate ────────────────────────────
router.post('/templates', authMiddleware, async (req, res) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const newTemplate = req.body;
  if (!newTemplate.id) {
    newTemplate.id = Date.now().toString();
  }

  const templates = getTemplates();
  templates.push(newTemplate);
  saveTemplates(templates);
  await invalidateCache(CacheKeys.templates());

  res.status(201).json({ message: 'Template created', template: newTemplate });
});

// ─── PUT /templates/:id — Güncelle + Cache Invalidate ────────────────────────
router.put('/templates/:template_id', authMiddleware, async (req, res) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const { template_id } = req.params;
  const updates = req.body;
  
  const templates = getTemplates();
  const index = templates.findIndex((t: any) => String(t.id) === String(template_id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  templates[index] = { ...templates[index], ...updates };
  saveTemplates(templates);
  await invalidateCache(CacheKeys.templates());

  res.json({ message: 'Template updated', template: templates[index] });
});

// ─── DELETE /templates/:id — Sil + Cache Invalidate ─────────────────────────
router.delete('/templates/:template_id', authMiddleware, async (req, res) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const { template_id } = req.params;
  
  let templates = getTemplates();
  const initialLength = templates.length;
  templates = templates.filter((t: any) => String(t.id) !== String(template_id));
  
  if (templates.length === initialLength) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  saveTemplates(templates);
  await invalidateCache(CacheKeys.templates());

  res.json({ message: 'Template deleted' });
});

export default router;

