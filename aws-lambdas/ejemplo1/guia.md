# Guía Completa: AWS Lambda con Python + API Gateway

## Paso 1: Crear la función Lambda en Python

## Paso 2: Crear la función Lambda en AWS Console

1. **Acceder a AWS Lambda**:
   - Inicia sesión en la consola de AWS
   - Busca "Lambda" en el buscador de servicios
   - Haz clic en "Crear función"

2. **Configurar la función**:
   - Selecciona "Crear desde cero"
   - **Nombre de función**: `obtener-persona-fake`
   - **Runtime**: Python 3.12 (o la versión más reciente)
   - **Arquitectura**: x86_64
   - Deja los permisos por defecto (se creará un rol automáticamente)
   - Haz clic en "Crear función"

3. **Agregar el código**:
   - En el editor de código, pega el código Python del artifact
   - Haz clic en "Deploy" para guardar los cambios

## Paso 3: Configurar API Gateway

1. **Crear una API REST**:
   - Ve al servicio "API Gateway" en AWS
   - Haz clic en "Crear API"
   - Selecciona "API REST" → "Crear"
   - Elige "Nueva API"
   - **Nombre**: `PersonaFakeAPI`
   - Tipo: Regional
   - Haz clic en "Crear API"

2. **Crear un recurso y método**:
   - En "Recursos", haz clic en "Acciones" → "Crear recurso"
   - **Nombre del recurso**: `persona`
   - Marca "Habilitar CORS de API Gateway" (opcional)
   - Haz clic en "Crear recurso"

3. **Agregar método GET**:
   - Selecciona el recurso `/persona`
   - Haz clic en "Acciones" → "Crear método"
   - Selecciona "GET" del menú desplegable
   - Haz clic en el check ✓

4. **Configurar la integración**:
   - **Tipo de integración**: Función Lambda
   - **Usar integración de proxy de Lambda**: Marca esta casilla
   - **Región de Lambda**: Selecciona tu región
   - **Función Lambda**: Escribe el nombre de tu función (`obtener-persona-fake`)
   - Haz clic en "Guardar"
   - Confirma que quieres dar permisos a API Gateway

## Paso 4: Desplegar la API

1. **Crear un stage (entorno)**:
   - Haz clic en "Acciones" → "Implementar la API"
   - **Etapa de implementación**: [Nueva etapa]
   - **Nombre de la etapa**: `prod` (o `dev`, `test`, etc.)
   - Haz clic en "Implementar"

2. **Obtener la URL**:
   - Verás la URL de invocación en la parte superior
   - Se verá algo así: `https://xxxxxxxx.execute-api.region.amazonaws.com/prod`
   - Tu endpoint completo será: `https://xxxxxxxx.execute-api.region.amazonaws.com/prod/persona`

## Paso 5: Probar la integración

Puedes probar de varias formas:

**Desde el navegador**:
```
https://tu-api-id.execute-api.us-east-1.amazonaws.com/prod/persona
```

**Desde la terminal con curl**:
```bash
curl https://tu-api-id.execute-api.us-east-1.amazonaws.com/prod/persona
```
