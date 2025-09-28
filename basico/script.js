// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    
    // Obtener referencias a los elementos del DOM
    const deployButton = document.getElementById('deployButton');
    const particlesContainer = document.getElementById('particlesContainer');
    const successMessage = document.getElementById('successMessage');
    
    // Referencias para el panel de metadata
    const toggleMetadata = document.getElementById('toggleMetadata');
    const metadataContent = document.getElementById('metadataContent');
    const publicIPElement = document.getElementById('publicIP');
    const publicIPLabel = document.getElementById('publicIPLabel');
    const localIPElement = document.getElementById('localIP');
    const localIPLabel = document.getElementById('localIPLabel');
    const environmentElement = document.getElementById('environment');
    const awsZoneElement = document.getElementById('awsZone');
    const regionElement = document.getElementById('region');
    const timestampElement = document.getElementById('timestamp');
    
    // Referencias para la guía de despliegue
    const deploymentGuide = document.getElementById('deploymentGuide');
    const closeGuide = document.getElementById('closeGuide');
    const guideTitle = document.getElementById('guideTitle');
    const deploymentStatus = document.getElementById('deploymentStatus');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const guideSteps = document.getElementById('guideSteps');
    const copyCommand = document.getElementById('copyCommand');
    const nextStep = document.getElementById('nextStep');
    
    // Variable para controlar si la animación ya se ejecutó
    let animationPlayed = false;
    
    // Variables para la guía de despliegue
    let currentEnvironment = 'detecting';
    let currentStep = 0;
    let deploymentSteps = [];
    let allCommands = [];
    
    /**
     * Función para detectar si estamos en localhost
     */
    function isLocalhost() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // Detectar localhost por hostname
        const isLocalhostHostname = hostname === 'localhost' || 
                                   hostname === '127.0.0.1' || 
                                   hostname === '0.0.0.0';
        
        // Detectar redes privadas locales
        const isPrivateNetwork = hostname.startsWith('192.168.') ||
                                 hostname.startsWith('10.') ||
                                 (hostname.startsWith('172.') && 
                                  parseInt(hostname.split('.')[1]) >= 16 && 
                                  parseInt(hostname.split('.')[1]) <= 31);
        
        // Detectar puertos de desarrollo comunes
        const isDevelopmentPort = port && (port === '3000' || port === '8000' || 
                                          port === '8080' || port === '5000' || 
                                          port === '4200' || port === '3001');
        
        return isLocalhostHostname || isPrivateNetwork || isDevelopmentPort;
    }
    
    /**
     * Función para obtener la IP pública del usuario
     */
    async function getPublicIP() {
        try {
            // Intentar múltiples servicios para mayor confiabilidad
            const services = [
                'https://api.ipify.org?format=json',
                'https://ipapi.co/json/',
                'https://httpbin.org/ip'
            ];
            
            for (const service of services) {
                try {
                    const response = await fetch(service);
                    const data = await response.json();
                    
                    // Diferentes servicios devuelven la IP en diferentes campos
                    const ip = data.ip || data.origin || data.query;
                    if (ip) {
                        return ip;
                    }
                } catch (error) {
                    console.log(`Servicio ${service} no disponible:`, error);
                    continue;
                }
            }
            
            return 'No disponible';
        } catch (error) {
            console.error('Error obteniendo IP pública:', error);
            return 'Error de conexión';
        }
    }
    
    /**
     * Función para obtener información de geolocalización
     */
    async function getLocationInfo(ip) {
        try {
            const response = await fetch(`https://ipapi.co/${ip}/json/`);
            const data = await response.json();
            
            return {
                region: data.region || data.region_name || 'Desconocida',
                country: data.country_name || data.country || 'Desconocido',
                city: data.city || 'Desconocida'
            };
        } catch (error) {
            console.error('Error obteniendo información de ubicación:', error);
            return {
                region: 'No disponible',
                country: 'No disponible',
                city: 'No disponible'
            };
        }
    }
    
    /**
     * Función para detectar si estamos en AWS usando múltiples métodos
     */
    async function detectAWSEnvironment() {
        console.log('🔍 Iniciando detección de entorno AWS...');
        
        // Método 1: Usar endpoint PHP para obtener metadatos del servidor
        try {
            console.log('🚀 Intentando obtener metadatos via servidor PHP...');
            
            const response = await fetch('metadata.php', {
                method: 'GET',
                cache: 'no-cache'
            });
            
            if (response.ok) {
                const metadata = await response.json();
                console.log('📊 Respuesta del servidor:', metadata);
                
                if (metadata.success && metadata.data) {
                    console.log('✅ Metadatos EC2 obtenidos via servidor - Definitivamente en AWS');
                    return {
                        isAWS: true,
                        method: 'server-metadata',
                        instanceId: metadata.data.instanceId,
                        availabilityZone: metadata.data.availabilityZone,
                        region: metadata.data.region,
                        publicIp: metadata.data.publicIpv4,
                        localIp: metadata.data.localIpv4,
                        instanceType: metadata.data.instanceType,
                        amiId: metadata.data.amiId
                    };
                } else {
                    console.log('⚠️ Servidor PHP no pudo obtener metadatos:', metadata.error);
                }
            }
        } catch (error) {
            console.log('❌ Error accediendo a endpoint PHP:', error.message);
        }
        
        // Método 2: Intentar acceder directamente a metadatos EC2 (puede fallar por CORS)
        try {
            const metadataUrl = 'http://169.254.169.254/latest/meta-data/';
            console.log('📡 Intentando acceder directamente a metadatos EC2...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(metadataUrl + 'instance-id', {
                signal: controller.signal,
                mode: 'cors'
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                console.log('✅ Metadatos EC2 accesibles directamente - Definitivamente en AWS');
                const instanceId = await response.text();
                
                // Obtener información adicional
                const [azResponse, regionResponse] = await Promise.all([
                    fetch(metadataUrl + 'placement/availability-zone').catch(() => null),
                    fetch(metadataUrl + 'placement/region').catch(() => null)
                ]);
                
                const availabilityZone = azResponse && azResponse.ok ? await azResponse.text() : 'Detectando...';
                const region = regionResponse && regionResponse.ok ? await regionResponse.text() : 'Detectando...';
                
                return {
                    isAWS: true,
                    method: 'direct-metadata',
                    instanceId: instanceId,
                    availabilityZone: availabilityZone,
                    region: region,
                    publicIp: null,
                    localIp: null
                };
            }
        } catch (error) {
            console.log('❌ Metadatos EC2 no accesibles directamente:', error.message);
        }
        
        // Método 3: Detectar por características del servidor web
        try {
            console.log('🌐 Analizando características del servidor...');
            
            // Obtener información del servidor desde headers HTTP
            const response = await fetch(window.location.href, {
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            const serverHeader = response.headers.get('Server') || '';
            const xAmzHeader = response.headers.get('x-amz-request-id');
            const xAmzCfId = response.headers.get('x-amz-cf-id');
            
            console.log('📋 Headers del servidor:', {
                server: serverHeader,
                xAmzHeader: xAmzHeader,
                xAmzCfId: xAmzCfId
            });
            
            // Detectar si hay indicios de AWS
            const awsIndicators = [
                serverHeader.toLowerCase().includes('amazon'),
                serverHeader.toLowerCase().includes('aws'),
                !!xAmzHeader,
                !!xAmzCfId
            ];
            
            if (awsIndicators.some(indicator => indicator)) {
                console.log('✅ Indicadores AWS encontrados en headers');
                return {
                    isAWS: true,
                    method: 'headers',
                    instanceId: 'Detectado por headers',
                    availabilityZone: 'Detectando...',
                    region: 'Detectando...',
                    publicIp: null,
                    localIp: null
                };
            }
        } catch (error) {
            console.log('❌ Error analizando headers:', error.message);
        }
        
        // Método 4: Detectar por IP y patrones de red
        try {
            console.log('🔍 Analizando patrones de red...');
            
            const hostname = window.location.hostname;
            const isEC2PublicIP = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
            
            // Rangos de IP típicos de AWS EC2
            if (isEC2PublicIP) {
                const ipParts = hostname.split('.').map(Number);
                const isAWSRange = (
                    // Rangos comunes de AWS
                    (ipParts[0] === 3 && ipParts[1] >= 208) || // 3.208.x.x - 3.255.x.x
                    (ipParts[0] === 13) || // 13.x.x.x
                    (ipParts[0] === 15) || // 15.x.x.x
                    (ipParts[0] === 18) || // 18.x.x.x
                    (ipParts[0] === 34) || // 34.x.x.x (us-west-2)
                    (ipParts[0] === 35) || // 35.x.x.x
                    (ipParts[0] === 52) || // 52.x.x.x
                    (ipParts[0] === 54) || // 54.x.x.x
                    (ipParts[0] === 107)   // 107.x.x.x
                );
                
                if (isAWSRange) {
                    console.log('✅ IP detectada en rango típico de AWS EC2:', hostname);
                    
                    // Intentar determinar región por IP
                    let estimatedRegion = 'us-east-1'; // default
                    if (ipParts[0] === 34) estimatedRegion = 'us-west-2';
                    else if (ipParts[0] === 13) estimatedRegion = 'us-east-1';
                    else if (ipParts[0] === 52) estimatedRegion = 'eu-west-1';
                    
                    return {
                        isAWS: true,
                        method: 'ip-pattern',
                        instanceId: 'Detectado por IP',
                        availabilityZone: `${estimatedRegion}a`,
                        region: estimatedRegion,
                        publicIp: hostname,
                        localIp: null
                    };
                }
            }
        } catch (error) {
            console.log('❌ Error analizando patrones de red:', error.message);
        }
        
        console.log('❌ No se detectó entorno AWS');
        return {
            isAWS: false,
            method: 'none',
            instanceId: null,
            availabilityZone: 'N/A',
            region: 'N/A',
            publicIp: null,
            localIp: null
        };
    }
    
    /**
     * Función para obtener la IP local aproximada
     */
    function getLocalIP() {
        return new Promise((resolve) => {
            const rtc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            
            rtc.createDataChannel('');
            rtc.createOffer().then(offer => rtc.setLocalDescription(offer));
            
            rtc.onicecandidate = (event) => {
                if (event.candidate) {
                    const candidate = event.candidate.candidate;
                    const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                    if (ipMatch) {
                        resolve(ipMatch[1]);
                        rtc.close();
                    }
                }
            };
            
            // Timeout después de 3 segundos
            setTimeout(() => {
                resolve('No disponible');
                rtc.close();
            }, 3000);
        });
    }
    
    /**
     * Función para actualizar el timestamp
     */
    function updateTimestamp() {
        const now = new Date();
        const timestamp = now.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        timestampElement.textContent = timestamp;
    }
    
    /**
     * Función principal para cargar toda la información del entorno
     */
    async function loadEnvironmentInfo() {
        // Actualizar timestamp inmediatamente
        updateTimestamp();
        
        // Detectar si es localhost
        const localhost = isLocalhost();
        
        if (localhost) {
            environmentElement.textContent = 'Localhost';
            environmentElement.className = 'metadata-value environment-localhost';
            
            // Cambiar etiquetas para localhost
            publicIPLabel.textContent = '🌐 IP Pública:';
            localIPLabel.textContent = '🏠 IP Local:';
            
            publicIPElement.textContent = 'N/A (Desarrollo Local)';
            regionElement.textContent = 'Desarrollo Local';
            awsZoneElement.textContent = 'N/A';
            
            // Para localhost, la IP local es la misma que la pública
            const localIP = await getLocalIP();
            localIPElement.textContent = localIP || 'N/A';
            
            // Actualizar estado del despliegue
            updateDeploymentStatus('localhost');
        } else {
            // Primero detectar si estamos en AWS (esto es lo más importante)
            const awsInfo = await detectAWSEnvironment();
            
            if (awsInfo.isAWS) {
                // Estamos definitivamente en AWS EC2
                console.log('🎉 AWS detectado usando método:', awsInfo.method);
                environmentElement.textContent = `AWS Cloud (EC2) - ${awsInfo.method}`;
                environmentElement.className = 'metadata-value environment-aws';
                awsZoneElement.textContent = awsInfo.availabilityZone;
                regionElement.textContent = `${awsInfo.region} (${awsInfo.availabilityZone})`;
                
                // Cambiar etiquetas para AWS
                publicIPLabel.textContent = '🌐 IP Servidor EC2:';
                localIPLabel.textContent = '🏠 IP Privada EC2:';
                
                // Para AWS, mostrar la IP del hostname (que es la IP pública de EC2)
                const currentIP = window.location.hostname;
                if (awsInfo.publicIp) {
                    publicIPElement.textContent = awsInfo.publicIp;
                } else if (/^\d+\.\d+\.\d+\.\d+$/.test(currentIP)) {
                    publicIPElement.textContent = currentIP;
                } else {
                    publicIPElement.textContent = 'Detectando...';
                }
                
                if (awsInfo.localIp) {
                    localIPElement.textContent = awsInfo.localIp;
                } else {
                    localIPElement.textContent = 'No accesible desde navegador';
                }
                
                // Actualizar estado del despliegue para AWS
                updateDeploymentStatus('aws');
            } else {
                // No estamos en AWS, pero tampoco en localhost
                environmentElement.textContent = 'Internet/Nube';
                environmentElement.className = 'metadata-value environment-cloud';
                
                // Cambiar etiquetas para nube genérica
                publicIPLabel.textContent = '🌐 Tu IP Pública:';
                localIPLabel.textContent = '🏠 Tu IP Local:';
                
                // Obtener IP pública del cliente (quien accede)
                const publicIP = await getPublicIP();
                publicIPElement.textContent = publicIP;
                
                // Obtener información de ubicación del cliente
                if (publicIP !== 'No disponible' && publicIP !== 'Error de conexión') {
                    const locationInfo = await getLocationInfo(publicIP);
                    regionElement.textContent = `${locationInfo.city}, ${locationInfo.region}, ${locationInfo.country}`;
                }
                
                awsZoneElement.textContent = 'N/A (No AWS)';
                
                // Obtener IP local del cliente
                const localIP = await getLocalIP();
                localIPElement.textContent = localIP;
                
                // Actualizar estado del despliegue para nube genérica
                updateDeploymentStatus('cloud');
            }
        }
    }
    
    /**
     * Función para toggle del panel de metadata
     */
    function toggleMetadataPanel() {
        const isCollapsed = metadataContent.classList.contains('collapsed');
        
        if (isCollapsed) {
            metadataContent.classList.remove('collapsed');
            toggleMetadata.classList.remove('collapsed');
            toggleMetadata.textContent = '▼';
        } else {
            metadataContent.classList.add('collapsed');
            toggleMetadata.classList.add('collapsed');
            toggleMetadata.textContent = '▶';
        }
    }
    
    /**
     * Función para generar los pasos de despliegue según el entorno
     */
    function generateDeploymentSteps(environment) {
        if (environment === 'localhost') {
            return [
                {
                    title: "Preparar tu proyecto",
                    description: "Asegúrate de que todos los archivos estén en una carpeta organizada.",
                    commands: ["ls -la", "pwd"],
                    tips: "Verifica que tengas index.html, styles.css y script.js en la misma carpeta."
                },
                {
                    title: "Crear cuenta AWS",
                    description: "Si no tienes una cuenta AWS, créala en aws.amazon.com. Los nuevos clientes reciben hasta $200 USD en créditos.",
                    commands: [],
                    tips: "Plan gratuito: Hasta 6 meses sin costo + $200 USD en créditos. Incluye EC2, S3, RDS y más servicios sin compromiso."
                },
                {
                    title: "Lanzar instancia EC2",
                    description: "Crea una nueva instancia EC2 con Amazon Linux 2023.",
                    commands: [],
                    tips: "Selecciona t2.micro o t3.micro (elegibles para plan gratuito) y guarda tu archivo .pem de forma segura."
                },
                {
                    title: "Conectar por SSH",
                    description: "Conéctate a tu instancia EC2 según tu sistema operativo.",
                    commands: [
                        "# Para Linux/Mac:",
                        "chmod 400 tu-clave.pem", 
                        "ssh -i tu-clave.pem ec2-user@tu-ip-publica",
                        "",
                        "# Para Windows: Usa PuTTY",
                        "# 1. Convierte .pem a .ppk con PuTTYgen",
                        "# 2. Abre PuTTY, Host: ec2-user@tu-ip-publica",
                        "# 3. SSH > Auth > Browse > selecciona tu .ppk"
                    ],
                    tips: "Windows: Descarga PuTTY desde putty.org. Linux/Mac: SSH viene preinstalado en la terminal."
                },
                {
                    title: "Instalar servidor web (Apache)",
                    description: "Instala y configura Apache en tu instancia EC2.",
                    commands: [
                        "sudo yum update -y", 
                        "sudo yum install -y httpd git", 
                        "sudo systemctl start httpd", 
                        "sudo systemctl enable httpd",
                        "sudo systemctl status httpd"
                    ],
                    tips: "Apache es fácil de configurar y perfecto para principiantes. Para Ubuntu usa 'apt install apache2'."
                },
                {
                    title: "Alternativa: Instalar Nginx",
                    description: "Si prefieres Nginx (más ligero y rápido).",
                    commands: [
                        "sudo amazon-linux-extras install -y nginx1",
                        "sudo systemctl start nginx",
                        "sudo systemctl enable nginx",
                        "sudo systemctl status nginx"
                    ],
                    tips: "Nginx consume menos recursos que Apache. Para Ubuntu: 'sudo apt install nginx'."
                },
                {
                    title: "Clonar repositorio desde GitHub",
                    description: "Descarga el código directamente desde el repositorio oficial.",
                    commands: [
                        "cd /tmp",
                        "git clone https://github.com/roxsross/challenge-cloud-practioner-web.git",
                        "sudo cp challenge-cloud-practioner-web/*.html /var/www/html/",
                        "sudo cp challenge-cloud-practioner-web/*.css /var/www/html/",
                        "sudo cp challenge-cloud-practioner-web/*.js /var/www/html/"
                    ],
                    tips: "Usar Git es la forma más profesional. El repositorio siempre tendrá la versión más actualizada."
                },
                {
                    title: "Alternativa: Subir archivos manualmente",
                    description: "Si prefieres subir tus archivos locales por SCP.",
                    commands: ["scp -i tu-clave.pem *.html *.css *.js ec2-user@tu-ip-publica:~", "sudo mv ~/*.html ~/*.css ~/*.js /var/www/html/"],
                    tips: "Útil si has modificado los archivos localmente y quieres subir tu versión personalizada."
                },
                {
                    title: "Configurar Security Group",
                    description: "Permite tráfico HTTP (puerto 80) en el Security Group de tu instancia.",
                    commands: [],
                    tips: "Ve a EC2 Console > Security Groups > Inbound Rules > Add Rule > HTTP (80) > Source: 0.0.0.0/0"
                },
                {
                    title: "¡Probar tu sitio!",
                    description: "Visita http://tu-ip-publica en tu navegador y continúa aprendiendo.",
                    commands: ["curl http://localhost", "sudo systemctl status httpd"],
                    tips: "Si todo está bien, verás tu página web ejecutándose desde AWS. ¡Felicitaciones! Ahora explora la documentación oficial de EC2."
                }
            ];
        } else if (environment === 'aws') {
            return [
                {
                    title: "¡Ya estás en AWS!",
                    description: "Tu aplicación ya se está ejecutando en Amazon Web Services. ¡Excelente trabajo!",
                    commands: ["curl http://169.254.169.254/latest/meta-data/instance-id"],
                    tips: "Puedes verificar información de tu instancia usando el servicio de metadatos."
                },
                {
                    title: "Optimizar tu despliegue",
                    description: "Considera implementar mejores prácticas para producción.",
                    commands: ["sudo systemctl status httpd", "df -h", "free -m"],
                    tips: "Monitorea el estado de tu servidor, espacio en disco y memoria."
                },
                {
                    title: "Configurar dominio",
                    description: "Considera registrar un dominio y configurar Route 53 para una URL personalizada.",
                    commands: [],
                    tips: "Route 53 es el servicio DNS de AWS que te permite usar dominios personalizados."
                },
                {
                    title: "Implementar HTTPS",
                    description: "Configura SSL/TLS para mayor seguridad usando AWS Certificate Manager.",
                    commands: [],
                    tips: "AWS Certificate Manager proporciona certificados SSL gratuitos para dominios verificados."
                },
                {
                    title: "Backup y monitoreo",
                    description: "Configura snapshots automáticos y CloudWatch para monitoreo.",
                    commands: ["aws ec2 describe-snapshots --owner-ids self"],
                    tips: "Los snapshots te permiten crear copias de seguridad de tu instancia EC2."
                }
            ];
        } else {
            return [
                {
                    title: "Detectando entorno...",
                    description: "Estamos analizando desde dónde se está ejecutando tu aplicación.",
                    commands: [],
                    tips: "Esto puede tomar unos segundos mientras verificamos tu configuración de red."
                },
                {
                    title: "Preparar para AWS",
                    description: "Una vez que identifiquemos tu entorno, te guiaremos paso a paso.",
                    commands: [],
                    tips: "La guía se adaptará automáticamente según si estás en localhost o ya en la nube."
                }
            ];
        }
    }
    
    /**
     * Función para actualizar el estado del despliegue
     */
    function updateDeploymentStatus(environment) {
        currentEnvironment = environment;
        
        // Actualizar indicador visual
        deploymentStatus.className = `deployment-status ${environment}`;
        
        switch (environment) {
            case 'localhost':
                statusIndicator.textContent = '🏠';
                statusText.textContent = 'Ejecutándose localmente';
                guideTitle.textContent = '🚀 Despliega en AWS Cloud';
                break;
            case 'aws':
                statusIndicator.textContent = '☁️';
                statusText.textContent = 'Ejecutándose en AWS';
                guideTitle.textContent = '🎉 ¡Ya estás en AWS!';
                break;
            case 'cloud':
                statusIndicator.textContent = '🌐';
                statusText.textContent = 'Ejecutándose en la nube';
                guideTitle.textContent = '🔍 Detectando proveedor';
                break;
            default:
                statusIndicator.textContent = '📍';
                statusText.textContent = 'Detectando entorno...';
                guideTitle.textContent = '🚀 Tu Primer Despliegue';
        }
        
        // Generar pasos según el entorno
        deploymentSteps = generateDeploymentSteps(environment);
        renderDeploymentSteps();
    }
    
    /**
     * Función para renderizar los pasos de despliegue
     */
    function renderDeploymentSteps() {
        guideSteps.innerHTML = '';
        allCommands = [];
        
        deploymentSteps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = `step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`;
            
            stepElement.innerHTML = `
                <div style="display: flex; align-items: flex-start;">
                    <span class="step-number">${index < currentStep ? '✓' : index + 1}</span>
                    <div style="flex: 1;">
                        <div class="step-title">${step.title}</div>
                        <div class="step-description">${step.description}</div>
                        ${step.commands.length > 0 ? 
                            step.commands.map(cmd => `<div class="code-block">${cmd}</div>`).join('') : 
                            ''
                        }
                        ${step.tips ? `<div style="margin-top: 0.5rem; font-size: 0.9rem; color: #666; font-style: italic;">💡 ${step.tips}</div>` : ''}
                    </div>
                </div>
            `;
            
            guideSteps.appendChild(stepElement);
            
            // Agregar comandos a la lista global
            if (step.commands.length > 0) {
                allCommands.push(...step.commands);
            }
        });
        
        // Actualizar botones
        updateGuideButtons();
    }
    
    /**
     * Función para actualizar los botones de la guía
     */
    function updateGuideButtons() {
        if (currentEnvironment === 'aws') {
            nextStep.textContent = '🎉 ¡Completado!';
            nextStep.style.background = 'linear-gradient(45deg, #4caf50, #8bc34a)';
        } else if (currentStep >= deploymentSteps.length - 1) {
            nextStep.textContent = '🚀 ¡Empezar!';
            nextStep.style.background = 'linear-gradient(45deg, #ff6b6b, #4ecdc4)';
        } else {
            nextStep.textContent = 'Siguiente Paso';
            nextStep.style.background = 'linear-gradient(45deg, #4facfe, #00f2fe)';
        }
        
        // Mostrar/ocultar botón de copiar comandos
        copyCommand.style.display = allCommands.length > 0 ? 'block' : 'none';
    }
    
    /**
     * Función para avanzar al siguiente paso
     */
    function nextStepHandler() {
        if (currentEnvironment === 'aws') {
            closeDeploymentGuide();
            showSuccessMessage();
            return;
        }
        
        if (currentStep < deploymentSteps.length - 1) {
            currentStep++;
            renderDeploymentSteps();
        } else {
            // Último paso - abrir documentación de AWS EC2 y Console
            showAWSDocumentation();
        }
    }
    
    /**
     * Función para mostrar documentación de AWS EC2
     */
    function showAWSDocumentation() {
        // Crear modal con enlaces a documentación
        const docModal = document.createElement('div');
        docModal.className = 'deployment-guide show';
        docModal.innerHTML = `
            <div class="guide-content">
                <div class="guide-header">
                    <h2>📚 Documentación AWS EC2</h2>
                    <button class="close-guide" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                
                <div class="deployment-status localhost">
                    <span class="status-indicator">📖</span>
                    <span class="status-text">Recursos de Aprendizaje</span>
                </div>
                
                <div class="guide-steps">
                    <div class="step active">
                        <div style="display: flex; align-items: flex-start;">
                            <span class="step-number">📚</span>
                            <div style="flex: 1;">
                                <div class="step-title">Documentación Oficial de EC2</div>
                                <div class="step-description">Guía completa de Amazon EC2 con todos los conceptos y características.</div>
                                <div style="margin-top: 0.5rem;">
                                    <a href="https://docs.aws.amazon.com/ec2/" target="_blank" class="guide-button primary" style="display: inline-block; text-decoration: none; margin-right: 0.5rem;">📖 Documentación EC2</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="step active">
                        <div style="display: flex; align-items: flex-start;">
                            <span class="step-number">🎓</span>
                            <div style="flex: 1;">
                                <div class="step-title">Guía de Usuario EC2</div>
                                <div class="step-description">Tutorial paso a paso para dominar Amazon EC2.</div>
                                <div style="margin-top: 0.5rem;">
                                    <a href="https://docs.aws.amazon.com/ec2/latest/userguide/" target="_blank" class="guide-button primary" style="display: inline-block; text-decoration: none; margin-right: 0.5rem;">🎓 Guía de Usuario</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="step active">
                        <div style="display: flex; align-items: flex-start;">
                            <span class="step-number">🚀</span>
                            <div style="flex: 1;">
                                <div class="step-title">Getting Started con EC2</div>
                                <div class="step-description">Tutorial para principiantes con ejemplos prácticos.</div>
                                <div style="margin-top: 0.5rem;">
                                    <a href="https://aws.amazon.com/ec2/getting-started/" target="_blank" class="guide-button primary" style="display: inline-block; text-decoration: none; margin-right: 0.5rem;">🚀 Getting Started</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="step active">
                        <div style="display: flex; align-items: flex-start;">
                            <span class="step-number">💰</span>
                            <div style="flex: 1;">
                                <div class="step-title">Precios de EC2</div>
                                <div class="step-description">Calculadora y guía de precios para optimizar costos.</div>
                                <div style="margin-top: 0.5rem;">
                                    <a href="https://aws.amazon.com/ec2/pricing/" target="_blank" class="guide-button primary" style="display: inline-block; text-decoration: none; margin-right: 0.5rem;">💰 Precios EC2</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="step active">
                        <div style="display: flex; align-items: flex-start;">
                            <span class="step-number">🛡️</span>
                            <div style="flex: 1;">
                                <div class="step-title">Mejores Prácticas de Seguridad</div>
                                <div class="step-description">Guía de seguridad para instancias EC2.</div>
                                <div style="margin-top: 0.5rem;">
                                    <a href="https://docs.aws.amazon.com/ec2/latest/userguide/ec2-security.html" target="_blank" class="guide-button primary" style="display: inline-block; text-decoration: none; margin-right: 0.5rem;">🛡️ Seguridad EC2</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="step active">
                        <div style="display: flex; align-items: flex-start;">
                            <span class="step-number">⚙️</span>
                            <div style="flex: 1;">
                                <div class="step-title">AWS Console EC2</div>
                                <div class="step-description">Accede a la consola para gestionar tus instancias.</div>
                                <div style="margin-top: 0.5rem;">
                                    <a href="https://console.aws.amazon.com/ec2/" target="_blank" class="guide-button primary" style="display: inline-block; text-decoration: none; margin-right: 0.5rem;">⚙️ AWS Console</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="guide-footer">
                    <button class="guide-button secondary" onclick="this.parentElement.parentElement.parentElement.remove()">✅ ¡Perfecto!</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(docModal);
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Función para copiar comandos al portapapeles
     */
    function copyCommandsToClipboard() {
        const commandText = allCommands.join('\n');
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(commandText).then(() => {
                copyCommand.textContent = '✅ ¡Copiado!';
                setTimeout(() => {
                    copyCommand.textContent = '📋 Copiar Comandos';
                }, 2000);
            });
        } else {
            // Fallback para navegadores más antiguos
            const textArea = document.createElement('textarea');
            textArea.value = commandText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            copyCommand.textContent = '✅ ¡Copiado!';
            setTimeout(() => {
                copyCommand.textContent = '📋 Copiar Comandos';
            }, 2000);
        }
    }
    
    /**
     * Función para mostrar la guía de despliegue
     */
    function showDeploymentGuide() {
        deploymentGuide.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Función para cerrar la guía de despliegue
     */
    function closeDeploymentGuide() {
        deploymentGuide.classList.remove('show');
        document.body.style.overflow = '';
    }
    
    /**
     * Función para crear una partícula individual
     * @param {number} x - Posición X donde crear la partícula
     * @param {number} y - Posición Y donde crear la partícula
     */
    function createParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Posicionar la partícula en las coordenadas especificadas
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        
        // Agregar variación aleatoria al movimiento
        const randomX = (Math.random() - 0.5) * 100; // Movimiento horizontal aleatorio
        const randomY = Math.random() * -150 - 50;   // Movimiento vertical hacia arriba
        const randomScale = Math.random() * 0.5 + 0.5; // Escala aleatoria
        const randomDuration = Math.random() * 2 + 2;   // Duración aleatoria
        
        // Aplicar transformaciones aleatorias
        particle.style.setProperty('--random-x', randomX + 'px');
        particle.style.setProperty('--random-y', randomY + 'px');
        particle.style.transform = `scale(${randomScale})`;
        particle.style.animationDuration = randomDuration + 's';
        
        // Agregar la partícula al contenedor
        particlesContainer.appendChild(particle);
        
        // Remover la partícula después de la animación
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, randomDuration * 1000);
    }
    
    /**
     * Función para crear múltiples partículas en forma de explosión
     * @param {number} centerX - Centro X de la explosión
     * @param {number} centerY - Centro Y de la explosión
     * @param {number} count - Número de partículas a crear
     */
    function createParticleExplosion(centerX, centerY, count = 30) {
        for (let i = 0; i < count; i++) {
            // Crear partículas en un patrón circular alrededor del centro
            const angle = (i / count) * Math.PI * 2;
            const radius = Math.random() * 50 + 20;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            // Retrasar ligeramente cada partícula para un efecto más natural
            setTimeout(() => {
                createParticle(x, y);
            }, i * 20);
        }
    }
    
    /**
     * Función para mostrar el mensaje de éxito con animación
     */
    function showSuccessMessage() {
        successMessage.classList.add('show');
        
        // Ocultar el mensaje después de 4 segundos
        setTimeout(() => {
            successMessage.classList.remove('show');
            // Permitir que la animación se ejecute nuevamente
            animationPlayed = false;
        }, 4000);
    }
    
    /**
     * Función para crear efecto de confeti desde múltiples puntos
     */
    function createConfettiEffect() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Crear confeti desde diferentes puntos de la pantalla
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const x = Math.random() * windowWidth;
                const y = Math.random() * windowHeight * 0.3; // Solo en la parte superior
                
                const confetti = document.createElement('div');
                confetti.className = 'particle';
                confetti.style.left = x + 'px';
                confetti.style.top = y + 'px';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.width = Math.random() * 8 + 4 + 'px';
                confetti.style.height = confetti.style.width;
                
                particlesContainer.appendChild(confetti);
                
                // Remover después de la animación
                setTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.parentNode.removeChild(confetti);
                    }
                }, 3000);
            }, i * 50);
        }
    }
    
    /**
     * Función principal que se ejecuta al hacer clic en el botón
     */
    function handleButtonClick(event) {
        // Obtener la posición del botón para centrar las partículas
        const buttonRect = deployButton.getBoundingClientRect();
        const centerX = buttonRect.left + buttonRect.width / 2;
        const centerY = buttonRect.top + buttonRect.height / 2;
        
        // Agregar efecto visual al botón
        deployButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            deployButton.style.transform = '';
        }, 150);
        
        // Crear explosión de partículas desde el botón
        createParticleExplosion(centerX, centerY, 30);
        
        // Crear efecto de confeti adicional
        setTimeout(() => {
            createConfettiEffect();
        }, 200);
        
        // Mostrar guía de despliegue después de las animaciones
        setTimeout(() => {
            if (currentEnvironment === 'aws') {
                showSuccessMessage();
            } else {
                showDeploymentGuide();
            }
        }, 600);
        
        // Reproducir sonido de éxito (opcional - comentado porque requiere archivo de audio)
        // playSuccessSound();
    }
    
    /**
     * Función opcional para reproducir sonido (requiere archivo de audio)
     * Descomenta y agrega un archivo de audio si deseas incluir sonido
     */
    /*
    function playSuccessSound() {
        const audio = new Audio('success-sound.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => {
            console.log('No se pudo reproducir el sonido:', e);
        });
    }
    */
    
    /**
     * Función para crear partículas de fondo ocasionales (efecto ambiental)
     */
    function createAmbientParticles() {
        setInterval(() => {
            // Solo crear partículas ambientales si no hay animación activa
            if (!animationPlayed) {
                const x = Math.random() * window.innerWidth;
                const y = window.innerHeight + 20;
                
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = x + 'px';
                particle.style.top = y + 'px';
                particle.style.opacity = '0.3';
                particle.style.animationDuration = '8s';
                particle.style.animationName = 'particleFloatUp';
                
                particlesContainer.appendChild(particle);
                
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 8000);
            }
        }, 3000);
    }
    
    // Agregar el event listener al botón
    deployButton.addEventListener('click', handleButtonClick);
    
    // Agregar event listener para el toggle del panel de metadata
    toggleMetadata.addEventListener('click', toggleMetadataPanel);
    
    // Agregar event listeners para la guía de despliegue
    closeGuide.addEventListener('click', closeDeploymentGuide);
    nextStep.addEventListener('click', nextStepHandler);
    copyCommand.addEventListener('click', copyCommandsToClipboard);
    
    // Cerrar guía al hacer clic fuera de ella
    deploymentGuide.addEventListener('click', (e) => {
        if (e.target === deploymentGuide) {
            closeDeploymentGuide();
        }
    });
    
    // Inicializar información del entorno
    loadEnvironmentInfo();
    
    // Actualizar timestamp cada minuto
    setInterval(updateTimestamp, 60000);
    
    // Iniciar partículas ambientales
    createAmbientParticles();
    
    // Agregar efecto de hover mejorado con JavaScript
    deployButton.addEventListener('mouseenter', function() {
        this.style.background = 'linear-gradient(45deg, #ff8a80, #80cbc4, #64b5f6, #aed581)';
    });
    
    deployButton.addEventListener('mouseleave', function() {
        this.style.background = 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4)';
    });
    
    // Agregar soporte para teclado (accesibilidad)
    deployButton.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleButtonClick(event);
        }
    });
    
    // Función para manejar el redimensionamiento de la ventana
    window.addEventListener('resize', function() {
        // Limpiar partículas existentes al redimensionar
        particlesContainer.innerHTML = '';
    });
    
    // Agregar animación CSS adicional para partículas que flotan hacia arriba
    const style = document.createElement('style');
    style.textContent = `
        @keyframes particleFloatUp {
            0% {
                opacity: 0.3;
                transform: translateY(0) rotate(0deg);
            }
            50% {
                opacity: 0.6;
            }
            100% {
                opacity: 0;
                transform: translateY(-100vh) rotate(360deg);
            }
        }
    `;
    document.head.appendChild(style);
    
    // Mensaje de bienvenida en la consola para desarrolladores
    console.log('🚀 ¡Bienvenido a tu página de AWS Cloud Practitioner!');
    console.log('💡 Tip: Abre las herramientas de desarrollador para explorar el código');
    console.log('🎯 Esta página fue creada con HTML, CSS y JavaScript puro');
});
