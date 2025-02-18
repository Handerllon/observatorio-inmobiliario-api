
# Observatorio Inmobiliario - API

Porción back-end de la solución Observatorio Inmobiliario para UADE

### Requerimientos

- Nodejs v20.3.x +

### Instalación
Antes de comenzar con la instalación, se deben configurar las variables de entorno a ser utilizadas por la aplicación. Crear una copia del archivo `.env.example` y llamarla `.env`. Completar el archivo con la información requerida.

**Nota**: `PREDICTOR_BASE_PATH` será la ruta al predictor implementado en python, utilizado para la estimación de precio de alquileres.

Realizar la instalación de las librerias con el siguiente comando:  
`npm install`  

Iniciar la aplicación con:  
`npm start`

### Referencia API
Se tienen 1 endpoint.

#### POST /rent
Retorna la estimación de precio de alquiler a partir de ciertas variables. Ejemplo de ejecución con CURL hacia entorno local:
```
curl --location 'https://valorar.ar/api/rent' \
--header 'Content-Type: application/json' \
--data '{
    "caracteristicas": ["balcony"],
    "amenities": ["gimnasio"],
    "lat": -30,
    "lon": -30,
    "antiguedad": 30,
    "ambientes": 3,
    "cuartos": 2,
    "banos": 1,
    "superficie_total": 60,
    "barrio": "Recoleta",
    "localidad": "Buenos Aires"
}'
```