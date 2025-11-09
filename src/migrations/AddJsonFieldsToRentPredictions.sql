-- Migración: Agregar campos JSON a rent_predictions
-- Fecha: 2025-10-25
-- Descripción: Agrega campos JSONB para images, metrics y nearbyPlaces, elimina campos obsoletos

-- ==================== ELIMINAR CAMPOS OBSOLETOS ====================
-- Estos campos no se usan más, las métricas ahora están en el campo JSON 'metrics'
ALTER TABLE rent_predictions DROP COLUMN IF EXISTS "inmueblesDisponibles";
ALTER TABLE rent_predictions DROP COLUMN IF EXISTS "publicacionesRemovidas";
ALTER TABLE rent_predictions DROP COLUMN IF EXISTS "publicacionesNuevas";

-- ==================== AGREGAR NUEVOS CAMPOS JSONB ====================

-- Campo: images - URLs de imágenes del reporte
ALTER TABLE rent_predictions ADD COLUMN IF NOT EXISTS images JSONB DEFAULT NULL;
COMMENT ON COLUMN rent_predictions.images IS 'URLs de imágenes del reporte (price_by_m2_evolution, price_evolution, bar_price_by_amb, etc.)';

-- Campo: metrics - Métricas del barrio
ALTER TABLE rent_predictions ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT NULL;
COMMENT ON COLUMN rent_predictions.metrics IS 'Métricas del barrio (total_properties, new_properties_since_last_report, average_price_neighborhood, etc.)';

-- Campo: nearbyPlaces - Lugares cercanos (Overpass/OSM)
ALTER TABLE rent_predictions ADD COLUMN IF NOT EXISTS "nearbyPlaces" JSONB DEFAULT NULL;
COMMENT ON COLUMN rent_predictions."nearbyPlaces" IS 'Lugares cercanos obtenidos via Overpass API (coordinates, transporte, sitios_interes, etc.)';

-- ==================== ÍNDICES PARA CAMPOS JSON ====================
-- Índice GIN para búsquedas eficientes en campos JSONB
CREATE INDEX IF NOT EXISTS idx_rent_predictions_images_gin ON rent_predictions USING GIN (images);
CREATE INDEX IF NOT EXISTS idx_rent_predictions_metrics_gin ON rent_predictions USING GIN (metrics);
CREATE INDEX IF NOT EXISTS idx_rent_predictions_nearbyplaces_gin ON rent_predictions USING GIN ("nearbyPlaces");

-- ==================== VERIFICACIÓN ====================
-- Contar registros totales
SELECT COUNT(*) as total_predictions FROM rent_predictions;

-- Ver estructura de la tabla actualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'rent_predictions' 
ORDER BY ordinal_position;

