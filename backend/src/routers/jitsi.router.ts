import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import prisma from '../db/prisma';
import { config } from '../config';
import { SignJWT, importPKCS8 } from 'jose';

const router = Router();

router.get('/token/:course_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = parseInt(req.params.course_id, 10);
    if (isNaN(courseId)) {
      res.status(400).json({ message: 'Invalid course ID' });
      return;
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    // Determine if user is moderator
    const userRole = (req.user as any)?.role;
    const userIdStr = (req.user as any)?.sub;
    const userId = parseInt(userIdStr, 10);
    const isModerator = userRole === 'teacher' && course.teacher_id === userId;

    let userInfo;
    if (userRole === 'teacher') {
      userInfo = await prisma.teacher.findUnique({ where: { id: userId } });
    } else {
      userInfo = await prisma.student.findUnique({ where: { id: userId } });
    }

    if (!userInfo) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const firstName = (userInfo as any).first_name || (userInfo as any).name || '';
    const lastName = (userInfo as any).last_name || (userInfo as any).surname || '';
    const email = (userInfo as any).email || '';

    const payload = {
      iss: 'chat',
      aud: config.JITSI_APP_ID,
      exp: Math.floor(Date.now() / 1000) + 3600,
      nbf: Math.floor(Date.now() / 1000) - 10,
      sub: config.JITSI_APP_ID,
      context: {
        user: {
          id: String(userId),
          name: `${firstName} ${lastName}`.trim(),
          email: email,
          moderator: isModerator,
        },
        features: {
          livestreaming: false,
          recording: false,
          transcription: false,
          'outbound-call': false,
        },
      },
      room: '*',
    };

    const key = await importPKCS8(config.JITSI_APP_SECRET, 'RS256');
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: config.JITSI_API_KEY })
      .sign(key);

    res.json({
      token,
      domain: config.JITSI_DOMAIN,
      room_name: `${config.JITSI_APP_ID}/course-${courseId}`,
    });
  } catch (error) {
    console.error('Jitsi token generation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
