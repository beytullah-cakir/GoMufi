import express, { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { quizRateLimiter } from '../middleware/rate-limit.middleware';
import prisma from '../db/prisma';
import { config } from '../config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();
const genAI = new GoogleGenerativeAI(config.MY_API_KEY || '');

const generateQuizHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { topic, difficulty, course_id, section_id, node_id } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `Generate a multiple choice quiz question about ${topic} ${difficulty ? `with ${difficulty} difficulty` : ''}. Return ONLY a JSON object with these exact fields: "question_text" (string), "options" (array of exactly 4 strings), "correct_answer" (string, must exactly match one option), "explanation" (string).`;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Attempt to parse JSON from response, strip markdown blocks if present
    const jsonStr = text.replace(/```json\n?|\n?```/gi, '').trim();
    const parsedData = JSON.parse(jsonStr);

    const quiz = await prisma.quiz.create({
      data: {
        topic: topic || 'Genel',
        question_text: parsedData.question_text || '',
        options: parsedData.options || [],
        correct_answer: parsedData.correct_answer || '',
        explanation: parsedData.explanation || null,
        course_id: course_id ? parseInt(course_id, 10) : null,
        section_id: section_id || null,
        node_id: node_id ? parseInt(node_id, 10) : null,
      },
    });

    res.json(quiz);
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
};

router.post('/generate', authMiddleware, quizRateLimiter, generateQuizHandler);
// Legacy alias
router.post('/generate_quiz', authMiddleware, quizRateLimiter, generateQuizHandler);

const listQuizHandler = async (req: express.Request, res: express.Response) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      orderBy: { created_at: 'desc' },
    });
    res.json(quizzes);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

router.get('/list', authMiddleware, listQuizHandler);
router.get('/quizzes', authMiddleware, listQuizHandler);

const assignQuizHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { quiz_id, course_id, section_id, node_id } = req.body;
    
    if (!quiz_id || !course_id) {
      return res.status(400).json({ error: 'quiz_id and course_id are required' });
    }

    const quiz = await prisma.quiz.update({
      where: { id: parseInt(quiz_id, 10) },
      data: {
        course_id: parseInt(course_id, 10),
        section_id: section_id || null,
        node_id: node_id ? parseInt(node_id, 10) : null,
      },
    });

    res.json({ message: 'Quiz assigned', quiz });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to assign quiz' });
  }
};

router.post('/assign', authMiddleware, assignQuizHandler);
router.post('/assign_quiz', authMiddleware, assignQuizHandler);

const quizByNodeHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { course_id, section_id, node_id } = req.query;

    if (!course_id) {
      return res.status(400).json({ error: 'course_id is required' });
    }

    const quizzes = await prisma.quiz.findMany({
      where: {
        course_id: parseInt(String(course_id), 10),
        ...(section_id ? { section_id: String(section_id) } : {}),
        ...(node_id ? { node_id: parseInt(String(node_id), 10) } : {}),
      },
    });

    res.json(quizzes);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

router.get('/by-node', authMiddleware, quizByNodeHandler);
router.get('/quiz_by_node', authMiddleware, quizByNodeHandler);

export default router;
