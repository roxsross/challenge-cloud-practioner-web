import json
import urllib.request
import urllib.error

def get_data():
    """
    Obtiene datos de la API de FakerAPI
    """
    api_url = "https://fakerapi.it/api/v1/persons?_quantity=1&_gender=male&_birthday_start=2005-01-01"
    
    try:
        # Realizar la petición HTTP GET
        with urllib.request.urlopen(api_url) as response:
            # Leer la respuesta
            raw_data = response.read().decode('utf-8')
            # Parsear JSON
            data = json.loads(raw_data)
            return data
    except urllib.error.HTTPError as e:
        raise Exception(f"HTTP Error: {e.code} - {e.reason}")
    except urllib.error.URLError as e:
        raise Exception(f"URL Error: {e.reason}")
    except json.JSONDecodeError as e:
        raise Exception(f"JSON Decode Error: {str(e)}")

def lambda_handler(event, context):
    """
    Función principal de AWS Lambda
    
    Args:
        event: Evento de entrada (contiene datos del API Gateway)
        context: Contexto de ejecución de Lambda
    
    Returns:
        dict: Respuesta HTTP con statusCode y body
    """
    try:
        # Obtener los datos
        result = get_data()
        
        # Construir la respuesta
        response = {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'  
            },
            'body': json.dumps(result)
        }
        
        return response
        
    except Exception as e:
        # Manejo de errores
        error_response = {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': str(e)
            })
        }
        return error_response