import { Router } from 'express';
import prisma from '../db/prisma';
import { config } from '../config';
import { createAccessToken, setAuthCookie } from '../core/auth';
import { authMiddleware } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rate-limit.middleware';
import bcrypt from 'bcryptjs';

const router = Router();

function generateStudentCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'ST-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

router.post('/student/register', authRateLimiter, async (req, res) => {
  try {
    const { first_name, last_name, email, password, nickname, grade_level, education_level } = req.body;

    const existingStudent = await prisma.student.findUnique({
      where: { email }
    });

    if (existingStudent) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let student_code = generateStudentCode();
    let isCodeUnique = false;

    while (!isCodeUnique) {
      const existingCode = await prisma.student.findUnique({
        where: { student_code }
      });
      if (!existingCode) {
        isCodeUnique = true;
      } else {
        student_code = generateStudentCode();
      }
    }

    const student = await prisma.student.create({
      data: {
        first_name,
        last_name,
        email,
        password: hashedPassword,
        nickname,
        grade_level,
        education_level,
        student_code,
      }
    });

    res.status(201).json({ message: 'Student registered successfully', student_id: student.id, role: 'student' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/student/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    let role = 'student';
    let user;

    if (email === config.ADMIN_EMAIL) {
      role = 'admin';
      user = await prisma.student.findUnique({ where: { email } });
      if (!user) {
        const hashedPassword = await bcrypt.hash(password, 12);
        user = await prisma.student.create({
          data: {
            email,
            password: hashedPassword,
            first_name: 'Admin',
            last_name: 'User',
            student_code: 'ADMIN-1',
          }
        });
      }
    } else {
      user = await prisma.student.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'Student not found' });
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

// ─── Parent Auth ─────────────────────────────────────────────────────────────

router.post('/parent/register', authRateLimiter, async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    const existingParent = await prisma.parent.findUnique({
      where: { email }
    });

    if (existingParent) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const parent = await prisma.parent.create({
      data: {
        first_name,
        last_name,
        email,
        hashed_password: hashedPassword,
      }
    });

    res.status(201).json({ message: 'Parent registered successfully', parent_id: parent.id, role: 'parent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/parent/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const parent = await prisma.parent.findUnique({ where: { email } });
    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const isValidPassword = await bcrypt.compare(password, parent.hashed_password || '');
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createAccessToken(parent.id.toString(), 'parent');
    setAuthCookie(res, token);

    res.json({ message: 'Login successful', role: 'parent', user_id: parent.id, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/complete-profile', authMiddleware, async (req: any, res) => {
  try {
    const { nickname, grade_level, education_level, first_name, last_name, bio, expertises } = req.body;
    const { userId, role } = req.user;

    if (role === 'student' || role === 'admin') {
      await prisma.student.update({
        where: { id: userId },
        data: {
          nickname,
          grade_level,
          education_level,
          first_name,
          last_name
        }
      });
    } else if (role === 'teacher') {
      await prisma.teacher.update({
        where: { id: userId },
        data: {
          first_name,
          last_name,
          bio,
          expertises
        }
      });
    }

    res.json({ message: 'Profile completed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
