import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configure multer for homework uploads
const hwUpload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 5 * 1024 * 1024 } 
});

// Helper Functions
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes confusing characters like I, O, 0, 1

async function generateEnrollmentCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    let code = '';
    for (let j = 0; j < 6; j++) {
      code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }
    const existing = await prisma.course.findUnique({
      where: { enrollment_code: code }
    });
    if (!existing) {
      return code;
    }
  }
  throw new Error('Could not generate a unique enrollment code');
}

async function populateCourseNotes(courses: any[]) {
  for (const course of courses) {
    const lessonContents = await prisma.lessonContent.findMany({
      where: { course_id: course.id }
    });
    
    let combinedNotes = [...(Array.isArray(course.notes) ? (course.notes as any[]) : [])];
    const notesByNodeId = new Map();
    
    // Add legacy notes
    for (const note of combinedNotes) {
      if (note && typeof note === 'object' && (note.node_id || note.id)) {
        const idKey = String(note.node_id || note.id);
        notesByNodeId.set(idKey, note);
      }
    }
    
    // Override with relational lesson contents
    for (const lc of lessonContents) {
      const slides = typeof lc.slides === 'string' ? JSON.parse(lc.slides) : lc.slides;
      const noteObj = {
        id: lc.node_id,
        node_id: lc.node_id,
        title: lc.title,
        slides: Array.isArray(slides) ? slides : []
      };
      notesByNodeId.set(String(lc.node_id), noteObj);
    }
    
    const allRelationalNotes = Array.from(notesByNodeId.values());
    course.notes = allRelationalNotes;

    // Enrich curriculum items with their respective slides
    if (Array.isArray(course.curriculum)) {
      course.curriculum = course.curriculum.map((node: any, idx: number) => {
        if (!node) return node;
        const targetKey1 = String(node.node_id || node.id || '');
        const targetKey2 = String(node.id || '');
        const matchingNote = notesByNodeId.get(targetKey1) || 
                             notesByNodeId.get(targetKey2) || 
                             allRelationalNotes[idx];
                             
        if (matchingNote && Array.isArray(matchingNote.slides) && matchingNote.slides.length > 0) {
          return {
            ...node,
            node_id: node.node_id || node.id || matchingNote.node_id || matchingNote.id,
            slides: matchingNote.slides
          };
        }
        return node;
      });
    }

    if (Array.isArray(course.nodes)) {
      course.nodes = course.nodes.map((node: any, idx: number) => {
        if (!node) return node;
        const targetKey1 = String(node.node_id || node.id || '');
        const targetKey2 = String(node.id || '');
        const matchingNote = notesByNodeId.get(targetKey1) || 
                             notesByNodeId.get(targetKey2) || 
                             allRelationalNotes[idx];
                             
        if (matchingNote && Array.isArray(matchingNote.slides) && matchingNote.slides.length > 0) {
          return {
            ...node,
            node_id: node.node_id || node.id || matchingNote.node_id || matchingNote.id,
            slides: matchingNote.slides
          };
        }
        return node;
      });
    }
  }
  return courses;
}

// Normalization Helpers
function normalizeStyle(style: any) {
  if (!style) return {};
  return {
    bold: style.bold ?? null,
    italic: style.italic ?? null,
    underline: style.underline ?? null,
    color: style.color ?? null,
    fontSize: style.fontSize ?? null,
    fontFamily: style.fontFamily ?? null,
    backgroundColor: style.backgroundColor ?? null,
    textAlign: style.textAlign ?? null,
    verticalAlign: style.verticalAlign ?? null,
    borderRadius: style.borderRadius ?? null,
    borderColor: style.borderColor ?? null,
    borderWidth: style.borderWidth ?? null,
    borderPosition: style.borderPosition ?? null,
    opacity: style.opacity ?? null
  };
}

function normalizeCodeConfig(cfg: any) {
  if (!cfg) return null;
  return {
    language: cfg.language ?? null,
    expectedOutput: cfg.expectedOutput ?? null,
    hint: cfg.hint ?? null,
    runnable: cfg.runnable ?? null,
    theme: cfg.theme ?? null,
    enableAutocomplete: cfg.enableAutocomplete ?? null
  };
}

function normalizeArrowConfig(cfg: any) {
  if (!cfg) return null;
  return {
    start: cfg.start ? { x: cfg.start.x ?? null, y: cfg.start.y ?? null } : null,
    end: cfg.end ? { x: cfg.end.x ?? null, y: cfg.end.y ?? null } : null,
    startConnectedElementId: cfg.startConnectedElementId ?? null,
    endConnectedElementId: cfg.endConnectedElementId ?? null,
    startSide: cfg.startSide ?? null,
    endSide: cfg.endSide ?? null,
    customChannel: cfg.customChannel ?? null,
    customStartOffset: cfg.customStartOffset ?? null,
    customEndOffset: cfg.customEndOffset ?? null,
    arrowStyle: cfg.arrowStyle ?? null
  };
}

function normalizeElement(el: any) {
  if (!el || typeof el !== 'object') return {};
  return {
    id: el.id ?? null,
    type: el.type ?? null,
    shapeType: el.shapeType ?? null,
    x: el.x ?? null,
    y: el.y ?? null,
    width: el.width ?? null,
    height: el.height ?? null,
    rotation: el.rotation ?? null,
    content: el.content ?? null,
    src: el.src ?? null,
    imageUrl: el.imageUrl ?? null,
    videoUrl: el.videoUrl ?? null,
    style: normalizeStyle(el.style),
    extra: el.extra ?? null,
    codeConfig: normalizeCodeConfig(el.codeConfig),
    arrowConfig: normalizeArrowConfig(el.arrowConfig)
  };
}

function normalizeSlide(slide: any) {
  if (!slide || typeof slide !== 'object') return {};
  const elements = Array.isArray(slide.elements) ? slide.elements.map(normalizeElement) : [];

  // homeworkConfig: preserve the full object if provided; only fall back to null if truly absent
  let homeworkConfig = null;
  if (slide.homeworkConfig !== undefined) {
    // Keep whatever the frontend sent (could be an object or null)
    homeworkConfig = slide.homeworkConfig;
  }

  return {
    id: slide.id ?? null,
    type: slide.type ?? 'normal',
    gameType: slide.gameType ?? null,
    gameConfig: slide.gameConfig ?? null,
    homeworkConfig,
    elements,
    connections: Array.isArray(slide.connections) ? slide.connections : null,
    background: slide.background ?? 'default',
    backgroundColor: slide.backgroundColor ?? null
  };
}

// Endpoints

router.get('/my-content', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = parseInt(user.sub, 10);

    let courses: any[] = [];

    if (user.role === 'student' || user.role === 'admin') {
      const enrollments = await prisma.enrollment.findMany({
        where: { student_id: userId },
        include: {
          course: {
            include: {
              teacher: true,
              _count: { select: { enrollments: true } }
            }
          }
        }
      });
      courses = enrollments.map(e => e.course).filter(Boolean);
    } else if (user.role === 'teacher') {
      courses = await prisma.course.findMany({
        where: { teacher_id: userId },
        include: {
          teacher: true,
          _count: { select: { enrollments: true } }
        }
      });
    }

    const formatted = courses.map(c => ({
      ...c,
      students_count: c._count ? c._count.enrollments : 0
    }));

    const populated = await populateCourseNotes(formatted);
    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch content' });
  }
});

router.get('/my-schedule', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = parseInt(user.sub, 10);

    let sessions;
    if (user.role === 'admin') {
      sessions = await prisma.liveSession.findMany({
        include: { course: true }
      });
    } else { // student
      const enrollments = await prisma.enrollment.findMany({
        where: { student_id: userId },
        select: { course_id: true }
      });
      const courseIds = enrollments.map(e => e.course_id).filter((id): id is number => id !== null);
      sessions = await prisma.liveSession.findMany({
        where: { course_id: { in: courseIds } },
        include: { course: true }
      });
    }
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch schedule' });
  }
});

router.post('/enroll/:course_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const courseId = parseInt(req.params['course_id'], 10);
    const userId = parseInt(user.sub, 10);

    if (user.role !== 'student' && user.role !== 'admin') {
      res.status(403).json({ error: 'Only students can enroll' });
      return;
    }

    const existing = await prisma.enrollment.findFirst({
      where: { course_id: courseId, student_id: userId }
    });

    if (existing) {
      res.status(400).json({ error: 'Already enrolled' });
      return;
    }

    await prisma.enrollment.create({
      data: {
        course_id: courseId,
        student_id: userId
      }
    });

    res.json({ message: 'Enrolled successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to enroll' });
  }
});

router.post('/enroll-by-code', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = parseInt(user.sub, 10);
    const { code } = req.body;

    if (user.role !== 'student' && user.role !== 'admin') {
      res.status(403).json({ error: 'Only students can enroll' });
      return;
    }

    const course = await prisma.course.findFirst({
      where: { enrollment_code: { equals: code.toUpperCase() } }
    });

    if (!course) {
      res.status(404).json({ error: 'Invalid enrollment code' });
      return;
    }

    const existing = await prisma.enrollment.findFirst({
      where: { course_id: course.id, student_id: userId }
    });

    if (existing) {
      res.status(400).json({ error: 'Already enrolled' });
      return;
    }

    await prisma.enrollment.create({
      data: {
        course_id: course.id,
        student_id: userId
      }
    });

    res.json({ message: 'Enrolled successfully', course_id: course.id, course_title: course.title });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to enroll' });
  }
});

router.get('/courses', async (_req: Request, res: Response): Promise<void> => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        teacher: true,
        _count: { select: { enrollments: true } }
      }
    });
    
    const result = courses.map(c => ({
      ...c,
      students_count: c._count.enrollments
    }));
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch courses' });
  }
});

router.get('/courses/:course_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const courseId = parseInt(req.params['course_id'], 10);
    const userId = parseInt(user.sub, 10);

    let course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { teacher: true }
    });

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Auto-generate enrollment code if missing
    if (!course.enrollment_code) {
      const code = await generateEnrollmentCode();
      course = await prisma.course.update({
        where: { id: course.id },
        data: { enrollment_code: code },
        include: { teacher: true }
      });
    }

    const populated = await populateCourseNotes([course]);
    const finalCourse = populated[0];

    // Hide enrollment code if not admin and not owner
    if (user.role !== 'admin' && userId !== finalCourse.teacher_id) {
      finalCourse.enrollment_code = null;
    }

    res.json(finalCourse);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch course' });
  }
});

router.get('/teacher/content', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = parseInt(user.sub, 10);

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    let courses = await prisma.course.findMany({
      where: user.role === 'admin' ? {} : { teacher_id: userId },
      include: { teacher: true }
    });

    for (let i = 0; i < courses.length; i++) {
      if (!courses[i].enrollment_code) {
        const code = await generateEnrollmentCode();
        courses[i] = await prisma.course.update({
          where: { id: courses[i].id },
          data: { enrollment_code: code },
          include: { teacher: true }
        });
      }
    }

    const populated = await populateCourseNotes(courses);
    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch teacher content' });
  }
});

router.get('/teacher/students', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = parseInt(user.sub, 10);

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const courses = await prisma.course.findMany({
      where: user.role === 'admin' ? {} : { teacher_id: userId },
      select: { id: true, title: true }
    });

    const courseIds = courses.map(c => c.id);
    const courseTitleMap = new Map(courses.map(c => [c.id, c.title]));

    const enrollments = await prisma.enrollment.findMany({
      where: { course_id: { in: courseIds } },
      include: { student: true }
    });

    const result = enrollments.filter(e => e.student).map(e => ({
      student_id: e.student_id,
      first_name: e.student!.first_name || '',
      last_name: e.student!.last_name || '',
      email: e.student!.email || '',
      course_title: courseTitleMap.get(e.course_id || 0) || '',
      enrolled_at: e.enrolled_at,
      progress: 0,
      status: 'active'
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch students' });
  }
});

router.post('/create_course', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = parseInt(user.sub, 10);

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const { title, description, category, price, learning_outcomes, requirements, curriculum, notes, rating, schedule, classes, start_date } = req.body;

    if (!curriculum || (Array.isArray(curriculum) && curriculum.length === 0)) {
      res.status(400).json({ error: 'Curriculum cannot be empty' });
      return;
    }

    const enrollment_code = await generateEnrollmentCode();

    const course = await prisma.course.create({
      data: {
        title,
        description,
        category,
        price: price || 0,
        learning_outcomes: learning_outcomes || [],
        requirements: requirements || [],
        curriculum,
        notes: notes || [],
        rating: rating || 5,
        schedule: schedule || [],
        classes: classes || [],
        start_date: start_date ? String(start_date) : null,
        teacher_id: userId,
        enrollment_code
      }
    });

    res.json(course);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create course' });
  }
});

router.put('/update_course/:course_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const courseId = parseInt(req.params['course_id'], 10);
    const userId = parseInt(user.sub, 10);

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    if (user.role !== 'admin' && course.teacher_id !== userId) {
      res.status(403).json({ error: 'Not your course' });
      return;
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: req.body
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update course' });
  }
});

router.delete('/delete_course/:course_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const courseId = parseInt(req.params['course_id'], 10);
    const userId = parseInt(user.sub, 10);

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    if (user.role !== 'admin' && course.teacher_id !== userId) {
      res.status(403).json({ error: 'Not your course' });
      return;
    }

    // Delete in order
    await prisma.$transaction([
      prisma.quiz.deleteMany({ where: { course_id: courseId } }),
      prisma.liveSession.deleteMany({ where: { course_id: courseId } }),
      prisma.enrollment.deleteMany({ where: { course_id: courseId } }),
      prisma.homeworkSubmission.deleteMany({ where: { course_id: courseId } }),
      prisma.lessonContent.deleteMany({ where: { course_id: courseId } }),
      prisma.course.delete({ where: { id: courseId } })
    ]);

    res.json({ message: 'Course deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete course' });
  }
});

router.post('/start-session/:course_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const userId = parseInt(user.sub, 10);
    const title = req.query['title'] as string;

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    if (user.role !== 'admin' && course.teacher_id !== userId) {
      res.status(403).json({ error: 'Not your course' });
      return;
    }

    let session = await prisma.liveSession.findFirst({
      where: { course_id: courseId, status: 'live' }
    });

    if (!session) {
      session = await prisma.liveSession.create({
        data: {
          course_id: courseId,
          status: 'live',
          title: title || course.title,
          start_time: new Date().toISOString()
        }
      });
    }

    res.json({ message: 'Session started', session_id: session.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to start session' });
  }
});

router.get('/session-status/:course_id', async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = parseInt(req.params['course_id'], 10);
    const session = await prisma.liveSession.findFirst({
      where: { course_id: courseId, status: 'live' }
    });

    if (session) {
      res.json({ is_live: true, session_id: session.id, title: session.title });
    } else {
      res.json({ is_live: false });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get session status' });
  }
});

router.post('/stop-session/:course_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const userId = parseInt(user.sub, 10);

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    if (user.role !== 'admin' && course.teacher_id !== userId) {
      res.status(403).json({ error: 'Not your course' });
      return;
    }

    const session = await prisma.liveSession.findFirst({
      where: { course_id: courseId, status: 'live' }
    });

    if (session) {
      await prisma.liveSession.update({
        where: { id: session.id },
        data: { status: 'completed' }
      });
      res.json({ message: 'Session stopped', session_id: session.id });
    } else {
      res.status(404).json({ error: 'No live session found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to stop session' });
  }
});

router.get('/courses/:course_id/lessons/:node_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const nodeId = req.params['node_id'];
    const userId = parseInt(user.sub, 10);

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    if (user.role === 'student') {
      const enrolled = await prisma.enrollment.findFirst({
        where: { course_id: courseId, student_id: userId }
      });
      if (!enrolled) { res.status(403).json({ error: 'Not enrolled' }); return; }
    } else if (user.role === 'teacher' && course.teacher_id !== userId) {
      res.status(403).json({ error: 'Not your course' });
      return;
    }

    const lc = await prisma.lessonContent.findFirst({
      where: { course_id: courseId, node_id: nodeId }
    });

    if (lc) {
      const slides = typeof lc.slides === 'string' ? JSON.parse(lc.slides) : (lc.slides || []);
      res.json({ title: lc.title || '', slides: Array.isArray(slides) ? slides : [] });
      return;
    }

    const legacyNotes = Array.isArray(course.notes) ? course.notes : [];
    const note = legacyNotes.find((n: any) => n && (n.node_id === nodeId || n.id === nodeId));
    
    if (note) {
      const n = note as any;
      res.json({ title: n.title || n.noteTitle || '', slides: Array.isArray(n.slides) ? n.slides : [] });
      return;
    }

    res.status(404).json({ error: 'Lesson not found' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch lesson' });
  }
});

router.put('/courses/:course_id/lessons/:node_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const nodeId = req.params['node_id'];
    const userId = parseInt(user.sub, 10);
    const { title, slides } = req.body;

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    if (user.role !== 'admin' && course.teacher_id !== userId) {
      res.status(403).json({ error: 'Not your course' });
      return;
    }

    const normalizedSlides = Array.isArray(slides) ? slides.map(normalizeSlide) : [];

    const existingLc = await prisma.lessonContent.findFirst({
      where: { course_id: courseId, node_id: nodeId }
    });

    if (existingLc) {
      await prisma.lessonContent.update({
        where: { id: existingLc.id },
        data: { title: title || existingLc.title, slides: normalizedSlides }
      });
    } else {
      await prisma.lessonContent.create({
        data: { course_id: courseId, node_id: nodeId, title: title || '', slides: normalizedSlides }
      });
    }

    // Sync slides into Course model's curriculum field
    let updatedCurriculum = Array.isArray(course.curriculum) ? (course.curriculum as any[]) : [];

    updatedCurriculum = updatedCurriculum.map((node: any) => {
      if (node && (String(node.id) === String(nodeId) || String(node.node_id) === String(nodeId))) {
        return { ...node, title: title || node.title, slides: normalizedSlides };
      }
      return node;
    });

    const legacyNotes = Array.isArray(course.notes) ? course.notes : [];
    const filteredNotes = legacyNotes.filter((n: any) => n && n.node_id !== nodeId && n.id !== nodeId);

    await prisma.course.update({
      where: { id: courseId },
      data: {
        curriculum: updatedCurriculum,
        notes: filteredNotes
      }
    });

    res.json({ success: true, message: 'Lesson updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update lesson' });
  }
});

router.delete('/courses/:course_id/lessons/:node_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const nodeId = req.params['node_id'];
    const userId = parseInt(user.sub, 10);

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    if (user.role !== 'admin' && course.teacher_id !== userId) {
      res.status(403).json({ error: 'Not your course' });
      return;
    }

    await prisma.lessonContent.deleteMany({
      where: { course_id: courseId, node_id: nodeId }
    });

    const legacyNotes = Array.isArray(course.notes) ? course.notes : [];
    const filteredNotes = legacyNotes.filter((n: any) => n && n.node_id !== nodeId && n.id !== nodeId);
    if (filteredNotes.length !== legacyNotes.length) {
      await prisma.course.update({
        where: { id: courseId },
        data: { notes: filteredNotes }
      });
    }

    res.json({ success: true, message: 'Lesson deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete lesson' });
  }
});

router.get('/courses/:course_id/export_roadmap', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const userId = parseInt(user.sub, 10);

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    if (user.role !== 'admin' && course.teacher_id !== userId) {
      res.status(403).json({ error: 'Not your course' });
      return;
    }

    const lessonContents = await prisma.lessonContent.findMany({ where: { course_id: courseId } });
    const quizzes = await prisma.quiz.findMany({ where: { course_id: courseId } });

    const legacyNotes = Array.isArray(course.notes) ? course.notes : [];
    const normalizedNotes = legacyNotes.map((n: any) => ({
      ...n,
      slides: Array.isArray(n.slides) ? n.slides.map(normalizeSlide) : []
    }));

    res.json({
      success: true,
      course_title: course.title,
      curriculum: course.curriculum,
      lesson_contents: lessonContents.map(lc => ({
        node_id: lc.node_id,
        title: lc.title,
        slides: typeof lc.slides === 'string' ? JSON.parse(lc.slides) : lc.slides
      })),
      notes: normalizedNotes,
      quizzes
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to export roadmap' });
  }
});

router.post('/courses/:course_id/import_roadmap', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const userId = parseInt(user.sub, 10);
    const { curriculum, lesson_contents, notes, quizzes } = req.body;

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    if (user.role !== 'admin' && course.teacher_id !== userId) {
      res.status(403).json({ error: 'Not your course' });
      return;
    }

    if (!curriculum || (Array.isArray(curriculum) && curriculum.length === 0)) {
      res.status(400).json({ error: 'Curriculum cannot be empty' });
      return;
    }

    await prisma.$transaction([
      prisma.lessonContent.deleteMany({ where: { course_id: courseId } }),
      prisma.quiz.deleteMany({ where: { course_id: courseId } })
    ]);

    if (Array.isArray(lesson_contents) && lesson_contents.length > 0) {
      await prisma.lessonContent.createMany({
        data: lesson_contents.map((lc: any) => ({
          course_id: courseId,
          node_id: String(lc.node_id),
          title: lc.title || '',
          slides: lc.slides || []
        }))
      });
    }

    if (Array.isArray(quizzes) && quizzes.length > 0) {
      await prisma.quiz.createMany({
        data: quizzes.map((q: any) => ({
          course_id: courseId,
          topic: q.topic || 'Genel',
          question_text: q.question_text || q.text || '',
          correct_answer: q.correct_answer || q.correctAnswer || '',
          explanation: q.explanation || null,
          options: q.options || null,
          difficulty: q.difficulty || 'Orta',
          question_type: q.question_type || q.type || 'multiple-choice',
          section_id: q.section_id || null,
          node_id: q.node_id ? parseInt(q.node_id, 10) : null
        }))
      });
    }

    await prisma.course.update({
      where: { id: courseId },
      data: { curriculum, notes: notes || [] }
    });

    res.json({ success: true, message: 'Roadmap imported successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to import roadmap' });
  }
});

router.post('/class/join', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const studentId = parseInt(user.sub, 10);
    const { code } = req.body;

    if (user.role !== 'student' && user.role !== 'admin') {
      res.status(403).json({ error: 'Only students can join classes' });
      return;
    }

    const courses = await prisma.course.findMany();
    let foundCourse = null;
    let foundClass = null;

    for (const c of courses) {
      const classes = Array.isArray(c.classes) ? (c.classes as any[]) : [];
      const cls = classes.find((cl: any) => cl.code === code);
      if (cls) {
        foundCourse = c;
        foundClass = cls;
        break;
      }
    }

    if (!foundCourse || !foundClass) {
      res.status(404).json({ error: 'Class code not found' });
      return;
    }

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: { course_id: foundCourse.id, student_id: studentId }
    });

    if (!existingEnrollment) {
      await prisma.enrollment.create({
        data: { course_id: foundCourse.id, student_id: studentId }
      });
    }

    const updatedClasses = (Array.isArray(foundCourse.classes) ? (foundCourse.classes as any[]) : []).map((cls: any) => {
      let studentIds = Array.isArray(cls.student_ids) ? cls.student_ids : [];
      studentIds = studentIds.filter((id: any) => String(id) !== user.sub); // remove from other classes
      
      if (cls.code === code) {
        studentIds.push(studentId);
      }
      return { ...cls, student_ids: studentIds };
    });

    await prisma.course.update({
      where: { id: foundCourse.id },
      data: { classes: updatedClasses }
    });

    res.json({ success: true, message: 'Joined class successfully', course_title: foundCourse.title, class_name: foundClass.name });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to join class' });
  }
});

router.get('/student/my-class/:course_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const userIdStr = user.sub;

    if (user.role !== 'student' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    const classes = Array.isArray(course.classes) ? (course.classes as any[]) : [];
    const myClass = classes.find((cls: any) => Array.isArray(cls.student_ids) && cls.student_ids.map(String).includes(userIdStr));

    if (!myClass) {
      res.json({ class_name: null, classmates: [] });
      return;
    }

    const studentIds = (Array.isArray(myClass.student_ids) ? myClass.student_ids : []).map((id: any) => parseInt(id, 10)).filter(Boolean);
    const classmates = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, first_name: true, last_name: true, email: true }
    });

    const formattedClassmates = classmates.map(c => ({
      id: c.id,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      status: 'active',
      avatarSeed: c.id,
      email: c.email
    }));

    res.json({ class_name: myClass.name, classmates: formattedClassmates });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch class info' });
  }
});

router.post('/courses/:course_id/homework/:node_id/submit', authMiddleware, hwUpload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const nodeId = req.params['node_id'];
    const studentId = parseInt(user.sub, 10);
    const { student_note, answer_text } = req.body;
    const finalNote = answer_text || student_note || '';

    if (user.role !== 'student' && user.role !== 'admin') {
      res.status(403).json({ error: 'Only students can submit homework' });
      return;
    }

    const enrolled = await prisma.enrollment.findFirst({
      where: { course_id: courseId, student_id: studentId }
    });
    if (!enrolled) { res.status(403).json({ error: 'Not enrolled in this course' }); return; }

    let file_data: string | null = null;
    let file_name: string | null = null;
    let file_mime: string | null = null;

    if (req.file) {
      file_data = req.file.buffer.toString('base64');
      file_name = req.file.originalname;
      file_mime = req.file.mimetype;
    }

    const existing = await prisma.homeworkSubmission.findFirst({
      where: { course_id: courseId, node_id: nodeId, student_id: studentId }
    });

    if (existing) {
      await prisma.homeworkSubmission.update({
        where: { id: existing.id },
        data: {
          file_data: file_data || existing.file_data,
          file_name: file_name || existing.file_name,
          file_mime: file_mime || existing.file_mime,
          student_note: finalNote || existing.student_note,
          submitted_at: new Date()
        }
      });
    } else {
      await prisma.homeworkSubmission.create({
        data: {
          course_id: courseId,
          node_id: nodeId,
          student_id: studentId,
          file_data: file_data || '',
          file_name: file_name || '',
          file_mime: file_mime || '',
          student_note: finalNote || ''
        }
      });
    }

    res.json({ success: true, message: 'Homework submitted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit homework' });
  }
});

router.get('/courses/:course_id/homework/:node_id/submissions', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const nodeId = req.params['node_id'];
    const userId = parseInt(user.sub, 10);

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    if (user.role !== 'admin' && course.teacher_id !== userId) {
      res.status(403).json({ error: 'Not your course' });
      return;
    }

    const submissions = await prisma.homeworkSubmission.findMany({
      where: { course_id: courseId, node_id: nodeId },
      include: { student: { select: { id: true, first_name: true, last_name: true, email: true } } }
    });

    res.json(submissions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch submissions' });
  }
});

router.get('/courses/:course_id/homework/all-submissions', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const userId = parseInt(user.sub, 10);

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    if (user.role !== 'admin' && course.teacher_id !== userId) {
      res.status(403).json({ error: 'Not your course' });
      return;
    }

    const submissions = await prisma.homeworkSubmission.findMany({
      where: { course_id: courseId },
      include: { student: { select: { id: true, first_name: true, last_name: true, email: true } } },
      orderBy: { submitted_at: 'desc' }
    });

    // Dedup by student + node (keep most recent)
    const dedupedMap = new Map();
    for (const sub of submissions) {
      const key = `${sub.student_id}_${sub.node_id}`;
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, sub);
      }
    }

    const result = Array.from(dedupedMap.values());
    const populated = await populateCourseNotes([course]);
    const notes = (populated[0]?.notes as any[]) || [];

    const finalResult = result.map(sub => {
      const note = notes.find((n: any) => n.node_id === sub.node_id);
      return {
        ...sub,
        node_title: note ? note.title : sub.node_id
      };
    });

    res.json(finalResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch all submissions' });
  }
});

router.get('/courses/:course_id/homework/:node_id/submission', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const nodeId = req.params['node_id'];
    const studentId = parseInt(user.sub, 10);

    const submission = await prisma.homeworkSubmission.findFirst({
      where: { course_id: courseId, node_id: nodeId, student_id: studentId }
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    res.json({ success: true, submission });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch submission' });
  }
});

router.post('/courses/:course_id/homework/:submission_id/approve', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const submissionId = parseInt(req.params['submission_id'], 10);
    const userId = parseInt(user.sub, 10);
    const { feedback } = req.body;

    if (user.role !== 'teacher' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized. Only teachers can approve homework.' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    if (user.role !== 'admin' && course.teacher_id !== userId) {
      res.status(403).json({ error: 'Not your course' });
      return;
    }

    const submission = await prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'approved',
        feedback: feedback || '',
        approved_at: new Date()
      }
    });

    res.json({ success: true, message: 'Homework approved successfully', submission });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to approve homework' });
  }
});

router.delete('/courses/:course_id/homework/:node_id/delete', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = parseInt(req.params['course_id'], 10);
    const nodeId = req.params['node_id'];
    const studentId = parseInt(user.sub, 10);

    if (user.role !== 'student' && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const submission = await prisma.homeworkSubmission.findFirst({
      where: { course_id: courseId, node_id: nodeId, student_id: studentId }
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    await prisma.homeworkSubmission.delete({
      where: { id: submission.id }
    });

    res.json({ success: true, message: 'Submission deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete submission' });
  }
});

export default router;
