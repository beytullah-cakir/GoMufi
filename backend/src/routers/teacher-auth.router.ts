import { Router } from 'express';
import prisma from '../db/prisma';
import { config } from '../config';
import { createAccessToken, setAuthCookie } from '../core/auth';
import { authRateLimiter } from '../middleware/rate-limit.middleware';
import bcrypt from 'bcryptjs';

const router = Router();

router.post('/teacher/register', authRateLimiter, async (req, res) => {
  try {
    const { first_name, last_name, email, password, expertises, bio } = req.body;

    const existingTeacher = await prisma.teacher.findUnique({
      where: { email }
    });

    if (existingTeacher) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const teacher = await prisma.teacher.create({
      data: {
        first_name,
        last_name,
        email,
        password: hashedPassword,
        expertises,
        bio
      }
    });

    res.status(201).json({ message: 'Teacher registered successfully', teacher_id: teacher.id, role: 'teacher' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/teacher/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    let role = 'teacher';
    let user;

    if (email === config.ADMIN_EMAIL) {
      role = 'admin';
      user = await prisma.teacher.findUnique({ where: { email } });
      if (!user) {
        const hashedPassword = await bcrypt.hash(password, 12);
        user = await prisma.teacher.create({
          data: {
            email,
            password: hashedPassword,
            first_name: 'Admin',
            last_name: 'User'
          }
        });
      }
    } else {
      user = await prisma.teacher.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password || '');
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    const token = createAccessToken(user.id.toString(), role);
    setAuthCookie(res, token);

    res.json({ message: 'Login successful', role, user_id: user.id, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
