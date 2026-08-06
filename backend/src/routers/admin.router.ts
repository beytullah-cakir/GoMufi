import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import prisma from '../db/prisma';
import { config } from '../config';
import bcrypt from 'bcryptjs';

const router = Router();

// All endpoints require auth and admin role
router.use(authMiddleware);
router.use(requireRole('admin'));

// --- USERS ---

// GET /admin/users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        enrollments: {
          include: {
            course: true
          }
        }
      }
    });
    const teachers = await prisma.teacher.findMany();
    
    res.json({ students, teachers });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/users
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { role, email, first_name, last_name, password, ...otherFields } = req.body;
    
    if (!role || !['student', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'Valid role (student or teacher) is required' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let user;
    if (role === 'student') {
      user = await prisma.student.create({
        data: {
          email,
          first_name,
          last_name,
          password: hashedPassword,
          ...otherFields
        }
      });
    } else {
      user = await prisma.teacher.create({
        data: {
          email,
          first_name,
          last_name,
          password: hashedPassword,
          ...otherFields
        }
      });
    }
    
    res.status(201).json({ 
      message: 'User created', 
      user_id: user.id,
      role 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /admin/users/:role/:user_id
router.put('/users/:role/:user_id', async (req: Request, res: Response) => {
  try {
    const { role, user_id } = req.params;
    const updateData = { ...req.body };
    
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    
    let user;
    if (role === 'student') {
      user = await prisma.student.update({
        where: { id: Number(user_id) },
        data: updateData
      });
    } else if (role === 'teacher') {
      user = await prisma.teacher.update({
        where: { id: Number(user_id) },
        data: updateData
      });
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    res.json({ message: 'User updated', user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /admin/users/:role/:user_id
router.delete('/users/:role/:user_id', async (req: Request, res: Response) => {
  try {
    const { role, user_id } = req.params;
    
    if (role === 'student') {
      await prisma.student.delete({
        where: { id: Number(user_id) }
      });
    } else if (role === 'teacher') {
      await prisma.teacher.delete({
        where: { id: Number(user_id) }
      });
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/users/student/:student_id/enroll
router.post('/users/student/:student_id/enroll', async (req: Request, res: Response) => {
  try {
    const { student_id } = req.params;
    const { course_id } = req.body;
    
    if (!course_id) {
      return res.status(400).json({ error: 'Course ID is required' });
    }
    
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        student_id_course_id: {
          student_id: Number(student_id),
          course_id: Number(course_id)
        }
      }
    });
    
    if (!enrollment) {
      await prisma.enrollment.create({
        data: {
          student_id: Number(student_id),
          course_id: Number(course_id)
        }
      });
    }
    
    res.json({ message: 'Student enrolled' });
  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /admin/users/student/:student_id/enroll/:course_id
router.delete('/users/student/:student_id/enroll/:course_id', async (req: Request, res: Response) => {
  try {
    const { student_id, course_id } = req.params;
    
    await prisma.enrollment.delete({
      where: {
        student_id_course_id: {
          student_id: Number(student_id),
          course_id: Number(course_id)
        }
      }
    });
    
    res.json({ message: 'Student unenrolled' });
  } catch (error) {
    console.error('Error unenrolling student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- COURSES ---

// GET /admin/courses
router.get('/courses', async (req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        teacher: true,
        _count: {
          select: { enrollments: true }
        }
      }
    });
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/courses
router.post('/courses', async (req: Request, res: Response) => {
  try {
    const { teacher_id, ...courseData } = req.body;
    
    if (!teacher_id) {
      return res.status(400).json({ error: 'teacher_id is required' });
    }
    
    const course = await prisma.course.create({
      data: {
        teacher_id: Number(teacher_id),
        ...courseData
      }
    });
    
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /admin/courses/:course_id
router.put('/courses/:course_id', async (req: Request, res: Response) => {
  try {
    const { course_id } = req.params;
    const updateData = req.body;
    
    const course = await prisma.course.update({
      where: { id: Number(course_id) },
      data: updateData
    });
    
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /admin/courses/:course_id
router.delete('/courses/:course_id', async (req: Request, res: Response) => {
  try {
    const { course_id } = req.params;
    
    await prisma.course.delete({
      where: { id: Number(course_id) }
    });
    
    res.json({ message: 'Course deleted' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- QUIZZES ---

// GET /admin/quizzes
router.get('/quizzes', async (req: Request, res: Response) => {
  try {
    const quizzes = await prisma.quiz.findMany();
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/quizzes
router.post('/quizzes', async (req: Request, res: Response) => {
  try {
    const quizData = req.body;
    
    const quiz = await prisma.quiz.create({
      data: quizData
    });
    
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /admin/quizzes/:quiz_id
router.put('/quizzes/:quiz_id', async (req: Request, res: Response) => {
  try {
    const { quiz_id } = req.params;
    const updateData = req.body;
    
    const quiz = await prisma.quiz.update({
      where: { id: Number(quiz_id) },
      data: updateData
    });
    
    res.json(quiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /admin/quizzes/:quiz_id
router.delete('/quizzes/:quiz_id', async (req: Request, res: Response) => {
  try {
    const { quiz_id } = req.params;
    
    await prisma.quiz.delete({
      where: { id: Number(quiz_id) }
    });
    
    res.json({ message: 'Quiz deleted' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
