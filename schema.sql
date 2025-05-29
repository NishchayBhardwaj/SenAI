-- Create the database
CREATE DATABASE IF NOT EXISTS senai;
USE senai;

-- Candidates Table
CREATE TABLE IF NOT EXISTS "candidates" (
  "candidate_id" int NOT NULL AUTO_INCREMENT,
  "full_name" varchar(255) NOT NULL,
  "email" varchar(255) DEFAULT NULL,
  "phone" varchar(50) DEFAULT NULL,
  "location" varchar(255) DEFAULT NULL,
  "years_experience" int DEFAULT NULL,
  "resume_file_path" varchar(1000) DEFAULT NULL,
  "resume_s3_url" varchar(1000) DEFAULT NULL,
  "original_filename" varchar(255) DEFAULT NULL,
  "status" enum('PENDING','SHORTLISTED','REJECTED') DEFAULT NULL,
  "created_at" datetime DEFAULT NULL,
  "updated_at" datetime DEFAULT NULL,
  "is_duplicate" tinyint(1) DEFAULT '0',
  "user_id" int DEFAULT NULL,
  PRIMARY KEY ("candidate_id"),
  UNIQUE KEY "email" ("email"),
  KEY "idx_candidates_status" ("status"),
  KEY "idx_user_id" ("user_id")
);


-- Education Table
CREATE TABLE IF NOT EXISTS "education" (
  "education_id" int NOT NULL AUTO_INCREMENT,
  "candidate_id" int DEFAULT NULL,
  "degree" varchar(255) DEFAULT NULL,
  "institution" varchar(255) DEFAULT NULL,
  "graduation_year" int DEFAULT NULL,
  PRIMARY KEY ("education_id"),
  KEY "candidate_id" ("candidate_id"),
  CONSTRAINT "education_ibfk_1" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("candidate_id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "resume_batches" (
  "batch_id" varchar(36) NOT NULL,
  "upload_date" datetime NOT NULL,
  "total_files" int NOT NULL,
  "processed_files" int DEFAULT NULL,
  "failed_files" int DEFAULT NULL,
  "duplicate_files" int DEFAULT NULL,
  "user_id" varchar(50) DEFAULT NULL,
  "status" enum('PROCESSING','COMPLETED','FAILED','PARTIAL') DEFAULT NULL,
  "completion_date" datetime DEFAULT NULL,
  "error_message" text,
  PRIMARY KEY ("batch_id")
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "session_id" varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  "expires" int unsigned NOT NULL,
  "data" mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY ("session_id")
);


-- Skills Table
CREATE TABLE IF NOT EXISTS "skills" (
  "skill_id" int NOT NULL AUTO_INCREMENT,
  "candidate_id" int DEFAULT NULL,
  "skill_name" text,
  "skill_category" varchar(100) DEFAULT NULL,
  "proficiency_level" enum('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT','UNKNOWN') DEFAULT NULL,
  "is_verified" tinyint(1) DEFAULT '0',
  PRIMARY KEY ("skill_id"),
  KEY "candidate_id" ("candidate_id"),
  CONSTRAINT "skills_ibfk_1" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("candidate_id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" int NOT NULL AUTO_INCREMENT,
  "google_id" varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  "email" varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  "name" varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  "profile_picture" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "last_login" timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  UNIQUE KEY "google_id" ("google_id"),
  KEY "idx_google_id" ("google_id"),
  KEY "idx_email" ("email")
);

CREATE TABLE IF NOT EXISTS "work_experiences" (
  "experience_id" int NOT NULL AUTO_INCREMENT,
  "candidate_id" int DEFAULT NULL,
  "company" varchar(255) DEFAULT NULL,
  "position" varchar(255) DEFAULT NULL,
  "start_date" varchar(50) DEFAULT NULL,
  "end_date" varchar(50) DEFAULT NULL,
  "duration" varchar(100) DEFAULT NULL,
  PRIMARY KEY ("experience_id"),
  KEY "fk_candidate_id" ("candidate_id"),
  CONSTRAINT "fk_candidate_id" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("candidate_id") ON DELETE CASCADE ON UPDATE CASCADE
);