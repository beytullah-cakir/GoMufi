import iyzipay
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.course import Course
from models.student import Student
from models.enrollment import Enrollment
from connect_db import get_db
import jwt
from core.config import settings

router = APIRouter(prefix="/payment", tags=["payment"])

# Iyzico Configuration
def get_iyzico_options():
    options = {
        'api_key': settings.IYZICO_API_KEY,
        'secret_key': settings.IYZICO_SECRET_KEY,
        'base_url': settings.IYZICO_BASE_URL
    }
    return options

async def get_current_user_info(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/initialize-checkout/{course_id}")
async def initialize_checkout(
    course_id: int,
    request: Request,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    # 1. Get Course and Student Details
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    student_id = int(user_info["sub"])
    student_result = await db.execute(select(Student).where(Student.id == student_id))
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 2. Check if already enrolled
    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == student_id,
            Enrollment.course_id == course_id
        )
    )
    if existing.scalars().first():
        return {"status": "already_enrolled", "message": "Zaten bu kursa kayıtlısınız."}

    # 3. Create Iyzico Request
    options = get_iyzico_options()
    
    # Callback URL (Front-end will handle the result or back-end will redirect)
    # Using relative URL might not work with Iyzico, usually requires absolute URL
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    callback_url = f"{backend_url}/payment/callback/{course_id}/{student_id}"

    checkout_form_initialize = iyzipay.CheckoutFormInitialize().create({
        'locale': iyzipay.Locale.TR.value,
        'conversationId': str(uuid.uuid4()),
        'price': str(course.price),
        'paidPrice': str(course.price),
        'currency': iyzipay.Currency.TRY.value,
        'basketId': f'B{course_id}',
        'paymentGroup': iyzipay.PaymentGroup.PRODUCT.value,
        'callbackUrl': callback_url,
        'enabledInstallments': [1, 2, 3, 6, 9],
        'buyer': {
            'id': str(student.id),
            'name': student.first_name or "Guest",
            'surname': student.last_name or "User",
            'gsmNumber': '+905350000000', # Placeholder
            'email': student.email,
            'identityNumber': '74455544444', # Placeholder
            'lastLoginDate': '2015-10-05 12:43:35',
            'registrationDate': '2013-04-21 15:12:09',
            'registrationAddress': 'Nispetiye Mah. Güller Sk. No:7', # Placeholder
            'ip': request.client.host,
            'city': 'Istanbul',
            'country': 'Turkey',
            'zipCode': '34732'
        },
        'shippingAddress': {
            'contactName': f"{student.first_name} {student.last_name}",
            'city': 'Istanbul',
            'country': 'Turkey',
            'address': 'Nispetiye Mah. Güller Sk. No:7',
            'zipCode': '34732'
        },
        'billingAddress': {
            'contactName': f"{student.first_name} {student.last_name}",
            'city': 'Istanbul',
            'country': 'Turkey',
            'address': 'Nispetiye Mah. Güller Sk. No:7',
            'zipCode': '34732'
        },
        'basketItems': [
            {
                'id': f'C{course_id}',
                'name': course.title,
                'category1': course.category or 'Education',
                'itemType': iyzipay.BasketItemType.VIRTUAL.value,
                'price': str(course.price)
            }
        ]
    }, options)

    if checkout_form_initialize.get('status') == 'success':
        # checkout_form_content is the HTML snippet to be injected into the frontend
        return {
            "status": "success",
            "checkout_form_content": checkout_form_initialize.get('checkoutFormContent'),
            "payment_page_url": checkout_form_initialize.get('paymentPageUrl'),
            "token": checkout_form_initialize.get('token')
        }
    else:
        raise HTTPException(
            status_code=400, 
            detail=checkout_form_initialize.get('errorMessage', 'Payment initialization failed')
        )

@router.post("/callback/{course_id}/{student_id}")
async def checkout_callback(
    course_id: int,
    student_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    form_data = await request.form()
    token = form_data.get('token')
    
    if not token:
        raise HTTPException(status_code=400, detail="Token not found in callback")

    options = get_iyzico_options()
    checkout_form_result = iyzipay.CheckoutForm().retrieve({
        'locale': iyzipay.Locale.TR.value,
        'conversationId': str(uuid.uuid4()),
        'token': token
    }, options)

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    if checkout_form_result.get('status') == 'success' and checkout_form_result.get('paymentStatus') == 'SUCCESS':
        # Payment successful, enroll the student
        try:
            # Check again if already enrolled (concurrency)
            existing = await db.execute(
                select(Enrollment).where(
                    Enrollment.student_id == student_id,
                    Enrollment.course_id == course_id
                )
            )
            if not existing.scalars().first():
                enrollment = Enrollment(student_id=student_id, course_id=course_id)
                db.add(enrollment)
                await db.commit()
            
            # Redirect to success page on frontend
            return HTMLResponse(content=f"""
                <html>
                    <script>
                        window.location.href = "{frontend_url}/payment-success?course_id={course_id}";
                    </script>
                </html>
            """)
        except Exception as e:
            print(f"Enrollment error after payment: {str(e)}")
            return HTMLResponse(content=f"""
                <html>
                    <script>
                        window.location.href = "{frontend_url}/payment-error?error=enrollment_failed";
                    </script>
                </html>
            """)
    else:
        # Payment failed
        error_msg = checkout_form_result.get('errorMessage', 'Ödeme başarısız.')
        return HTMLResponse(content=f"""
            <html>
                <script>
                    window.location.href = "{frontend_url}/payment-error?message={error_msg}";
                </script>
            </html>
        """)
