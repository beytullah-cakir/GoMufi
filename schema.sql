-- ============================================
--   EDUCATION PLATFORM DATABASE SCHEMA
--   students - teachers - courses - enrollments - quizzes
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
    first_name VARCHAR(100),
    last_name  VARCHAR(100),
    email      VARCHAR(150) UNIQUE,
    nickname   VARCHAR(100),
    password   VARCHAR(255),
    student_code VARCHAR(100) UNIQUE,
    grade_level VARCHAR(50),
    education_level VARCHAR(50),
    parent_id INT REFERENCES parents(id),
    
    -- Gamification fields
    gems INTEGER DEFAULT 0,
    hearts INTEGER DEFAULT 5,
    streak INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==============
--  TEACHERS
-- ==============
CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name  VARCHAR(100),
    email      VARCHAR(150) UNIQUE,
    expertises VARCHAR(255),
    password   VARCHAR(255),
    bio        VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==============
--  COURSES
-- ==============
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    teacher_id INT NOT NULL REFERENCES teachers(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    progress INT DEFAULT 0,
    price INT DEFAULT 0,
    learning_outcomes JSON DEFAULT '[]',
    requirements JSON DEFAULT '[]',
    curriculum JSON DEFAULT '[]',
    rating INT DEFAULT 5,
    notes JSON DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'active',
    schedule JSON DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =================    
--  ENROLLMENTS
-- =================
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    course_id INT REFERENCES courses(id),
    enrolled_at TIMESTAMP DEFAULT NOW(),
    
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

-- =================    
--  QUIZZES
-- =================
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    course_id INT REFERENCES courses(id),
    section_id VARCHAR(100), -- ID or index of the section
    node_id INT, -- ID of the node in the course curriculum
    topic VARCHAR(100) NOT NULL,
    difficulty VARCHAR(50),
    question_text TEXT NOT NULL,
    options JSON, -- Options list for multiple choice
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    question_type VARCHAR(50) DEFAULT 'multiple-choice',
    created_at TIMESTAMP DEFAULT NOW()
);
