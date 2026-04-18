from pydantic import BaseModel
from typing import Optional, List, Any

class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class TagSchema(TagBase):
    id: int

    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: float = 0.0

class CourseCreate(CourseBase):
    teacher_id: int

class CourseSchema(CourseBase):
    id: int
    curriculum: Optional[List[Any]] = None
    notes: Optional[List[Any]] = None
    students_count: int = 0

    class Config:
        from_attributes = True
