import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { statsRateLimiter } from '../middleware/rate-limit.middleware';
import prisma from '../db/prisma';
import { config } from '../config';

const router = Router();

router.use(authMiddleware);

router.get(['/', '/profile'], async (req, res) => {
  try {
    const { sub: userIdStr, role } = req.user as any;
    const userId = parseInt(userIdStr, 10);

    if (role === 'admin') {
      const student = await prisma.student.findUnique({ where: { id: userId } });
      const teacher = await prisma.teacher.findUnique({ where: { id: userId } });
      return res.json({ student, teacher, role });
    } else if (role === 'student') {
      const student = await prisma.student.findUnique({ where: { id: userId } });
      return res.json({ ...student, role });
    } else if (role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { id: userId } });
      return res.json({ ...teacher, role });
    } else if (role === 'parent') {
      const parent = await prisma.parent.findUnique({
        where: { id: userId },
        include: { students: true }
      });
      return res.json({ ...parent, role });
    }

    return res.status(400).json({ error: 'Invalid role' });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put(['/update', '/profile/update'], async (req, res) => {
  try {
    const { sub: userIdStr, role } = req.user as any;
    const userId = parseInt(userIdStr, 10);
    const { nickname, grade_level, education_level, first_name, last_name, bio, expertises } = req.body;

    if (role === 'student') {
      await prisma.student.update({
        where: { id: userId },
        data: { nickname, grade_level, education_level }
      });
    } else if (role === 'teacher') {
      await prisma.teacher.update({
        where: { id: userId },
        data: { first_name, last_name, bio, expertises }
      });
    } else {
      return res.status(403).json({ error: 'Unauthorized to update profile' });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/link-student', async (req, res) => {
  try {
    const { sub: userIdStr, role } = req.user as any;
    const userId = parseInt(userIdStr, 10);
    if (role !== 'parent') {
      return res.status(403).json({ error: 'Only parents can link students' });
    }

    const { student_code } = req.body;
    if (!student_code) {
      return res.status(400).json({ error: 'student_code is required' });
    }

    const student = await prisma.student.findFirst({
      where: {
        student_code: {
          equals: student_code,
          mode: 'insensitive'
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: { parent_id: userId }
    });

    res.json({ message: 'Student linked successfully', student: updatedStudent });
  } catch (error) {
    console.error('Link student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/unlink-student/:student_id', async (req, res) => {
  try {
    const { sub: userId, role } = req.user as any;
    if (role !== 'parent') {
      return res.status(403).json({ error: 'Only parents can unlink students' });
    }

    const { student_id } = req.params;
    const studentIdNum = parseInt(student_id as string, 10);
    const userIdNum = parseInt(userId, 10);

    const student = await prisma.student.findFirst({
      where: { id: studentIdNum, parent_id: userIdNum }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found or not linked to this parent' });
    }

    await prisma.student.update({
      where: { id: studentIdNum },
      data: { parent_id: null }
    });

    res.json({ message: 'Student unlinked successfully' });
  } catch (error) {
    console.error('Unlink student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/parent/teachers', async (req, res) => {
  try {
    const { sub: userId, role } = req.user as any;
    const userIdNum = parseInt(userId, 10);
    if (role !== 'parent') {
      return res.status(403).json({ error: 'Only parents can access this' });
    }

    const students = await prisma.student.findMany({
      where: { parent_id: userIdNum },
      include: {
        enrollments: {
          include: {
            course: {
              include: {
                teacher: true
              }
            }
          }
        }
      }
    });

    const teachersMap = new Map();
    for (const student of students) {
      for (const enrollment of student.enrollments) {
        if (enrollment.course && enrollment.course.teacher) {
          const teacher = enrollment.course.teacher;
          teachersMap.set(teacher.id, {
            id: teacher.id,
            first_name: teacher.first_name,
            last_name: teacher.last_name,
            email: teacher.email,
          });
        }
      }
    }

    const teachers = Array.from(teachersMap.values());
    res.json(teachers);
  } catch (error) {
    console.error('Get parent teachers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/parent/student/:student_id', async (req, res) => {
  try {
    const { sub: userId, role } = req.user as any;
    const userIdNum = parseInt(userId, 10);
    if (role !== 'parent') {
      return res.status(403).json({ error: 'Only parents can access this' });
    }

    const { student_id } = req.params;
    const studentIdNum = parseInt(student_id as string, 10);

    const student = await prisma.student.findFirst({
      where: { id: studentIdNum, parent_id: userIdNum },
      include: {
        enrollments: {
          include: {
            course: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found or not linked to this parent' });
    }

    res.json(student);
  } catch (error) {
    console.error('Get parent student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/student/stats', statsRateLimiter, async (req, res) => {
  try {
    const { sub: userIdStr } = req.user as any;
    const userId = parseInt(userIdStr, 10);
    const { xp_gain = 0, gems_gain = 0, hearts_change = 0 } = req.body;

    const currentStudent = await prisma.student.findUnique({
      where: { id: userId }
    });

    if (!currentStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const newHearts = Math.min(5, Math.max(0, (currentStudent.hearts || 0) + hearts_change));
    const newXp = (currentStudent.xp || 0) + xp_gain;
    const newGems = (currentStudent.gems || 0) + gems_gain;

    const updatedStudent = await prisma.student.update({
      where: { id: userId },
      data: {
        xp: newXp,
        gems: newGems,
        hearts: newHearts,
      }
    });

    res.json({
      message: 'Stats updated',
      gems: updatedStudent.gems,
      hearts: updatedStudent.hearts,
      xp: updatedStudent.xp
    });
  } catch (error) {
    console.error('Student stats update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
