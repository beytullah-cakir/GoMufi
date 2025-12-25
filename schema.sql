-- ============================================
--   EDUCATION PLATFORM DATABASE SCHEMA
--   students - teachers - courses - enrollments
-- ============================================

-- ==============
--  STUDENTS
-- ==============
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100) NOT NULL,
    nickname   VARCHAR(100) UNIQUE NOT NULL,
    email      VARCHAR(150) UNIQUE NOT NULL,
    education_level VARCHAR(20) NOT NULL,
    grade_level VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==============
--  TEACHERS
-- ==============
CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100) NOT NULL,
    email      VARCHAR(150) UNIQUE NOT NULL,
    department VARCHAR(150),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==============
--  COURSES
-- ==============
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    teacher_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- =================    
--  ENROLLMENTS
-- =================
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),

    UNIQUE (student_id, course_id)
);
