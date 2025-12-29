
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars from root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL database');

    // Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL
      );
    `);

    // Create Sessions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        subject VARCHAR(255),
        topic VARCHAR(255),
        planned_minutes INTEGER,
        start_time BIGINT,
        end_time BIGINT,
        metrics JSONB,
        slices JSONB
      );
    `);

    // Create Assignments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        due_date VARCHAR(255),
        completed BOOLEAN DEFAULT FALSE
      );
    `);

    // Create Exams Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        date VARCHAR(255)
      );
    `);

    // Create Projects Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at BIGINT
      );
    `);

    // Create Content Sources Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_sources (
        id VARCHAR(255) PRIMARY KEY,
        project_id VARCHAR(255) REFERENCES projects(id),
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        metadata TEXT, 
        file_data BYTEA,
        created_at BIGINT
      );
    `);

    // Create Lecture Sessions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lecture_sessions (
        id VARCHAR(255) PRIMARY KEY,
        project_id VARCHAR(255) REFERENCES projects(id),
        title VARCHAR(255) NOT NULL,
        transcript TEXT,
        audio_url TEXT,
        duration INTEGER,
        status VARCHAR(50) DEFAULT 'processing',
        created_at BIGINT
      );
    `);

    // Create Learning Materials Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS learning_materials (
        id VARCHAR(255) PRIMARY KEY,
        project_id VARCHAR(255) REFERENCES projects(id),
        type VARCHAR(50) NOT NULL,
        content TEXT,
        created_at BIGINT
      );
    `);

    console.log('Database tables initialized');
  } catch (err) {
    console.error('Error initializing database', err);
  } finally {
    client.release();
  }
};
