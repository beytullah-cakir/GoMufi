import { Router, Request, Response } from 'express';
import Iyzipay from 'iyzipay';
import { authMiddleware } from '../middleware/auth.middleware';
import { paymentRateLimiter } from '../middleware/rate-limit.middleware';
import prisma from '../db/prisma';
import { config } from '../config';

const router = Router();

const iyzipay = new Iyzipay({
  apiKey: config.IYZICO_API_KEY,
  secretKey: config.IYZICO_SECRET_KEY,
  uri: config.IYZICO_BASE_URL,
});

router.post('/initialize-checkout', authMiddleware, paymentRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { course_ids, buyer_info } = req.body;

    if (!Array.isArray(course_ids) || course_ids.length === 0) {
      res.status(400).json({ message: 'Course IDs are required' });
      return;
    }

    if (!buyer_info) {
      res.status(400).json({ message: 'Buyer info is required' });
      return;
    }

    const courses = await prisma.course.findMany({
      where: {
        id: { in: course_ids },
      },
    });

    if (courses.length !== course_ids.length) {
      res.status(404).json({ message: 'Some courses not found' });
      return;
    }

    const totalPrice = courses.reduce((sum, course) => sum + Number(course.price || 0), 0);
    const totalPriceStr = totalPrice.toFixed(2);

    const userIdStr = (req.user as any)?.sub;

    const requestData = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: `conv_${Date.now()}_${userIdStr}`,
      price: totalPriceStr,
      paidPrice: totalPriceStr,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: `basket_${Date.now()}`,
      paymentGroup: 'PRODUCT',
      callbackUrl: `${config.BACKEND_URL}/payment/callback/${course_ids.join('-')}/${userIdStr}`,
      enabledInstallments: [2, 3, 6, 9],
      buyer: {
        id: userIdStr,
        name: buyer_info.name,
        surname: buyer_info.surname,
        gsmNumber: buyer_info.phone,
        email: buyer_info.email,
        identityNumber: buyer_info.identity_number,
        lastLoginDate: '2023-01-01 10:00:00', // Example fallback
        registrationDate: '2023-01-01 10:00:00', // Example fallback
        registrationAddress: buyer_info.address,
        ip: req.ip || '85.34.78.112',
        city: buyer_info.city,
        country: buyer_info.country,
        zipCode: buyer_info.zip,
      },
      shippingAddress: {
        contactName: `${buyer_info.name} ${buyer_info.surname}`,
        city: buyer_info.city,
        country: buyer_info.country,
        address: buyer_info.address,
        zipCode: buyer_info.zip,
      },
      billingAddress: {
        contactName: `${buyer_info.name} ${buyer_info.surname}`,
        city: buyer_info.city,
        country: buyer_info.country,
        address: buyer_info.address,
        zipCode: buyer_info.zip,
      },
      basketItems: courses.map(course => ({
        id: String(course.id),
        name: course.title || 'Course',
        category1: 'Online Kurs',
        itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
        price: Number(course.price || 0).toFixed(2),
      })),
    };

    iyzipay.checkoutFormInitialize.create(requestData, (err: any, result: any) => {
      if (err) {
        console.error('Iyzipay checkout error:', err);
        res.status(500).json({ message: 'Payment provider error', error: err });
        return;
      }

      if (result.status === 'success') {
        res.json(result);
      } else {
        res.status(400).json({ message: 'Payment initialization failed', error: result.errorMessage });
      }
    });
  } catch (error) {
    console.error('Checkout initialization error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/callback/:course_ids_str/:student_id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { course_ids_str, student_id } = req.params;
    const { token } = req.body;

    if (!token) {
      res.redirect(`${config.FRONTEND_URL}/payment-error?reason=missing_token`);
      return;
    }

    iyzipay.checkoutFormRetrieve.retrieve({ locale: 'tr', token }, async (err: any, result: any) => {
      if (err) {
        console.error('Iyzipay retrieval error:', err);
        res.redirect(`${config.FRONTEND_URL}/payment-error?reason=retrieval_error`);
        return;
      }

      if (result.paymentStatus === 'SUCCESS') {
        const courseIds = course_ids_str.split('-').map(id => parseInt(id, 10));
        const studentId = parseInt(student_id, 10);

        for (const courseId of courseIds) {
          const existingEnrollment = await prisma.enrollment.findFirst({
            where: {
              student_id: studentId,
              course_id: courseId,
            },
          });

          if (!existingEnrollment) {
            await prisma.enrollment.create({
              data: {
                student_id: studentId,
                course_id: courseId,
              },
            });
          }
        }

        res.redirect(`${config.FRONTEND_URL}/student?payment=success`);
      } else {
        res.redirect(`${config.FRONTEND_URL}/payment-error?reason=${encodeURIComponent(result.errorMessage || 'payment_failed')}`);
      }
    });
  } catch (error) {
    console.error('Payment callback error:', error);
    res.redirect(`${config.FRONTEND_URL}/payment-error?reason=internal_error`);
  }
});

export default router;
