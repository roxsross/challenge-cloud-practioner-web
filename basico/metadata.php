<?php
/**
 * Endpoint para obtener metadatos de AWS EC2 desde el servidor
 * Basado en el script bash optimizado del usuario
 */

// Configurar headers para CORS y JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Función optimizada para obtener metadatos (basada en tu script bash)
function getMetadata($endpoint, $token) {
    $url = "http://169.254.169.254/latest/" . $endpoint;
    
    $context = stream_context_create([
        'http' => [
            'timeout' => 5,
            'method' => 'GET',
            'header' => "X-aws-ec2-metadata-token: $token\r\n",
            'ignore_errors' => true
        ]
    ]);
    
    $result = @file_get_contents($url, false, $context);
    return $result !== false ? trim($result) : null;
}

// Función para obtener token IMDSv2 (igual que tu script: curl -sf -X PUT)
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
    return $result !== false ? trim($result) : null;
}

try {
    // Obtener token IMDSv2 (igual que tu script)
    $token = getIMDSv2Token();
    
    if (!$token) {
        throw new Exception('No se pudo obtener token IMDSv2');
    }
    
    // Obtener metadatos usando tu método optimizado
    $privateIp = getMetadata('meta-data/local-ipv4', $token);
    $publicIp = getMetadata('meta-data/public-ipv4', $token);
    $mac = getMetadata('meta-data/mac', $token);
    $az = getMetadata('meta-data/placement/availability-zone', $token);
    $region = getMetadata('meta-data/placement/region', $token);
    $instanceId = getMetadata('meta-data/instance-id', $token);
    $instanceType = getMetadata('meta-data/instance-type', $token);
    
    // Información adicional de red (como en tu script)
    $eni = null;
    $subnet = null;
    $vpc = null;
    $securityGroups = null;
    
    if ($mac) {
        $eni = getMetadata("meta-data/network/interfaces/macs/$mac/interface-id", $token);
        $subnet = getMetadata("meta-data/network/interfaces/macs/$mac/subnet-id", $token);
        $vpc = getMetadata("meta-data/network/interfaces/macs/$mac/vpc-id", $token);
        $securityGroups = getMetadata("meta-data/network/interfaces/macs/$mac/security-groups", $token);
    }
    
    // Respuesta JSON
    $metadata = [
        'success' => true,
        'method' => 'server-metadata-optimized',
        'timestamp' => date('c'),
        'data' => [
            'instanceId' => $instanceId,
            'instanceType' => $instanceType,
            'availabilityZone' => $az,
            'region' => $region,
            'publicIpv4' => $publicIp ?: null,
            'localIpv4' => $privateIp, // Esta es la IP privada que necesitamos
            'mac' => $mac,
            'networkInterface' => $eni,
            'subnetId' => $subnet,
            'vpcId' => $vpc,
            'securityGroups' => $securityGroups
        ],
        'debug' => [
            'script_method' => 'bash_optimized_equivalent',
            'token_obtained' => true,
            'private_ip_found' => $privateIp !== null,
            'public_ip_found' => $publicIp !== null
        ]
    ];
    
    echo json_encode($metadata, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'method' => 'server-metadata-optimized',
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);
}
?>
