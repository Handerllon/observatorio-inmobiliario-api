-- Migración para crear la tabla rent_predictions
-- Ejecutar antes de usar el sistema de historial de predicciones

-- Crear tipo enum para el estado de la predicción
CREATE TYPE prediction_status AS ENUM ('success', 'error', 'pending');

-- Crear tabla rent_predictions
CREATE TABLE IF NOT EXISTS rent_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con usuario de Cognito
    "cognitoSub" VARCHAR(255) NOT NULL,
    "userEmail" VARCHAR(255),
    
    -- ==================== CAMPOS PRE-GENERACIÓN (Input) ====================
    barrio VARCHAR(255),
    ambientes INTEGER,
    "metrosCuadradosMin" DECIMAL(10, 2),
    "metrosCuadradosMax" DECIMAL(10, 2),
    dormitorios INTEGER,
    banos INTEGER,
    garajes INTEGER,
    antiguedad INTEGER,
    calle VARCHAR(255),
    
    -- ==================== CAMPOS POST-GENERACIÓN (Resultados) ====================
    "inmueblesDisponibles" INTEGER,
    "publicacionesRemovidas" INTEGER,
    "publicacionesNuevas" INTEGER,
    "precioCotaInferior" DECIMAL(12, 2),
    "precioCotaSuperior" DECIMAL(12, 2),
    moneda VARCHAR(10) DEFAULT 'ARS',
    
    -- ==================== METADATOS ====================
    status prediction_status DEFAULT 'pending',
    "errorMessage" TEXT,
    "executionTimeMs" INTEGER,
    
    -- ==================== DATOS DEL USUARIO ====================
    "userNotes" TEXT,
    "isFavorite" BOOLEAN DEFAULT FALSE,
    
    -- ==================== TIMESTAMPS ====================
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_rent_predictions_cognito_sub ON rent_predictions("cognitoSub");
CREATE INDEX IF NOT EXISTS idx_rent_predictions_created_at ON rent_predictions("createdAt");
CREATE INDEX IF NOT EXISTS idx_rent_predictions_status ON rent_predictions(status);
CREATE INDEX IF NOT EXISTS idx_rent_predictions_user_date ON rent_predictions("cognitoSub", "createdAt");
CREATE INDEX IF NOT EXISTS idx_rent_predictions_favorite ON rent_predictions("cognitoSub", "isFavorite") WHERE "isFavorite" = TRUE;
CREATE INDEX IF NOT EXISTS idx_rent_predictions_barrio ON rent_predictions(barrio);
CREATE INDEX IF NOT EXISTS idx_rent_predictions_dormitorios ON rent_predictions(dormitorios);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_rent_predictions_updated_at 
    BEFORE UPDATE ON rent_predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE rent_predictions IS 'Historial de predicciones de alquiler realizadas por usuarios';
COMMENT ON COLUMN rent_predictions."cognitoSub" IS 'ID único del usuario en AWS Cognito';
COMMENT ON COLUMN rent_predictions.barrio IS 'Barrio donde se busca la propiedad';
COMMENT ON COLUMN rent_predictions.ambientes IS 'Cantidad de ambientes de la propiedad';
COMMENT ON COLUMN rent_predictions."metrosCuadradosMin" IS 'Metros cuadrados cota inferior';
COMMENT ON COLUMN rent_predictions."metrosCuadradosMax" IS 'Metros cuadrados cota superior';
COMMENT ON COLUMN rent_predictions.dormitorios IS 'Cantidad de dormitorios';
COMMENT ON COLUMN rent_predictions.banos IS 'Cantidad de baños';
COMMENT ON COLUMN rent_predictions.garajes IS 'Cantidad de garajes';
COMMENT ON COLUMN rent_predictions.antiguedad IS 'Antigüedad de la propiedad en años';
COMMENT ON COLUMN rent_predictions.calle IS 'Calle donde se ubica la propiedad';
COMMENT ON COLUMN rent_predictions."inmueblesDisponibles" IS 'Cantidad de inmuebles disponibles encontrados';
COMMENT ON COLUMN rent_predictions."publicacionesRemovidas" IS 'Cantidad de publicaciones removidas';
COMMENT ON COLUMN rent_predictions."publicacionesNuevas" IS 'Cantidad de publicaciones nuevas';
COMMENT ON COLUMN rent_predictions."precioCotaInferior" IS 'Precio cota inferior del rango';
COMMENT ON COLUMN rent_predictions."precioCotaSuperior" IS 'Precio cota superior del rango';
COMMENT ON COLUMN rent_predictions.status IS 'Estado de la predicción: success, error, pending';
COMMENT ON COLUMN rent_predictions."isFavorite" IS 'Marca si el usuario guardó esta predicción como favorita';

