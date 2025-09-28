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
            'timeout' => 3,
            'method' => 'GET',
            'header' => $token ? "X-aws-ec2-metadata-token: $token\r\n" : ""
        ]
    ]);
    
    $result = @file_get_contents($url, false, $context);
    return $result !== false ? trim($result) : null;
}

// Función para obtener token IMDSv2
function getIMDSv2Token() {
    $url = "http://169.254.169.254/latest/api/token";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'PUT',
            'timeout' => 3,
            'header' => "X-aws-ec2-metadata-token-ttl-seconds: 21600\r\n"
        ]
    ]);
    
    $result = @file_get_contents($url, false, $context);
    return $result !== false ? trim($result) : null;
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
        $metadata['data'] = [
            'instanceId' => $instanceId,
            'availabilityZone' => getEC2Metadata('placement/availability-zone', $token),
            'region' => getEC2Metadata('placement/region', $token),
            'publicIpv4' => getEC2Metadata('public-ipv4', $token),
            'localIpv4' => getEC2Metadata('local-ipv4', $token),
            'instanceType' => getEC2Metadata('instance-type', $token),
            'amiId' => getEC2Metadata('ami-id', $token),
            'hostname' => getEC2Metadata('hostname', $token),
            'publicHostname' => getEC2Metadata('public-hostname', $token)
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
