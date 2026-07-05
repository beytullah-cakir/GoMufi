import iyzipay
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.course import Course
from models.student import Student
from models.enrollment import Enrollment
from connect_db import get_db
from auth.dependencies import get_current_user_info
from core.config import settings
from pydantic import BaseModel
from typing import List

class CheckoutRequest(BaseModel):
    course_ids: List[int]

router = APIRouter(prefix="/payment", tags=["payment"])

# Iyzico Configuration
def get_iyzico_options():
    # iyzipay-python expects only the hostname (without https://) in base_url
    base_url = settings.IYZICO_BASE_URL.replace("https://", "").replace("http://", "")
    
    options = {
        'api_key': settings.IYZICO_API_KEY,
        'secret_key': settings.IYZICO_SECRET_KEY,
        'base_url': base_url
    }
    return options


@router.post("/initialize-checkout")
async def initialize_checkout(
    checkout_data: CheckoutRequest,
    request: Request,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    course_ids = checkout_data.course_ids
    if not course_ids:
        raise HTTPException(status_code=400, detail="No courses in cart")

    # 1. Get Courses and Student Details
    result = await db.execute(select(Course).where(Course.id.in_(course_ids)))
    courses = result.scalars().all()
    if len(courses) != len(course_ids):
        raise HTTPException(status_code=404, detail="One or more courses not found")

    student_id = int(user_info["sub"])
    student_result = await db.execute(select(Student).where(Student.id == student_id))
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 2. total price calculation
    total_price = sum(c.price for c in courses)

    # 3. Create Iyzico Request
    options = get_iyzico_options()
    
    backend_url = settings.BACKEND_URL
    course_ids_str = ",".join(map(str, course_ids))
    callback_url = f"{backend_url}/payment/callback/{course_ids_str}/{student_id}"

    basket_items = []
    for course in courses:
        basket_items.append({
            'id': f'C{course.id}',
            'name': course.title,
            'category1': course.category or 'Education',
            'itemType': 'VIRTUAL',
            'price': str(course.price)
        })

    checkout_form_initialize_raw = iyzipay.CheckoutFormInitialize().create({
        'locale': 'tr',
        'conversationId': str(uuid.uuid4()),
        'price': str(total_price),
        'paidPrice': str(total_price),
        'currency': 'TRY',
        'basketId': f'B{student_id}_{str(uuid.uuid4())[:8]}',
        'paymentGroup': 'PRODUCT',
        'callbackUrl': callback_url,
        'enabledInstallments': [1, 2, 3, 6, 9],
        'buyer': {
            'id': str(student.id),
            'name': student.first_name or "Guest",
            'surname': student.last_name or "User",
            'gsmNumber': '+905350000000',
            'email': student.email,
            'identityNumber': '74455544444',
            'lastLoginDate': '2015-10-05 12:43:35',
            'registrationDate': '2013-04-21 15:12:09',
            'registrationAddress': 'Nispetiye Mah. Güller Sk. No:7',
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
        'basketItems': basket_items
    }, options)

    checkout_form_initialize = json.loads(checkout_form_initialize_raw.read().decode('utf-8'))

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

@router.post("/callback/{course_ids_str}/{student_id}")
async def checkout_callback(
    course_ids_str: str,
    student_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    form_data = await request.form()
    token = form_data.get('token')
    
    if not token:
        raise HTTPException(status_code=400, detail="Token not found in callback")

    options = get_iyzico_options()
    checkout_form_result_raw = iyzipay.CheckoutForm().retrieve({
        'locale': 'tr',
        'conversationId': str(uuid.uuid4()),
        'token': token
    }, options)

    checkout_form_result = json.loads(checkout_form_result_raw.read().decode('utf-8'))

    frontend_url = settings.FRONTEND_URL
    course_ids = [int(cid) for cid in course_ids_str.split(",")]

    if checkout_form_result.get('status') == 'success' and checkout_form_result.get('paymentStatus') == 'SUCCESS':
        # Payment successful, enroll the student in all courses
        try:
            for course_id in course_ids:
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
                        window.location.href = "{frontend_url}/payment-success?course_ids={course_ids_str}";
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
