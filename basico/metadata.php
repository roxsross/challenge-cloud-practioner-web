<?php
/**
 * Endpoint para obtener metadatos de AWS EC2 desde el servidor
 * Este archivo debe ejecutarse en la instancia EC2 para acceder a los metadatos
 */

// Configurar headers para CORS y JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Función para obtener metadatos de AWS EC2
function getEC2Metadata($endpoint, $token = null) {
    $url = "http://169.254.169.254/latest/meta-data/" . $endpoint;
    
    $context = stream_context_create([
        'http' => [
            'timeout' => 5, // Aumentar timeout
            'method' => 'GET',
            'header' => $token ? "X-aws-ec2-metadata-token: $token\r\n" : "",
            'ignore_errors' => true // Para capturar errores HTTP
        ]
    ]);
    
    $result = @file_get_contents($url, false, $context);
    
    // Debug: Log del resultado
    error_log("Endpoint: $endpoint, Result: " . ($result !== false ? $result : 'FAILED'));
    
    return $result !== false ? trim($result) : null;
}

// Función para obtener token IMDSv2 (igual que tu comando curl)
function getIMDSv2Token() {
    $url = "http://169.254.169.254/latest/api/token";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'PUT',
            'timeout' => 5,
            'header' => "X-aws-ec2-metadata-token-ttl-seconds: 21600\r\n"
        ]
    ]);
    
    $result = @file_get_contents($url, false, $context);
    $token = $result !== false ? trim($result) : null;
    
    // Debug: Log si se obtuvo el token
    error_log("Token IMDSv2: " . ($token ? "OBTENIDO" : "FALLIDO"));
    
    return $token;
}

try {
    // Intentar obtener token IMDSv2
    $token = getIMDSv2Token();
    
    // Obtener información de la instancia EC2
    $metadata = [
        'success' => false,
        'method' => 'server-side',
        'timestamp' => date('c'),
        'data' => []
    ];
    
    // Intentar obtener metadatos básicos
    $instanceId = getEC2Metadata('instance-id', $token);
    
    if ($instanceId) {
        $metadata['success'] = true;
        
        // Obtener metadatos básicos (igual que tus comandos curl)
        $availabilityZone = getEC2Metadata('placement/availability-zone', $token);
        $region = getEC2Metadata('placement/region', $token);
        $publicIpv4 = getEC2Metadata('public-ipv4', $token);
        $localIpv4 = getEC2Metadata('local-ipv4', $token); // Este debería funcionar ahora
        $instanceType = getEC2Metadata('instance-type', $token);
        
        // Log específico para IP privada
        error_log("IP Privada obtenida: " . ($localIpv4 ?: "NULL"));
        
        $metadata['data'] = [
            'instanceId' => $instanceId,
            'availabilityZone' => $availabilityZone,
            'region' => $region,
            'publicIpv4' => $publicIpv4,
            'localIpv4' => $localIpv4,
            'instanceType' => $instanceType,
            'amiId' => getEC2Metadata('ami-id', $token),
            'hostname' => getEC2Metadata('hostname', $token),
            'publicHostname' => getEC2Metadata('public-hostname', $token)
        ];
        
        // Debug info simplificado
        $metadata['debug'] = [
            'token_used' => $token !== null,
            'token_length' => $token ? strlen($token) : 0,
            'local_ipv4_raw' => $localIpv4,
            'endpoints_tested' => [
                'instance-id' => $instanceId !== null,
                'local-ipv4' => $localIpv4 !== null,
                'public-ipv4' => $publicIpv4 !== null
            ]
        ];
        
        // Limpiar valores null pero mantener información sobre qué no está disponible
        $cleanData = [];
        foreach ($metadata['data'] as $key => $value) {
            if ($value !== null && $value !== '') {
                $cleanData[$key] = $value;
            } else {
                // Mantener información sobre campos importantes que no están disponibles
                if (in_array($key, ['publicIpv4', 'localIpv4'])) {
                    $cleanData[$key] = null; // Mantener como null para que JS sepa que se intentó obtener
                }
            }
        }
        $metadata['data'] = $cleanData;
    } else {
        $metadata['error'] = 'No se pudo acceder a los metadatos de EC2';
        $metadata['debug'] = [
            'token_available' => $token !== null,
            'server_ip' => $_SERVER['SERVER_ADDR'] ?? 'unknown',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown'
        ];
    }
    
    echo json_encode($metadata, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error interno: ' . $e->getMessage(),
        'method' => 'server-side'
    ], JSON_PRETTY_PRINT);
}
?>
