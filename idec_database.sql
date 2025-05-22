-- IDEC Health Monitoring System Database Schema
-- This SQL script creates all necessary tables for the application

-- Drop tables if they exist to avoid conflicts
DROP TABLE IF EXISTS edic_screenings;
DROP TABLE IF EXISTS edic_children;
DROP TABLE IF EXISTS edic_users;

-- Create users table
CREATE TABLE IF NOT EXISTS edic_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  fullName VARCHAR(255) NOT NULL,
  mobilePhone VARCHAR(255),
  role ENUM('admin', 'vht') NOT NULL DEFAULT 'vht',
  district VARCHAR(255),
  healthFacility VARCHAR(255),
  status ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create children table
CREATE TABLE IF NOT EXISTS edic_children (
  id INT AUTO_INCREMENT PRIMARY KEY,
  childId VARCHAR(10) NOT NULL UNIQUE,
  fullName VARCHAR(255) NOT NULL,
  dateOfBirth VARCHAR(255) NOT NULL,
  gender VARCHAR(50) NOT NULL,
  district VARCHAR(255) NOT NULL,
  healthFacility VARCHAR(255) NOT NULL,
  caretakerName VARCHAR(255) NOT NULL,
  caretakerContact VARCHAR(255),
  address VARCHAR(255),
  status VARCHAR(50) DEFAULT 'healthy',
  registeredBy INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (registeredBy) REFERENCES edic_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create screenings table
CREATE TABLE IF NOT EXISTS edic_screenings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  childId INT NOT NULL,
  date VARCHAR(50) NOT NULL,
  weight VARCHAR(50),
  height VARCHAR(50),
  muac VARCHAR(50),
  hearingScreening VARCHAR(50) DEFAULT 'pass',
  visionScreening VARCHAR(50) DEFAULT 'pass',
  mdatSF1 VARCHAR(50) DEFAULT 'pass',
  mdatLF1 VARCHAR(50) DEFAULT 'pass',
  mdatSF2 VARCHAR(50) DEFAULT 'pass',
  mdatLF2 VARCHAR(50) DEFAULT 'pass',
  currentAge VARCHAR(50),
  screeningDate VARCHAR(50),
  oedema BOOLEAN DEFAULT FALSE,
  appetite VARCHAR(50) DEFAULT 'good',
  symptoms TEXT,
  heightForAge ENUM('normal', 'moderate', 'severe') DEFAULT 'normal',
  weightForAge ENUM('normal', 'moderate', 'severe') DEFAULT 'normal',
  weightForHeight ENUM('normal', 'moderate', 'severe') DEFAULT 'normal',
  muacResult ENUM('normal', 'moderate', 'severe') DEFAULT 'normal',
  referralRequired BOOLEAN DEFAULT FALSE,
  referralFacility VARCHAR(255),
  referralDate VARCHAR(50),
  referralReason TEXT,
  screenedBy INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (childId) REFERENCES edic_children(id),
  FOREIGN KEY (screenedBy) REFERENCES edic_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default admin user
INSERT INTO edic_users (username, password, fullName, role, district, healthFacility, status)
VALUES ('admin', 'admin123', 'Admin User', 'admin', 'Kampala', 'Central Hospital', 'active');

-- Insert default VHT user
INSERT INTO edic_users (username, password, fullName, role, district, healthFacility, status)
VALUES ('vht', 'vht123', 'VHT User', 'vht', 'Wakiso', 'District Health Center', 'active');

-- Insert sample child
INSERT INTO edic_children (childId, fullName, dateOfBirth, gender, district, healthFacility, caretakerName, caretakerContact, status, registeredBy)
VALUES ('TESTID01', 'CHILD 01', '2022-05-01', 'male', 'Kampala', 'Central Hospital', 'Parent 01', '1234567890', 'healthy', 1);

-- Session management table (optional)
CREATE TABLE IF NOT EXISTS edic_sessions (
  session_id VARCHAR(128) NOT NULL,
  expires INT(11) UNSIGNED NOT NULL,
  data TEXT,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;