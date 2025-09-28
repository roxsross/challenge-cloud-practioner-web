# 🚀 Manual Completo de Despliegue en AWS EC2

Guía paso a paso para desplegar cualquiera de los modelos de sitios web en una instancia EC2 de AWS.

## 📋 Tabla de Contenidos

1. [Prerrequisitos](#-prerrequisitos)
2. [Configuración Inicial de AWS](#️-configuración-inicial-de-aws)
3. [Lanzamiento de Instancia EC2](#-lanzamiento-de-instancia-ec2)
4. [Conexión a la Instancia](#-conexión-a-la-instancia)
5. [Configuración del Servidor Web](#️-configuración-del-servidor-web)
6. [Despliegue del Sitio Web](#-despliegue-del-sitio-web)
7. [Configuración de Dominio (Opcional)](#-configuración-de-dominio-opcional)
8. [Monitoreo y Mantenimiento](#-monitoreo-y-mantenimiento)
9. [Solución de Problemas](#-solución-de-problemas)

---

## 🔧 Prerrequisitos

### Cuenta AWS
- ✅ Cuenta AWS activa (Free Tier disponible)
- ✅ Tarjeta de crédito válida registrada
- ✅ Verificación de identidad completada

### Herramientas Locales
- ✅ AWS CLI instalado y configurado
- ✅ Cliente SSH (Terminal en Mac/Linux, PuTTY en Windows)
- ✅ Editor de texto (VS Code recomendado)

### Conocimientos Básicos
- ✅ Comandos básicos de Linux
- ✅ Conceptos de redes (IP, puertos, DNS)
- ✅ Uso básico de SSH

---

## ⚙️ Configuración Inicial de AWS

### 1. Instalar AWS CLI

**En macOS:**
```bash
# Usando Homebrew
brew install awscli

# O usando pip
pip3 install awscli
```

**En Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install awscli
```

**En Windows:**
Descargar desde: https://aws.amazon.com/cli/

### 2. Configurar AWS CLI

```bash
# Configurar credenciales
aws configure

# Ingresa cuando se solicite:
# AWS Access Key ID: [Tu Access Key]
# AWS Secret Access Key: [Tu Secret Key]
# Default region name: us-east-1
# Default output format: json
```

### 3. Verificar Configuración

```bash
# Verificar que AWS CLI funciona
aws sts get-caller-identity

# Debería mostrar tu información de cuenta
```

---

## 🖥️ Lanzamiento de Instancia EC2

### Opción A: Usando AWS CLI (Recomendado)

```bash
# 1. Crear un key pair para SSH
aws ec2 create-key-pair \
    --key-name mi-sitio-web-key \
    --query 'KeyMaterial' \
    --output text > mi-sitio-web-key.pem

# 2. Configurar permisos del key pair
chmod 400 mi-sitio-web-key.pem

# 3. Crear security group
aws ec2 create-security-group \
    --group-name mi-sitio-web-sg \
    --description "Security group para sitio web"

# 4. Obtener ID del security group
SG_ID=$(aws ec2 describe-security-groups \
    --group-names mi-sitio-web-sg \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# 5. Configurar reglas de firewall
# SSH (puerto 22)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

# HTTP (puerto 80)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

# HTTPS (puerto 443)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

# 6. Lanzar instancia EC2
aws ec2 run-instances \
    --image-id ami-0c02fb55956c7d316 \
    --count 1 \
    --instance-type t2.micro \
    --key-name mi-sitio-web-key \
    --security-group-ids $SG_ID \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=mi-sitio-web}]'
```

### Opción B: Usando AWS Console

1. **Ir a EC2 Dashboard**
   - Navega a https://console.aws.amazon.com/ec2/
   - Click en "Launch Instance"

2. **Configurar Instancia**
   - **Name**: `mi-sitio-web`
   - **AMI**: Amazon Linux 2023 (Free Tier)
   - **Instance Type**: t2.micro (Free Tier)
   - **Key Pair**: Crear nuevo o usar existente
   - **Security Group**: Crear nuevo con puertos 22, 80, 443 abiertos

3. **Launch Instance**
   - Review y click "Launch Instance"
   - Esperar a que el estado sea "Running"

### 3. Obtener IP Pública

```bash
# Obtener IP pública de la instancia
aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=mi-sitio-web" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text
```

---

## 🔐 Conexión a la Instancia

### 1. Conectar via SSH

```bash
# Reemplaza [IP-PUBLICA] con la IP de tu instancia
ssh -i mi-sitio-web-key.pem ec2-user@[IP-PUBLICA]

# Ejemplo:
# ssh -i mi-sitio-web-key.pem ec2-user@54.123.45.67
```

### 2. Actualizar Sistema

```bash
# Una vez conectado, actualizar el sistema
sudo yum update -y

# Para Ubuntu, usar:
# sudo apt update && sudo apt upgrade -y
```

---

## 🛠️ Configuración del Servidor Web

### Opción A: Nginx (Recomendado)

```bash
# 1. Instalar Nginx
sudo yum install -y nginx

# Para Ubuntu:
# sudo apt install -y nginx

# 2. Iniciar y habilitar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 3. Verificar estado
sudo systemctl status nginx

```

### Opción B: Apache

```bash
# 1. Instalar Apache
sudo yum install -y httpd

# Para Ubuntu:
# sudo apt install -y apache2

# 2. Iniciar y habilitar Apache
sudo systemctl start httpd
sudo systemctl enable httpd

# 3. Verificar estado
sudo systemctl status httpd
```

### 3. Verificar Instalación

```bash
# Abrir en navegador: http://[IP-PUBLICA]
# Deberías ver la página por defecto del servidor web
```

---

## 📂 Despliegue del Sitio Web

### Método 1: Descarga Directa desde GitHub

```bash
# 1. Instalar Git
sudo yum install -y git

# 2. Navegar al directorio web
cd /var/www/html  # Para Apache
# cd /usr/share/nginx/html  # Para Nginx

# 3. Descargar el repositorio
sudo git clone https://github.com/roxsross/challenge-cloud-practioner-web.git temp-repo

# 4. Copiar archivos del modelo deseado
# Para el modelo básico:
sudo cp -r temp-repo/basico/* .

# Para el modelo portfolio:
# sudo cp -r temp-repo/porfolio/* .

# Para el modelo coming-soon:
# sudo cp -r temp-repo/coming-soon/* .

# 5. Limpiar archivos temporales
sudo rm -rf temp-repo

# 6. Configurar permisos
sudo chown -R nginx:nginx /usr/share/nginx/html  # Para Nginx
# sudo chown -R apache:apache /var/www/html      # Para Apache
sudo chmod -R 755 /usr/share/nginx/html
```

### Método 2: Subida Manual con SCP

```bash
# Desde tu máquina local, subir archivos
# Para el modelo básico:
scp -i mi-sitio-web-key.pem -r basico/* ec2-user@[IP-PUBLICA]:/tmp/

# Luego en el servidor:
sudo cp -r /tmp/* /usr/share/nginx/html/  # Para Nginx
# sudo cp -r /tmp/* /var/www/html/        # Para Apache
```

### Método 3: Usando Scripts de Automatización

```bash
# 1. Usar los scripts incluidos en el repositorio
cd /tmp
git clone https://github.com/roxsross/challenge-cloud-practioner-web.git
cd challenge-cloud-practioner-web/script-example/nginx-web/

# 2. Ejecutar script según tu OS
# Para Amazon Linux 2023:
sudo bash amazon-linux-2023/deploy.sh

# Para Ubuntu:
sudo bash ubuntu/deploy.sh
```

---

## 🌐 Configuración de Dominio (Opcional)

### 1. Configurar Elastic IP (Recomendado)

```bash
# 1. Asignar Elastic IP
aws ec2 allocate-address --domain vpc

# 2. Obtener Instance ID
INSTANCE_ID=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=mi-sitio-web" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text)

# 3. Asociar Elastic IP
aws ec2 associate-address \
    --instance-id $INSTANCE_ID \
    --allocation-id [ALLOCATION-ID-FROM-STEP-1]
```

### 2. Configurar Route 53 (Si tienes dominio)

```bash
# 1. Crear hosted zone
aws route53 create-hosted-zone \
    --name tudominio.com \
    --caller-reference $(date +%s)

# 2. Crear record A apuntando a tu Elastic IP
# (Usar AWS Console es más fácil para esto)
```

### 3. Configurar SSL con Let's Encrypt

```bash
# 1. Instalar Certbot
sudo yum install -y python3-pip
sudo pip3 install certbot certbot-nginx

# Para Ubuntu:
# sudo apt install -y certbot python3-certbot-nginx

# 2. Obtener certificado SSL
sudo certbot --nginx -d tudominio.com

# 3. Configurar renovación automática
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 📊 Monitoreo y Mantenimiento

### 1. Comandos de Monitoreo Básico

```bash
# Ver estado del servidor web
sudo systemctl status nginx  # o httpd para Apache

# Ver logs del servidor web
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ver uso de recursos
top
htop  # si está instalado
df -h  # espacio en disco
free -h  # memoria RAM
```

### 2. Configurar CloudWatch (Opcional)

```bash
# 1. Instalar CloudWatch Agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# 2. Configurar agent (seguir wizard)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### 3. Backup Automático

```bash
# Script de backup simple
cat << 'EOF' > /home/ec2-user/backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /home/ec2-user/backup_$DATE.tar.gz /usr/share/nginx/html
aws s3 cp /home/ec2-user/backup_$DATE.tar.gz s3://mi-bucket-backup/
rm /home/ec2-user/backup_$DATE.tar.gz
EOF

chmod +x /home/ec2-user/backup.sh

# Programar backup diario
echo "0 2 * * * /home/ec2-user/backup.sh" | sudo crontab -
```

---

## 🔧 Solución de Problemas

### Problema: No puedo conectar por SSH

**Soluciones:**
```bash
# 1. Verificar security group
aws ec2 describe-security-groups --group-names mi-sitio-web-sg

# 2. Verificar permisos del key pair
chmod 400 mi-sitio-web-key.pem

# 3. Verificar IP pública
aws ec2 describe-instances --filters "Name=tag:Name,Values=mi-sitio-web"
```

### Problema: Sitio web no carga

**Soluciones:**
```bash
# 1. Verificar estado del servidor web
sudo systemctl status nginx

# 2. Verificar puertos abiertos
sudo netstat -tlnp | grep :80

# 3. Verificar logs de error
sudo tail -f /var/log/nginx/error.log

# 4. Reiniciar servidor web
sudo systemctl restart nginx
```

### Problema: Permisos de archivos

**Soluciones:**
```bash
# 1. Corregir propietario
sudo chown -R nginx:nginx /usr/share/nginx/html

# 2. Corregir permisos
sudo chmod -R 755 /usr/share/nginx/html
sudo chmod -R 644 /usr/share/nginx/html/*.html
```

### Problema: SSL no funciona

**Soluciones:**
```bash
# 1. Verificar certificado
sudo certbot certificates

# 2. Renovar certificado
sudo certbot renew

# 3. Verificar configuración Nginx
sudo nginx -t
```

---

## 📚 Comandos Útiles de Referencia

### Gestión de Instancias EC2
```bash
# Listar instancias
aws ec2 describe-instances

# Parar instancia
aws ec2 stop-instances --instance-ids i-1234567890abcdef0

# Iniciar instancia
aws ec2 start-instances --instance-ids i-1234567890abcdef0

# Terminar instancia
aws ec2 terminate-instances --instance-ids i-1234567890abcdef0
```

### Gestión de Nginx
```bash
# Comandos básicos
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx
sudo systemctl status nginx

# Verificar configuración
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Gestión de Archivos
```bash
# Cambiar al directorio web
cd /usr/share/nginx/html

# Ver archivos
ls -la

# Editar archivo
sudo nano index.html

# Cambiar permisos
sudo chmod 644 *.html
sudo chmod 755 */
```

---

## 🎯 Próximos Pasos Recomendados

1. **Configurar HTTPS** con Let's Encrypt
2. **Implementar CDN** con CloudFront
3. **Configurar monitoreo** con CloudWatch
4. **Automatizar despliegues** con GitHub Actions
5. **Configurar backup automático** en S3
6. **Implementar balanceador de carga** para alta disponibilidad

---

## 📞 Soporte y Recursos

- **Documentación AWS EC2**: https://docs.aws.amazon.com/ec2/
- **Documentación Nginx**: https://nginx.org/en/docs/
- **AWS Free Tier**: https://aws.amazon.com/free/
- **Let's Encrypt**: https://letsencrypt.org/
- **Comunidad AWS**: https://forums.aws.amazon.com/

---

**¡Felicidades! 🎉 Tu sitio web está ahora desplegado en AWS EC2**

*Creado con ❤️ para la comunidad de estudiantes AWS Cloud Practitioner*
