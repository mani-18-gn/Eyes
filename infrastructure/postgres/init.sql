-- Enable pgvector extension for high-performance semantic search
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- RealityLens production database initialization
GRANT ALL PRIVILEGES ON DATABASE realitylens_db TO realitylens_user;
