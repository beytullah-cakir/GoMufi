-- ============================================
--   EDUCATION PLATFORM DATABASE SCHEMA
--   students - teachers - courses - enrollments
-- ============================================

-- ==============
--  PARENTS
-- ==============
CREATE TABLE parents (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name  VARCHAR(100),
    email      VARCHAR(150) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

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
    password VARCHAR(255) NOT NULL,
    student_code VARCHAR(20) UNIQUE,
    parent_id INT REFERENCES parents(id),
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
    expertises VARCHAR(255),
    password   VARCHAR(255),
    bio        TEXT,
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
    progress INT DEFAULT 0,
    price INT DEFAULT 0,
    learning_outcomes JSONB DEFAULT '[]',
    requirements JSONB DEFAULT '[]',
    curriculum JSONB DEFAULT '[]',
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

-- =================    
--  LIVE SESSIONS
-- =================
CREATE TABLE live_sessions (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES courses(id),
    title VARCHAR(200) NOT NULL,
    day_of_week VARCHAR(20), -- Pazartesi, Salı...
    start_time TIME,
    duration_minutes INT DEFAULT 40,
    type VARCHAR(20) DEFAULT 'live', -- live, reserved
    status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, completed, live
    created_at TIMESTAMP DEFAULT NOW()
);
