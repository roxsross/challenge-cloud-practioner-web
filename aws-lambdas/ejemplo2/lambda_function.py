import json
import urllib.request
import urllib.error
import boto3
from boto3.dynamodb.conditions import Key, Attr
from datetime import datetime, timedelta
from decimal import Decimal
import uuid
import random

# Clientes de DynamoDB
dynamodb = boto3.resource('dynamodb')
usuarios_table = dynamodb.Table('Usuarios')  
productos_table = dynamodb.Table('Productos')  
ordenes_table = dynamodb.Table('Ordenes') 

# ==================== UTILIDADES ====================

def convert_to_dynamodb_format(obj):
    """Convierte float a Decimal para DynamoDB"""
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_to_dynamodb_format(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_dynamodb_format(i) for i in obj]
    return obj

def to_json_serializable(obj):
    """Convierte objetos para serialización JSON"""
    return json.loads(json.dumps(obj, default=str))

# ==================== USUARIOS ====================

def get_usuarios_from_api(quantity=5, gender='male'):
    """Obtiene usuarios de FakerAPI"""
    api_url = f"https://fakerapi.it/api/v1/persons?_quantity={quantity}&_gender={gender}"
    
    try:
        with urllib.request.urlopen(api_url) as response:
            raw_data = response.read().decode('utf-8')
            return json.loads(raw_data)
    except Exception as e:
        raise Exception(f"Error al obtener usuarios: {str(e)}")

def save_usuario(usuario):
    """Guarda un usuario en DynamoDB"""
    item = {
        'id': str(usuario['id']),
        'firstname': usuario['firstname'],
        'lastname': usuario['lastname'],
        'email': usuario['email'],
        'phone': usuario['phone'],
        'birthday': usuario['birthday'],
        'gender': usuario['gender'],
        'address': convert_to_dynamodb_format(usuario['address']),
        'created_at': datetime.now().isoformat(),
        'ttl': int((datetime.now() + timedelta(days=30)).timestamp())
    }
    usuarios_table.put_item(Item=item)
    return item

def get_all_usuarios():
    """Obtiene todos los usuarios"""
    response = usuarios_table.scan()
    return to_json_serializable(response.get('Items', []))

def get_usuario_by_id(usuario_id):
    """Obtiene un usuario por ID"""
    response = usuarios_table.get_item(Key={'id': usuario_id})
    item = response.get('Item')
    return to_json_serializable(item) if item else None

# ==================== PRODUCTOS ====================

def get_productos_from_api(quantity=10):
    """Obtiene productos de FakerAPI"""
    api_url = f"https://fakerapi.it/api/v1/products?_quantity={quantity}&_price_min=10&_price_max=1000"
    
    try:
        with urllib.request.urlopen(api_url) as response:
            raw_data = response.read().decode('utf-8')
            return json.loads(raw_data)
    except Exception as e:
        raise Exception(f"Error al obtener productos: {str(e)}")

def save_producto(producto):
    """Guarda un producto en DynamoDB"""
    item = {
        'id': str(producto['id']),
        'name': producto['name'],
        'description': producto['description'],
        'ean': producto['ean'],
        'price': convert_to_dynamodb_format(producto['price']),
        'net_price': convert_to_dynamodb_format(producto['net_price']),
        'taxes': convert_to_dynamodb_format(producto['taxes']),
        'image': producto['image'],
        'categories': [str(cat) for cat in producto['categories']],  # Convertir a strings
        'stock': random.randint(10, 100),
        'created_at': datetime.now().isoformat(),
        'ttl': int((datetime.now() + timedelta(days=90)).timestamp())
    }
    productos_table.put_item(Item=item)
    return item

def get_all_productos():
    """Obtiene todos los productos"""
    response = productos_table.scan()
    return to_json_serializable(response.get('Items', []))

def get_producto_by_id(producto_id):
    """Obtiene un producto por ID"""
    response = productos_table.get_item(Key={'id': producto_id})
    item = response.get('Item')
    return to_json_serializable(item) if item else None

def search_productos_by_category(category):
    """Busca productos por categoría"""
    response = productos_table.scan()
    items = response.get('Items', [])
    filtered = [
        item for item in items 
        if category.lower() in [cat.lower() for cat in item.get('categories', [])]
    ]
    return to_json_serializable(filtered)

# ==================== ORDENES ====================

def create_orden(usuario_id, productos_ids):
    """Crea una nueva orden de compra"""
    # Verificar que el usuario existe
    usuario = get_usuario_by_id(usuario_id)
    if not usuario:
        raise Exception(f"Usuario {usuario_id} no encontrado")
    
    # Obtener productos y calcular total
    items = []
    total = Decimal('0')
    
    for prod_id in productos_ids:
        producto = get_producto_by_id(prod_id)
        if not producto:
            raise Exception(f"Producto {prod_id} no encontrado")
        
        precio = Decimal(str(producto['price']))
        cantidad = 1  
        subtotal = precio * cantidad
        
        items.append({
            'producto_id': prod_id,
            'nombre': producto['name'],
            'precio_unitario': precio,
            'cantidad': cantidad,
            'subtotal': subtotal
        })
        
        total += subtotal
    
    # Crear la orden
    orden_id = str(uuid.uuid4())
    fecha = datetime.now().isoformat()
    
    orden = {
        'id': orden_id,
        'fecha': fecha,
        'usuario_id': usuario_id,
        'usuario_nombre': f"{usuario['firstname']} {usuario['lastname']}",
        'usuario_email': usuario['email'],
        'items': convert_to_dynamodb_format(items),
        'total': total,
        'estado': 'pendiente',
        'created_at': fecha,
        'ttl': int((datetime.now() + timedelta(days=60)).timestamp())
    }
    
    ordenes_table.put_item(Item=orden)
    return to_json_serializable(orden)

def get_all_ordenes():
    """Obtiene todas las órdenes"""
    response = ordenes_table.scan()
    return to_json_serializable(response.get('Items', []))

def get_orden_by_id(orden_id):
    """Obtiene una orden por ID"""
    try:
        response = ordenes_table.scan(
            FilterExpression=Attr('id').eq(orden_id)
        )
        items = response.get('Items', [])
        return to_json_serializable(items[0]) if items else None
    except Exception as e:
        raise Exception(f"Error al buscar orden: {str(e)}")

def get_ordenes_by_usuario(usuario_id):
    """Obtiene todas las órdenes de un usuario"""
    try:
        # Scan manual porque FilterExpression puede tener problemas
        response = ordenes_table.scan()
        items = response.get('Items', [])
        
        # Filtrar manualmente
        filtered = [
            item for item in items 
            if str(item.get('usuario_id')) == str(usuario_id)
        ]
        
        return to_json_serializable(filtered)
    except Exception as e:
        raise Exception(f"Error al obtener órdenes del usuario: {str(e)}")

# ==================== INICIALIZACIÓN ====================

def inicializar_datos():
    """Carga datos iniciales si las tablas están vacías"""
    usuarios = get_all_usuarios()
    productos = get_all_productos()
    
    resultado = {
        'usuarios_cargados': 0,
        'productos_cargados': 0
    }
    
    # Cargar usuarios si no hay
    if len(usuarios) == 0:
        print("Cargando usuarios iniciales...")
        api_data = get_usuarios_from_api(5)
        for usuario in api_data['data']:
            save_usuario(usuario)
            resultado['usuarios_cargados'] += 1
    
    # Cargar productos si no hay
    if len(productos) == 0:
        print("Cargando productos iniciales...")
        api_data = get_productos_from_api(10)
        for producto in api_data['data']:
            save_producto(producto)
            resultado['productos_cargados'] += 1
    
    return resultado

# ==================== LAMBDA HANDLER ====================

def lambda_handler(event, context):
    """
    API Routes:
    
    USUARIOS:
    - GET    /usuarios                    - Lista todos los usuarios
    - GET    /usuarios/{id}               - Obtiene un usuario
    - POST   /usuarios/cargar?cantidad=5  - Carga usuarios desde API
    
    PRODUCTOS:
    - GET    /productos                    - Lista todos los productos
    - GET    /productos/{id}               - Obtiene un producto
    - POST   /productos/cargar?cantidad=10 - Carga productos desde API
    - GET    /productos/categoria/{cat}    - Busca por categoría
    
    ORDENES:
    - GET    /ordenes                      - Lista todas las órdenes
    - GET    /ordenes/{id}                 - Obtiene una orden
    - GET    /ordenes/usuario/{id}         - Órdenes de un usuario
    - POST   /ordenes                      - Crea nueva orden
              Body: {"usuario_id": "1", "productos_ids": ["1", "2"]}
    
    SISTEMA:
    - POST   /inicializar                  - Carga datos de prueba
    """
    
    try:
        # Debug completo del evento
        print(f"Evento completo: {json.dumps(event)}")
        
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        path_parameters = event.get('pathParameters') or {}
        query_params = event.get('queryStringParameters') or {}
        body = event.get('body', '{}')
        
        print(f"Método: {http_method}, Path: {path}, Params: {path_parameters}")
        
        # ===== INICIALIZAR =====
        if http_method == 'POST' and '/inicializar' in path:
            resultado = inicializar_datos()
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'message': 'Sistema inicializado',
                    'data': resultado
                })
            }
        
        # ===== USUARIOS =====
        if '/usuarios' in path:
            if http_method == 'POST' and '/cargar' in path:
                cantidad = int(query_params.get('cantidad', 5))
                api_data = get_usuarios_from_api(cantidad)
                usuarios = [save_usuario(u) for u in api_data['data']]
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': f'{len(usuarios)} usuarios cargados', 'data': to_json_serializable(usuarios)})
                }
            
            elif http_method == 'GET' and path_parameters.get('id'):
                usuario_id = path_parameters['id']
                usuario = get_usuario_by_id(usuario_id)
                
                if usuario:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'data': usuario})
                    }
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Usuario no encontrado'})
                }
            
            elif http_method == 'GET':
                usuarios = get_all_usuarios()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'total': len(usuarios), 'data': usuarios})
                }
        
        # ===== PRODUCTOS =====
        if '/productos' in path:
            if http_method == 'POST' and '/cargar' in path:
                cantidad = int(query_params.get('cantidad', 10))
                api_data = get_productos_from_api(cantidad)
                productos = [save_producto(p) for p in api_data['data']]
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': f'{len(productos)} productos cargados', 'data': to_json_serializable(productos)})
                }
            
            elif http_method == 'GET' and '/categoria/' in path:
                categoria = path_parameters.get('categoria') or path.split('/categoria/')[-1]
                productos = search_productos_by_category(categoria)
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'categoria': categoria, 'total': len(productos), 'data': productos})
                }
            
            elif http_method == 'GET' and path_parameters.get('id'):
                producto = get_producto_by_id(path_parameters['id'])
                if producto:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'data': producto})
                    }
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Producto no encontrado'})
                }
            
            elif http_method == 'GET':
                productos = get_all_productos()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'total': len(productos), 'data': productos})
                }
        
        # ===== ORDENES =====
        if '/ordenes' in path:
            if http_method == 'POST' and '/ordenes' == path:
                data = json.loads(body)
                usuario_id = data.get('usuario_id')
                productos_ids = data.get('productos_ids', [])
                
                if not usuario_id or not productos_ids:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps({'error': 'usuario_id y productos_ids son requeridos'})
                    }
                
                orden = create_orden(usuario_id, productos_ids)
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Orden creada exitosamente', 'data': orden})
                }
            
            elif http_method == 'GET' and '/usuario/' in path:
                # Extraer usuario_id del path manualmente
                usuario_id = path_parameters.get('usuario_id') or path.split('/usuario/')[-1]
                print(f"Buscando órdenes para usuario_id: {usuario_id}")
                ordenes = get_ordenes_by_usuario(usuario_id)
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'total': len(ordenes), 'data': ordenes})
                }
            
            elif http_method == 'GET' and path_parameters.get('id'):
                orden_id = path_parameters.get('id') or path.split('/ordenes/')[-1]
                orden = get_orden_by_id(orden_id)
                if orden:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'data': orden})
                    }
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Orden no encontrada'})
                }
            
            elif http_method == 'GET':
                ordenes = get_all_ordenes()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'total': len(ordenes), 'data': ordenes})
                }
        
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Ruta no encontrada'})
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }