-- Migración para agregar soporte de AWS Cognito a la tabla users
-- Ejecutar antes de usar la integración con Cognito

-- Agregar columna cognitoSub para almacenar el ID único de Cognito
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "cognitoSub" VARCHAR(255) NULL;

-- Agregar constraint de unicidad para cognitoSub
ALTER TABLE users 
ADD CONSTRAINT "UQ_users_cognitoSub" UNIQUE ("cognitoSub");

-- Hacer el campo password nullable ya que Cognito maneja las contraseñas
ALTER TABLE users 
ALTER COLUMN password DROP NOT NULL;

-- Crear índice para mejorar las búsquedas por cognitoSub
CREATE INDEX IF NOT EXISTS "IDX_users_cognitoSub" ON users ("cognitoSub");

-- Comentarios para documentación
COMMENT ON COLUMN users."cognitoSub" IS 'ID único del usuario en AWS Cognito (sub claim del JWT)';

