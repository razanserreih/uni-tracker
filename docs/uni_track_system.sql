-- University Tracking System - MySQL Schema
-- Author: Razan Serreih
-- Contains: schema + minimal seed data (safe, fake values)
-- ====================================================================================================================================
--  													TABLES
-- ====================================================================================================================================
-- First run this after creating a schema
use uniTrackerSys;

 -- insert These Tables 
-- majors
CREATE TABLE majors ( 
  major_id   INT AUTO_INCREMENT PRIMARY KEY,
  major_name VARCHAR(50) NOT NULL UNIQUE
);

-- Students
CREATE TABLE students (
  student_id       INT AUTO_INCREMENT PRIMARY KEY,
  major_id         INT NULL,
  first_name       VARCHAR(25) NOT NULL,
  last_name        VARCHAR(25) NOT NULL,
  email            VARCHAR(100) UNIQUE,
  enrollment_date  DATE NOT NULL,
  created_at       DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_by       VARCHAR(30) NOT NULL DEFAULT 'Admin1',
  modified_at      DATE,
  modified_by      VARCHAR(30),
  status_id 	   INT NOT NULL,
  FOREIGN KEY (major_id) REFERENCES majors(major_id) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (status_id) REFERENCES lookup(lookup_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  INDEX idx_students_name (last_name, first_name)
);

-- Courses
CREATE TABLE courses (
  course_id                  INT AUTO_INCREMENT PRIMARY KEY,
  course_name                VARCHAR(100) NOT NULL,
  max_absence_allowed        INT UNSIGNED NOT NULL,
  absence_warning_threshold  INT UNSIGNED NOT NULL DEFAULT 3, -- unsigned means not negative values are allowed
  created_at 				 DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_by                 VARCHAR(30) NOT NULL DEFAULT 'Admin1',
  modified_at                TIMESTAMP,
  modified_by                VARCHAR(30),
  department                 VARCHAR(30),
  course_status_id 			 INT NOT NULL,
  CONSTRAINT chk_warn_le_max CHECK (absence_warning_threshold <= max_absence_allowed),
  FOREIGN KEY (course_status_id) REFERENCES lookup(lookup_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- Semesters
CREATE TABLE semesters (
  semester_id    INT AUTO_INCREMENT PRIMARY KEY,
  semester_name  VARCHAR(30) NOT NULL UNIQUE,  -- '2025-Fall'
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  CONSTRAINT chk_sem_dates CHECK (end_date > start_date)
);

-- Staff (no course_id; many-to-many relationship by teaching_assignments)
CREATE TABLE staff (
  staff_id     INT AUTO_INCREMENT PRIMARY KEY,
  full_name    VARCHAR(50) NOT NULL,
  position_id  INT NOT NULL,
  email        VARCHAR(100) UNIQUE,
  department   VARCHAR(50),
  created_at   DATE NOT NULL DEFAULT (CURRENT_DATE),
  modified_at  DATE,
  FOREIGN KEY (position_id) REFERENCES lookup(lookup_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- A course offering = a specific course taught in a particular semester and section (“Intro to Programming — 2025-Fall — Section A”).
-- (sho3ab el madeh ele nazleh had el fasel)
CREATE TABLE course_offerings (
  offering_id  BIGINT AUTO_INCREMENT PRIMARY KEY,
  course_id    INT NOT NULL,
  semester_id  INT NOT NULL,
  section      VARCHAR(10) NOT NULL DEFAULT 'A',
  capacity     INT NOT NULL DEFAULT 50,
  FOREIGN KEY (course_id) REFERENCES courses(course_id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (semester_id) REFERENCES semesters(semester_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Enrollments (student ↔ offering)
CREATE TABLE enrollments (
  enrollment_id  BIGINT AUTO_INCREMENT PRIMARY KEY, -- bigint is used here because the num of enrollms gonna be so large
  student_id     INT NOT NULL,
  offering_id    BIGINT NOT NULL,
  status_id		 INT,
  enrolled_on    DATE NOT NULL DEFAULT (CURRENT_DATE),
  UNIQUE KEY uq_enrollment (student_id, offering_id),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (offering_id) REFERENCES course_offerings(offering_id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (status_id) REFERENCES lookup(lookup_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  INDEX idx_enr_student (student_id),
  INDEX idx_enr_offering (offering_id)
);

-- Teaching assignments (staff ↔ offering) A staff member can teach multiple offerings (different courses or sections in the same semester).
-- مين دكاترة الشعب اللي نازلة هالفصل , و لو في شعبة فيكي تعرفي من ون مين اللي بدرسها و, و فيكي تعرفي دكتور معين اي شعب بدرس 
CREATE TABLE teaching_assignments (
  assignment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  staff_id      INT NOT NULL,
  offering_id   BIGINT NOT NULL,
  role_id		INT NOT NULL,
  UNIQUE KEY uq_staff_offering (staff_id, offering_id),
  FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (offering_id) REFERENCES course_offerings(offering_id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES lookup(lookup_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- Lectures ( mohadarat w amakenha bil tafasel)
-- course_offerings is created when the registrar sets up the semester schedule.
-- lectures are then added to define when students actually meet for that offering.
-- Attendance is tracked per lecture, not per offering.
CREATE TABLE lectures (
  lecture_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  offering_id      BIGINT NOT NULL,
  lecture_days_id  INT    NOT NULL,                             -- FK → lookup(domain='lecture_days')
  start_time       TIME   NOT NULL,
  end_time         TIME   NOT NULL,
  room             VARCHAR(50),
    FOREIGN KEY (offering_id) REFERENCES course_offerings(offering_id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (lecture_days_id) REFERENCES lookup(lookup_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_time_order CHECK (end_time > start_time)
);


-- -------------------------------------------------------------------
-- Attendance (by enrollment and lecture)
CREATE TABLE attendance (
  attendance_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id BIGINT NOT NULL,               -- (student_id, course_id)
  lecture_id    BIGINT NOT NULL,               -- lecture belongs to an offering
  lecture_date 	DATE,
  is_present    BOOLEAN NOT NULL,              -- 1 = present, 0 = absent
  marked_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by    VARCHAR(30) NOT NULL DEFAULT 'Admin1',
  modified_at   TIMESTAMP,
  modified_by   VARCHAR(30),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (lecture_id)    REFERENCES lectures(lecture_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- =========================
-- Grades 
-- =========================
CREATE TABLE grades (
  grade_id       BIGINT AUTO_INCREMENT PRIMARY KEY,                           
  enrollment_id  BIGINT      NOT NULL,                                       
  grade_type_id  INT         NOT NULL,                                        -- FK → lookup (domain='grade_type')
  grade_label    VARCHAR(50) NULL,                                            -- e.g. 'Quiz 1'
  grade_value    DECIMAL(6,2) NOT NULL,                                       
  graded_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,              
  created_by     VARCHAR(30) NOT NULL DEFAULT 'Admin1',
  modified_at    TIMESTAMP,
  modified_by    VARCHAR(30),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (grade_type_id) REFERENCES lookup(lookup_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- =========================
-- Notification templates 
-- =========================
CREATE TABLE notification_templates (
  template_id      INT AUTO_INCREMENT PRIMARY KEY,
  template_body    VARCHAR(255) NOT NULL,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at   	   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subject_template VARCHAR(200)
);

-- =========================
-- Notifications (outbox / audit)
-- Prefer linking to enrollment_id (covers student+offering). Lecture optional.
-- Keep history -> SET NULL
-- =========================
CREATE TABLE notifications (
  notification_id  BIGINT AUTO_INCREMENT PRIMARY KEY,
  template_id      INT NULL,
  enrollment_id    BIGINT,
  lecture_id       BIGINT,
  lecture_date 	   date,
  to_email         VARCHAR(255) NULL,
  subject_         VARCHAR(200) NOT NULL DEFAULT 'Notification',
  message          VARCHAR(1000) NOT NULL,
  is_html		   TINYINT,
  status_          ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
  attempts         INT NOT NULL DEFAULT 0,
  last_error       VARCHAR(255) ,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at          TIMESTAMP, 
FOREIGN KEY (template_id)   REFERENCES notification_templates(template_id) ON UPDATE CASCADE ON DELETE SET NULL,
FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id) ON UPDATE CASCADE ON DELETE SET NULL,
FOREIGN KEY (lecture_id)    REFERENCES lectures(lecture_id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- ==========================
-- student log table (history)
-- ===========================
CREATE TABLE students_log (
  log_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT NOT NULL,
  operation     ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  changed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by    VARCHAR(50) NOT NULL DEFAULT 'system',
  old_first_name  VARCHAR(50),
  new_first_name  VARCHAR(50),
  old_last_name   VARCHAR(50),
  new_last_name   VARCHAR(50),
  old_email       VARCHAR(100),
  new_email       VARCHAR(100),
  old_major_id    INT,
  new_major_id    INT,
  old_st_status   INT,
  new_st_status   INT,
  old_enrollment_date DATE,
  new_enrollment_date DATE,
  modified_at DATE NOT NULL default NOW(),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (new_status_id) REFERENCES lookup(lookup_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- ====================================
-- lookup table
-- ====================================
CREATE TABLE lookup (
  lookup_id   INT AUTO_INCREMENT PRIMARY KEY,
  domain      VARCHAR(50)  NOT NULL,        -- 'student_status', 'course_status', 'grade_type', 'attendance_status', 'staff_position', 'ta_role'
  code        VARCHAR(50)  NOT NULL,        -- 'active', 'inactive', 'quiz', 'midterm', 'present', 'absent'
  is_active   BOOLEAN   NOT NULL DEFAULT TRUE,
  sort_order  INT          NOT NULL DEFAULT 0
);

CREATE TABLE attendance_stage (
  stage_id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  src_file         VARCHAR(255) NOT NULL,
  line_no          INT          NOT NULL,
  student_id       INT          NULL,
  lecture_id       BIGINT       NULL,
  lecture_date_str DATE         NULL,
  is_present_str   VARCHAR(20)  NULL,
  actor            VARCHAR(50)  NULL,
  loaded_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  error_msg  	   VARCHAR(64) 
);

-- ====================================================================================================================================
--  													SAMPLE DATA (INSERTS)
-- ====================================================================================================================================
-- ===== Majors =====
INSERT INTO majors (major_name) VALUES
('Computer Science'),
('Information Technology'),
('Electrical Engineering'),
('Business Administration');

-- Students
INSERT INTO students (major_id, first_name, last_name, email, enrollment_date)
VALUES
(1, 'Razan', 'moe', 'razzz@uni.edu.jo', '2023-09-01'),
(1, 'Sara', 'ahmad', 'Sarahmad@uni.edu.jo', '2023-09-01'),
(2, 'MOE', 'mem', 'HaLMOE@uni.edu.jo', '2024-01-15'),
(3, 'Issa', 'HRU', 'JE9U9@uni.edu.jo', '2024-02-01'),
(3, 'Khaled', 'mosa', 'khaled@uni.edu.jo', '2023-03-12'),
(4, 'Tala', 'Basel', 'Tala_albasel@uni.edu.jo', '2023-09-01');

-- Courses
INSERT INTO courses (course_name, max_absence_allowed, absence_warning_threshold, department)
VALUES
('Database Systems', 5, 3, 'Computer Science'),
('Web Development', 4, 2, 'Information Technology'),
('Circuit Analysis', 6, 3, 'Electrical Engineering'),
('Principles of Management', 3, 2, 'Business Administration');

-- Semesters
INSERT INTO semesters (semester_name, start_date, end_date)
VALUES
('2025-Spring', '2025-02-01', '2025-06-01'),
('2025-Fall', '2025-09-01', '2026-01-15');

-- Staff
INSERT INTO staff (full_name, position_, email, department)
VALUES
('Dr. Rami Al-Hassan','Instructor','rami.alhassan@uni.edu', 'Computer Science'),
('Dr. Maha Saleh','Dean','maha.saleh@uni.edu', 'Electrical Engineering'),
('Dr. Yousef Barakat','Instructor','yousef.barakat@uni.edu', 'Information Technology'),
('Eng. Reem Odeh','TA','reem.odeh@uni.edu', 'Business Administration');

-- Course Offerings (course x semester x section)
INSERT INTO course_offerings (course_id, semester_id, section, capacity)
VALUES
(1, 1, 'A', 40), -- Database Systems - Spring 2025
(2, 1, 'B', 35), -- Web Development - Spring 2025
(3, 1, 'A', 30), -- Circuit Analysis - Spring 2025
(4, 1, 'C', 45), -- Principles of Management - Spring 2025
(1, 2, 'A', 40); -- Database Systems - Fall 2025

-- Teaching Assignments (who teaches which offering)
INSERT INTO teaching_assignments (staff_id, offering_id, role)
VALUES
(1, 1, 'Instructor'),
(3, 2, 'Instructor'), 
(2, 3, 'Dean'),      
(4, 4, 'Instructor'), 
(1, 5, 'Instructor'); 

-- Lectures (multiple weekly meetings per offering)
INSERT INTO lectures (offering_id, lecture_days, start_time, end_time, room)
VALUES
(1, 'Monday, Wednesday', '09:00:00', '10:30:00', 'Room 101'),
(1, 'Sunday', '10:45:00', '12:15:00', 'Room 101'),
(2, 'Sunday, Tuesday, Thursday', '11:00:00', '12:30:00', 'Room 202'),
(3, 'Monday, Wednesday', '13:00:00', '14:30:00', 'Lab 3'),
(4, 'Sunday, Tuesday, Thursday', '08:00:00', '09:30:00', 'Room 305'),
(5, 'Monday, Wednesday', '09:00:00', '10:30:00', 'Room 101');

-- Enrollments (students into offerings)
INSERT INTO enrollments (student_id, offering_id, EN_status, enrolled_on)
VALUES
(1, 1, 'enrolled', '2025-01-20'),
(2, 1, 'enrolled', '2025-01-20'),
(3, 2, 'enrolled', '2025-01-21'),
(4, 3, 'enrolled', '2025-01-22'),
(5, 4, 'enrolled', '2025-01-23');


-- notification_templates (templates to use for the notifications triggers)
INSERT INTO notification_templates (template_body, is_active)
VALUES
('You were marked absent. Remaining allowed absences: {{remaining}}', 1),
('Warning: you have exceeded the allowed absence threshold.', 1),
('Grade updated: {{assessment}} = {{score}}', 1),
('Please attend your classes regularly to avoid penalties.', 1);

-- lookup table for all tables in the system
INSERT INTO lookup (domain, code, sort_order) VALUES
('student_status','Active',1),
('student_status','Inactive',2),
('student_status','Graduated',3),
('student_status','Suspended',4),

('course_status','Active',1),
('course_status','Inactive',2),
('course_status','Archived',3),

('staff_position','Dean',1),
('staff_position','Instructor',2),
('staff_position','Teaching Assistant',3),

('ta_role','Instructor',1),
('ta_role','Dean',2),
('ta_role','Teaching Assistant',3),

('grade_type','Quiz',1),
('grade_type','Assignment',2),
('grade_type','Midterm',3),
('grade_type','Final',4),

('attendance_status','Present',1),
('attendance_status','Absent',2),

('enrollment_status','Enrolled',1,1),
('enrollment_status','Dropped',1,2),
('enrollment_status','Completed',1,3),
('enrollment_status','Failed',1,4)
ON DUPLICATE KEY UPDATE code = VALUES(code);
-- ====================================================================================================================================
--  													PROCEDURES
-- ====================================================================================================================================

-- 1) proc_add_attendance 
DELIMITER $$
CREATE PROCEDURE proc_add_attendance(
    IN p_student_id INT,
    IN p_lecture_id BIGINT,
    IN p_lecture_date DATE,
    IN p_is_present BOOLEAN,
    IN p_actor VARCHAR(50)
)
BEGIN
    DECLARE v_enrollment_id BIGINT;
    DECLARE v_student_email VARCHAR(255);
    DECLARE v_max_allowed INT;
    DECLARE v_absent_count INT;
    DECLARE v_remaining INT;
    DECLARE v_start_date DATE;
    DECLARE v_end_date DATE;
    DECLARE v_expected_day VARCHAR(15);
    DECLARE v_actual_day VARCHAR(15);

    -- 1. Check if the lecture exists and get its expected day and semester range
    SELECT se.start_date, se.end_date, lu.code
    INTO v_start_date, v_end_date, v_expected_day
    FROM lectures l
    JOIN course_offerings co ON co.offering_id = l.offering_id
    JOIN semesters se ON se.semester_id = co.semester_id
    JOIN lookup lu ON lu.lookup_id = l.lecture_days_id
    WHERE l.lecture_id = p_lecture_id;

    -- 2. Validate the lecture date is within the semester range
    IF p_lecture_date < v_start_date OR p_lecture_date > v_end_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lecture date is outside the semester range.';
    END IF;

    -- 3. Insert attendance only if not already marked
    INSERT INTO attendance (enrollment_id, lecture_id, lecture_date, is_present, marked_at, created_by)
    SELECT e.enrollment_id, l.lecture_id, p_lecture_date, p_is_present, NOW(), p_actor
    FROM lectures l
    JOIN enrollments e
      ON e.offering_id = l.offering_id
     AND e.student_id = p_student_id
     AND e.status_id = (
           SELECT lookup_id FROM lookup
           WHERE domain='enrollment_status' AND code='Enrolled'
         )
    WHERE l.lecture_id = p_lecture_id
      AND NOT EXISTS (
            SELECT 1
            FROM attendance a
            WHERE a.enrollment_id = e.enrollment_id
              AND a.lecture_id = l.lecture_id
              AND a.lecture_date = p_lecture_date
      );

    -- 4. Handle errors if nothing was inserted
    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Attendance already marked or invalid enrollment.';
    ELSE
        -- 5. If absent, queue a notification
        IF p_is_present = 0 THEN
            SELECT e.enrollment_id
            INTO v_enrollment_id
            FROM enrollments e
            JOIN lectures l ON l.offering_id = e.offering_id
            WHERE e.student_id = p_student_id
              AND l.lecture_id = p_lecture_id
            LIMIT 1;

            SELECT email INTO v_student_email
            FROM students
            WHERE student_id = p_student_id;

            IF v_student_email IS NOT NULL AND v_student_email <> '' THEN
               SELECT c.max_absence_allowed
                 INTO v_max_allowed
               FROM lectures l
               JOIN course_offerings co ON co.offering_id = l.offering_id
               JOIN courses c ON c.course_id = co.course_id
               WHERE l.lecture_id = p_lecture_id
               LIMIT 1;

               SELECT COUNT(*)
                 INTO v_absent_count
               FROM attendance a
               WHERE a.enrollment_id = v_enrollment_id
                 AND a.is_present = 0;

               SET v_remaining = v_max_allowed - v_absent_count;

               -- 6. Queue the email
               CALL proc_enqueue_absence_notice(
                   v_enrollment_id,
                   p_lecture_id,
                   p_lecture_date,
                   v_student_email,
                   v_remaining
               );
               --  CALL the processor here
               CALL process_notifications();
            END IF;
        END IF;
    END IF;
END$$
DELIMITER ;

-- ----------------------------------------------------------------------------------
-- 2) proc add or update_grade
-- Exists = same enrollment + grade_type + grade_label
DELIMITER $$
CREATE PROCEDURE proc_add_grade(
  IN p_student_id    INT,              
  IN p_course_id     INT,              
  IN p_semester_code VARCHAR(20),      
  IN p_grade_type    VARCHAR(50),      -- 'quiz','assignment','midterm','final' 
  IN p_grade_value   DECIMAL(6,2),     
  IN p_graded_at     DATE,             -- (NULL → today)
  IN p_grade_label   VARCHAR(100)      -- optional label for the grade ('Quiz 1')
)
BEGIN
  DECLARE v_enrollment_id  BIGINT;     -- enrollment ID for the student
  DECLARE v_grade_type_id  INT;        -- lookup id for grade type

  -- Resolve grade type (lookup by domain +code) 
  SELECT l.lookup_id
    INTO v_grade_type_id
  FROM lookup l
  WHERE l.domain = 'grade_type'
    AND LOWER(l.code) = LOWER(p_grade_type)
  LIMIT 1;

  IF v_grade_type_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Unknown grade type. Use Quiz/Assignment/Midterm/Final.';
  END IF;

  -- Find the student's enrollment for this course & semester ------------------
  SELECT e.enrollment_id
    INTO v_enrollment_id
  FROM enrollments e
  JOIN course_offerings co ON co.offering_id = e.offering_id
  JOIN semesters se        ON se.semester_id = co.semester_id
  WHERE e.student_id = p_student_id
    AND co.course_id = p_course_id
    AND se.semester_name = p_semester_code     
    AND e.status_id = (
        SELECT lookup_id FROM lookup
        WHERE domain='enrollment_status' AND code='Enrolled'
    )
  LIMIT 1;

  IF v_enrollment_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Student is not enrolled in this course for the given semester.';
  END IF;

  -- Avoid duplicates: same enrollment + type + label (NULL-safe) --------------
  IF EXISTS (
      SELECT 1 FROM grades
      WHERE enrollment_id = v_enrollment_id
        AND grade_type_id = v_grade_type_id
        AND ((grade_label IS NULL AND p_grade_label IS NULL)
             OR grade_label = p_grade_label)
  ) THEN
    SELECT 'Grade already exists. Use proc_update_grade.' AS msg;
  ELSE
    INSERT INTO grades(enrollment_id, grade_type_id, grade_label, grade_value, graded_at, created_by)
    VALUES (v_enrollment_id, v_grade_type_id, p_grade_label, p_grade_value,
            IFNULL(p_graded_at, CURDATE()), 'admin1');
    SELECT 'Grade added.' AS msg;
  END IF;
END $$
DELIMITER ;

-- ----------------------------------------
-- UPDATE grade (only if exists)
DELIMITER $$
CREATE PROCEDURE proc_update_grade (
  IN p_student_id    INT,              -- student ID
  IN p_course_id     INT,              -- course ID
  IN p_semester_name VARCHAR(20),      -- semester name ('2025-Fall')
  IN p_grade_type    VARCHAR(50),      -- 'quiz','assignment','midterm','final'
  IN p_grade_value   DECIMAL(6,2),     -- new grade value
  IN p_graded_at     DATE,             -- new grade date (NULL → keep old date)
  IN p_grade_label   VARCHAR(100)      -- optional label
)
BEGIN
  DECLARE v_enrollment_id BIGINT;      -- enrollment ID
  DECLARE v_grade_type_id INT;         -- lookup id for grade type

  -- Resolve grade type id (case-insensitive) ----------------------------------
  SELECT l.lookup_id
    INTO v_grade_type_id
  FROM lookup l
  WHERE l.domain = 'grade_type'
    AND LOWER(l.code) = LOWER(p_grade_type)
  LIMIT 1;

  IF v_grade_type_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Unknown grade type. Use Quiz/Assignment/Midterm/Final.';
  END IF;

  -- Find the student's enrollment for this course & semester ------------------
  SELECT e.enrollment_id
    INTO v_enrollment_id
  FROM enrollments e
  JOIN course_offerings co ON co.offering_id = e.offering_id
  JOIN semesters se        ON se.semester_id = co.semester_id
  WHERE e.student_id = p_student_id
    AND co.course_id = p_course_id
    AND se.semester_name = p_semester_name
    AND e.en_status_id IN (
        SELECT lookup_id FROM lookup
        WHERE domain = 'enrollment_status'
          AND code IN ('Enrolled','Completed','Failed') -- allow updates even if course is done
    )
  LIMIT 1;

  IF v_enrollment_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Student is not enrolled in this course for the given semester.';
  END IF;

  -- Check if this grade type+label already exists ------------------------------
  IF EXISTS (
      SELECT 1 FROM grades
      WHERE enrollment_id = v_enrollment_id
        AND grade_type_id = v_grade_type_id
        AND ((grade_label IS NULL AND p_grade_label IS NULL)
             OR grade_label = p_grade_label)
  ) THEN
    -- Update the grade ---------------------------------------------------------
    UPDATE grades
       SET grade_value = p_grade_value,                    -- set new grade
           graded_at   = IFNULL(p_graded_at, graded_at),   -- keep old date if NULL
           modified_at = NOW(),                            -- update timestamp
           modified_by = 'admin1'                          -- mark who updated
     WHERE enrollment_id = v_enrollment_id
       AND grade_type_id = v_grade_type_id                 -- ensure we update the right type
       AND ((grade_label IS NULL AND p_grade_label IS NULL)
            OR grade_label = p_grade_label);

    SELECT 'Grade updated.' AS msg;
  ELSE
    SELECT 'Grade not found. Use proc_add_grade.' AS msg;
  END IF;
END $$
DELIMITER ;

-- ----------------------------------------------------------------------------------
-- 3) get_top_3_students_per_course
DELIMITER $$
CREATE PROCEDURE get_top_3_students_per_course (
    IN p_course_id INT,          -- NULL = all courses
    IN p_semester  VARCHAR(20)   -- NULL = all semesters (e.g., '2025-Fall')
)
BEGIN
    -- Outer query: selects final ranked students with their course name --------
    SELECT 
        ranked.course_id,                                           -- course ID
        c.course_name,                                              -- course name
        ranked.student_id,                                          -- student ID
        CONCAT(s.first_name, ' ', s.last_name) AS student_name,     -- student full name
        ranked.average_grade                                        -- average grade
    FROM (
        -- Inner query: calculates average grade and ranking --------------------
        SELECT
            co.course_id,                                           -- course ID from offerings
            e.student_id,                                           -- student ID from enrollments
            AVG(g.grade_value) AS average_grade,                    -- average of grades
            RANK() OVER (                                           -- ranking students per course
                PARTITION BY co.course_id                           -- reset rank for each course
                ORDER BY AVG(g.grade_value) DESC                    -- highest avg grade first
            ) AS rnk
        FROM grades g
        JOIN enrollments      e  ON e.enrollment_id = g.enrollment_id
        JOIN course_offerings co ON co.offering_id  = e.offering_id
        JOIN semesters        se ON se.semester_id  = co.semester_id
        WHERE (p_course_id IS NULL OR co.course_id = p_course_id)
          AND (p_semester  IS NULL OR se.semester_name = p_semester) -- fixed column name
        GROUP BY co.course_id, e.student_id
    ) AS ranked
    JOIN students s ON s.student_id = ranked.student_id
    JOIN courses  c ON c.course_id  = ranked.course_id
    WHERE ranked.rnk <= 3
    ORDER BY ranked.course_id, ranked.rnk, student_name;
END $$
DELIMITER ;

-- ----------------------------------------------------------------------------------
-- 4) get_students_with_absences
DELIMITER $$
CREATE PROCEDURE get_students_with_absences(
    IN p_threshold INT   -- pass NULL to use per-course threshold
)
BEGIN
    SELECT 
        e.student_id,
        CONCAT(s.first_name, ' ', s.last_name) AS full_name,
        co.course_id,
        c.course_name,
        COUNT(*) AS absence_count
    FROM attendance a
    JOIN enrollments      e  ON e.enrollment_id = a.enrollment_id
    JOIN students         s  ON s.student_id    = e.student_id
    JOIN lectures         l  ON l.lecture_id    = a.lecture_id
    JOIN course_offerings co ON co.offering_id  = l.offering_id
    JOIN courses          c  ON c.course_id     = co.course_id
    WHERE a.is_present = 0
    GROUP BY e.student_id, co.course_id, c.course_name
    HAVING COUNT(*) >= COALESCE(p_threshold, MAX(c.absence_warning_threshold));
END $$
DELIMITER ;
-- ----------------------------------------------------------------------------------

-- 5) avg_grade_per_course
DELIMITER $$
CREATE PROCEDURE avg_grade_per_course(
    IN p_course_id  INT,           -- pass a course id or NULL for all
    IN p_grade_type VARCHAR(50)    -- 'Quiz','Assignment','Midterm','Final' (NULL = all)
)
BEGIN
    DECLARE v_grade_type_id INT;   -- will hold lookup id for the requested type

    -- if a grade type is provided, resolve it to its lookup_id (case-insensitive)
    IF p_grade_type IS NOT NULL THEN
        SELECT l.lookup_id
          INTO v_grade_type_id
        FROM lookup l
        WHERE l.domain = 'grade_type'
          AND LOWER(l.code) = LOWER(p_grade_type)
        LIMIT 1;

        -- if not found, raise an error; here we raise:
        IF v_grade_type_id IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Unknown grade type. Use Quiz/Assignment/Midterm/Final or NULL.';
        END IF;
    END IF;
    SELECT 
        c.course_id,                                                   -- course id
        c.course_name,                                                 -- course name
        ROUND(AVG(g.grade_value), 2) AS average_grade                  -- average over matching grades
    FROM grades g
    JOIN enrollments      e  ON e.enrollment_id = g.enrollment_id
    JOIN course_offerings co ON co.offering_id  = e.offering_id
    JOIN courses          c  ON c.course_id     = co.course_id
    WHERE (p_course_id IS NULL OR c.course_id = p_course_id)           -- optional course filter
      AND (v_grade_type_id IS NULL OR g.grade_type_id = v_grade_type_id) -- optional type filter
    GROUP BY c.course_id, c.course_name;                               -- one row per course
END $$
DELIMITER ;


-- ----------------------------------------------------------------------------------
-- 6) attendance_percentage
DELIMITER $$

CREATE PROCEDURE attendance_percentage(IN p_student_id INT)				  -- Optional filter
BEGIN
    SELECT 
        e.student_id,                                                     
        CONCAT(s.first_name, ' ', s.last_name) AS full_name,             
        COUNT(*) AS total_lectures,                                       -- Total number of lectures attended or missed
        SUM(a.is_present) AS attended_lectures,                           -- Number of lectures attended (is_present = 1)
        ROUND(SUM(a.is_present) / COUNT(*) * 100, 2) AS attendance_percentage -- Attendance percentage
    FROM attendance a                                                     -- Attendance records table
    JOIN enrollments e ON e.enrollment_id = a.enrollment_id               -- Join to get the student enrolled
    JOIN students   s ON s.student_id    = e.student_id                   -- Join to get the student's personal info
    WHERE (p_student_id IS NULL OR s.student_id = p_student_id)          -- If a specific student is passed, filter by that ID
    GROUP BY e.student_id, full_name;                                     -- Group results by student
END $$
DELIMITER ;


-- --------------------------------------------------------------------------------------------------------

-- 7) proc_enqueue_absence_notice  
-- when you use it: right after you mark a student absent (manually).
-- what it does: creates a row in notifications saying: “send this email to this student.”
-- how it builds the message: it pulls the template from notification_templates, replaces {{remaining}} with the real number,
-- and inserts the email into notifications with status='pending'  
-- this procedure doesn’t send the email; it queues it.

DELIMITER $$                                                
CREATE PROCEDURE proc_enqueue_absence_notice(
  IN p_enrollment_id BIGINT,
  IN p_lecture_id    BIGINT,
  IN p_lecture_date  DATE,                    
  IN p_to_email      VARCHAR(255),
  IN p_remaining     INT
)
BEGIN
  DECLARE v_tpl VARCHAR(255);
  DECLARE v_msg VARCHAR(255);

  -- Grab the template text
  SELECT template_body INTO v_tpl
  FROM notification_templates
  WHERE is_active = 1
    AND template_body LIKE 'You were marked absent.%'
  LIMIT 1;

  -- Default fallback template
  IF v_tpl IS NULL THEN
    SET v_tpl := 'You were marked absent. Remaining allowed absences: {{remaining}}';
  END IF;

  -- Simple {{remaining}} replacement
  SET v_msg = REPLACE(v_tpl, '{{remaining}}', p_remaining);

  -- Final insert (will fail if already exists unless handled outside)
  INSERT INTO notifications
    (template_id, enrollment_id, lecture_id, lecture_date, to_email, subject, message, status)
  VALUES
    (NULL, p_enrollment_id, p_lecture_id, p_lecture_date, p_to_email, 'Attendance Notice', v_msg, 'pending');
END $$
DELIMITER ;                                            


-- ----------------------------------------------------------------------------------------

-- 8) process_notifications (procedure)
-- when you use it:  o schedule (MySQL Event every 1 minute).
-- what it does: finds all pending notifications (that haven’t been sent yet) and, one by one, 
-- calls PowerShell through the UDF to actually send them.
-- after sending: updates each row to sent (or failed) and logs sent_at, attempts, last_error.

DELIMITER $$ 
CREATE PROCEDURE process_notifications()
BEGIN
  -- exit the loop once all notifications are processed
  DECLARE done INT DEFAULT 0;

  -- Variables to store one row from the notifications table
  DECLARE v_id BIGINT;
  DECLARE v_to VARCHAR(255);
  DECLARE v_subject VARCHAR(200);
  DECLARE v_message MEDIUMTEXT;
  DECLARE v_is_html TINYINT;

  -- Cursor to select all pending notifications that haven't failed 3 times yet
  DECLARE cur CURSOR FOR
    SELECT notification_id, to_email, subject, message, is_html
    FROM notifications
    WHERE status = 'pending' AND attempts < 3;

  -- When no more rows, this handler prevent an error and allow us to break the loop
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  -- Open the cursor (start reading the pending emails)
  OPEN cur;

  -- Start processing each notification one by one
  read_loop: LOOP
    -- Load one row into variables
    FETCH cur INTO v_id, v_to, v_subject, v_message, v_is_html;

    -- If no more data, exit the loop
    IF done THEN LEAVE read_loop; END IF;

    -- If the email is HTML
    SET @ishtml = CASE WHEN v_is_html = 1 THEN ' -IsHtml' ELSE '' END;

    -- Escape any quotes in the subject line so PowerShell doesn’t break
    SET @subj_esc = REPLACE(v_subject, '"', '\"');

    -- Convert the message body to base64, and remove line breaks
    -- This makes sure it's passed as one clean line to PowerShell
    SET @body_b64 = REPLACE(REPLACE(TO_BASE64(v_message), '\r', ''), '\n', '');

    -- Build the PowerShell command string that sends the email using sendmail.ps1
    SET @cmd = CONCAT(
      'powershell -ExecutionPolicy Bypass -File "C:\\mail\\sendmail.ps1"',
      ' -To "', v_to, '"',
      ' -Subject "', @subj_esc, '"',
      ' -BodyB64 "', @body_b64, '"',
      @ishtml
    );

    -- Run the command using sys_exec (returns 0 if success, otherwise error code)
    SET @rc = (SELECT sys_exec(@cmd));   

    -- If sending worked
    IF @rc = 0 THEN
      -- Mark the notification as sent, update time, clear any previous error
      UPDATE notifications
         SET status = 'sent',
             sent_at = NOW(),
             attempts = attempts + 1,
             last_error = NULL
       WHERE notification_id = v_id;

    -- If sending failed
    ELSE
      -- Mark it as failed if this was the 3rd attempt, or leave as pending to retry
      -- Also save the error code
      UPDATE notifications
         SET status = CASE 
                        WHEN attempts >= 2 THEN 'failed'
                        ELSE 'pending'
                      END,
             attempts = attempts + 1,
             last_error = CONCAT('sys_exec exit ', @rc)
       WHERE notification_id = v_id;
    END IF;

  END LOOP;

  -- Close the cursor after finishing
  CLOSE cur;
END $$
DELIMITER ;


-- ----------------------------------------------------------------------------------------------------------------------               

-- 9) sendmail.ps1 (PowerShell script)
-- what it does: the actual postman. Logs into Gmail/Outlook SMTP and sends the email.
-- how MySQL calls it: via the UDF function sys_exec('powershell -File C:\mail\sendmail.ps1 ...').
-- why we need it: MySQL can’t send emails by itself. It needs this script to talk to SMTP.                  

/* param(
  [Parameter(Mandatory = $true)][string]$To,
  [Parameter(Mandatory = $true)][string]$Subject,
  [Parameter(Mandatory = $false)][string]$Body,     
  [Parameter(Mandatory = $false)][string]$BodyB64,  
  [switch]$IsHtml
)

# SMTP profile 
$SmtpHost = "smtp.gmail.com"
$SmtpPort = 587
$User     = "YOUR MAIL THAT YOU WANT TO SEND FROM"
$Pass     = "YOUR PASSWORD"
$From     = $User

try {
  $secure = ConvertTo-SecureString $Pass -AsPlainText -Force
  $cred   = New-Object System.Management.Automation.PSCredential($User, $secure)

  # If Base64 is provided, decode it to get the real HTML/text body
  if ($BodyB64) {
    $bytes = [Convert]::FromBase64String($BodyB64)
    $Body  = [System.Text.Encoding]::UTF8.GetString($bytes)
  }

  $sm = @{
    To         = $To
    From       = $From
    Subject    = $Subject
    Body       = $Body
    SmtpServer = $SmtpHost
    Port       = $SmtpPort
    UseSsl     = $true
    Credential = $cred
  }
  if ($IsHtml) { $sm.BodyAsHtml = $true }

  Send-MailMessage @sm
  exit 0
}
catch {
  Write-Error $_
  exit 1
}
*/

/* MySQL can’t send emails on its own, so I built a small email pipeline.
When a student is marked absent, I call a procedure that queues an email in a table called notifications.
And then it will be sent automaticly in batches using a procedure that picks up all pending emails.
The database doesn’t send mail directly; instead it uses a tiny plugin (UDF) to run a PowerShell script. That script logs into
Gmail/Outlook and sends the email through SMTP.
Every email is tracked in the notifications table with status, attempts, time sent, and any error. So it’s auditable and reliable.*/



-- ---------------------------------------------------------------------------------------------------------------------
-- 10) procedure import attendance file 
DELIMITER $$ 
CREATE PROCEDURE proc_import_attendance_file(
  IN p_filename VARCHAR(255)  -- the name of the CSV file i'm importing 
)
BEGIN
  -- Declare variables for each column in the CSV
  DECLARE v_student_id   INT;
  DECLARE v_lecture_id   BIGINT;
  DECLARE v_date         DATE;
  DECLARE v_present_str  VARCHAR(10);
  DECLARE v_actor        VARCHAR(50);

  -- Logic helpers
  DECLARE v_present_bool BOOLEAN;  -- true/false equivalent
  DECLARE v_done INT DEFAULT 0;    -- to track end of cursor
  DECLARE v_ok_rows    INT DEFAULT 0;  -- how many rows succeeded
  DECLARE v_error_rows INT DEFAULT 0;  -- how many rows failed

  -- For calling external PowerShell script
  DECLARE v_cmd TEXT;  
  DECLARE v_rc  INT;   

  -- =========================
  -- 1. Open cursor over CSV staging table
  -- =========================
  BEGIN
    -- The cursor selects rows from attendance_stage that match the file being processed
    DECLARE c CURSOR FOR
      SELECT student_id, lecture_id, lecture_date_str, is_present_str, actor
      FROM attendance_stage
      WHERE src_file = p_filename
      ORDER BY stage_id;

    -- Handler to stop loop when cursor is exhausted
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

    SET v_done = 0;
    OPEN c;

    -- Start looping through each row in the staging table
    read_loop: LOOP
      FETCH c INTO v_student_id, v_lecture_id, v_date, v_present_str, v_actor;
      IF v_done = 1 THEN LEAVE read_loop; END IF;

      -- Normalize presence string to boolean
      SET v_present_bool =
        CASE
          WHEN v_present_str IN ('1','Y','y','T','t','true','TRUE','True') THEN 1
          ELSE 0
        END;

      -- Try to add the attendance, If it fails, update the staging table with an error message
      BEGIN
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
        BEGIN
          SET v_error_rows = v_error_rows + 1;

          -- Mark this row as failed in the staging table
          UPDATE attendance_stage
             SET error_msg = 'proc_add_attendance failed'
           WHERE src_file = p_filename
             AND student_id = v_student_id
             AND lecture_id = v_lecture_id
             AND DATE(lecture_date_str) = v_date
           ORDER BY stage_id DESC
           LIMIT 1;
        END;

        -- Call the main attendance procedure for each row
        CALL proc_add_attendance(
          v_student_id,
          v_lecture_id,
          v_date,
          v_present_bool,
          COALESCE(v_actor, 'Admin1')  -- default actor if missing
        );

        -- If it worked, mark row as successful
        SET v_ok_rows = v_ok_rows + 1;

        UPDATE attendance_stage
           SET error_msg = NULL
         WHERE src_file = p_filename
           AND student_id = v_student_id
           AND lecture_id = v_lecture_id
           AND lecture_date_str = v_date
         ORDER BY stage_id DESC
         LIMIT 1;
      END;
    END LOOP;

    CLOSE c;
  END;

  -- =========================
  -- 2. Build the PowerShell command to move the file
  -- =========================
  -- The script moves the file to "dest" or "failed" folder depending on whether any errors occurred
  SET v_cmd = CONCAT(
    'powershell -ExecutionPolicy Bypass -File ',
    '"C:\\imports\\attendance\\move_attendance_file.ps1" ',
    '"', p_filename, '" ',
    '"', IF(v_error_rows > 0, 'failed', 'dest'), '"'
  );

  -- =========================
  -- 3. Run the PowerShell script (uses sys_exec function in MariaDB)
  -- =========================
  SET v_rc = (SELECT sys_exec(v_cmd));  -- 0 = success

  -- =========================
  -- 4. Return a summary of what happened
  -- =========================
  SELECT 
    p_filename AS file_name,
    v_ok_rows AS loaded_ok,         -- how many rows were added successfully
    v_error_rows AS failed_rows,    -- how many rows failed
    IF(v_error_rows > 0, 'failed', 'dest') AS target_folder,  -- where the file was moved
    v_rc AS move_result;            -- sys_exec return code (0 = ok)

END $$
DELIMITER ;

-- =======================================================================================================
-- 											Output Queries
-- =======================================================================================================
-- 1) Add a grade 
CALL proc_add_grade(4, 3, '2025-Spring', 'Midterm', 22.50, NULL, NULL); -- student_id ,course_id ,semester_name ,grade_type ,grade_value ,graded_at, grade_label 

-- 2) Update a grade
CALL proc_update_grade(4, 3, '2025-Spring', 'midterm', 24.00, NULL, NULL); -- student_id ,course_id ,semester_name ,grade_type ,grade_value ,graded_at, grade_label 

-- 3) Top 3 
CALL get_top_3_students_per_course(NULL, null); -- course id, semester name '2025-Spring'

-- 4) Add attendance
CALL project2.proc_add_attendance(8, 11, '2025-03-10', 0, 'Admin1'); -- ============== -> do this, student id ,lecture id, lecture_date, present?, actor

-- 5) return students that passed the attendance threshold
call project2.get_students_with_absences(1); -- attendance threshold

-- 6) average grades  
call project2.avg_grade_per_course(null,'Midterm'); -- course id & grade type

-- 7) attendance percentage
call project2.attendance_percentage(null); -- student id 



-- ====================================================================================================================================
--  													TRIGGERS
-- ====================================================================================================================================

-- 1) students log triggers
DELIMITER //
CREATE TRIGGER trg_students_update
AFTER UPDATE ON students
FOR EACH ROW
BEGIN
  INSERT INTO students_log
  (
    student_id, operation, changed_at, changed_by,
    old_first_name, new_first_name,
    old_last_name,  new_last_name,
    old_email,      new_email,
    old_major_id,   new_major_id,
    old_st_status,  new_st_status,         
    old_enrollment_date, new_enrollment_date,
    modified_at
  )
  VALUES
  (
    OLD.student_id, 'UPDATE', NOW(), COALESCE(NEW.modified_by, 'system'),
    OLD.first_name, NEW.first_name,
    OLD.last_name,  NEW.last_name,
    OLD.email,      NEW.email,
    OLD.major_id,   NEW.major_id,
    OLD.status_id,  NEW.status_id,         
    OLD.enrollment_date, NEW.enrollment_date,
    NOW()
  );
END//
DELIMITER ;
-- ----------------------
DELIMITER $$
CREATE TRIGGER trg_students_delete
BEFORE DELETE ON students
FOR EACH ROW
BEGIN
  INSERT INTO students_log (
    student_id, operation, changed_by,
    old_first_name, old_last_name, old_email,
    old_major_id, old_status_id, old_enrollment_date
  ) VALUES (
    OLD.student_id, 'DELETE', COALESCE(OLD.modified_by,'system'),
    OLD.first_name, OLD.last_name, OLD.email,
    OLD.major_id, OLD.status_id, OLD.enrollment_date
  );
END $$
DELIMITER ;



-- ====================================================================================================================================
--  													FUNCTIONS
-- ====================================================================================================================================
-- => func_count_absences
DELIMITER $$
CREATE FUNCTION func_count_absences(
	p_student_id INT,        -- The student we’re checking
    p_course_id  INT         -- The course we want absences for (NULL = all courses)
) RETURNS int(11)
    DETERMINISTIC			 -- same output for same input each time 
BEGIN
    DECLARE total_absences INT;
    SELECT COUNT(*)
    INTO total_absences
    FROM attendance a
    JOIN enrollments      e  ON e.enrollment_id = a.enrollment_id
    JOIN course_offerings co ON co.offering_id  = e.offering_id
    WHERE e.student_id = p_student_id
      AND a.is_present = 0
      AND (p_course_id IS NULL OR co.course_id = p_course_id); -- filter by course if provided

    RETURN total_absences;
END $$
DELIMITER ;

-- ---------------------------------------------------------------------------------
SET GLOBAL event_scheduler = ON;
CREATE EVENT ev_process_notifications
ON SCHEDULE EVERY 30 second
DO
  CALL process_notifications();


