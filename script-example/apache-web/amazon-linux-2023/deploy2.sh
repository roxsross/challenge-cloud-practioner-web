#!/bin/bash
set -xe

# Actualizar paquetes
dnf -y update

# Instalar SOLO Apache (httpd). curl ya viene como curl-minimal.
dnf -y install httpd

# Habilitar e iniciar Apache
systemctl enable --now httpd

# Docroot por defecto
DOCROOT="/var/www/html"

# Limpiar index previo
rm -f "${DOCROOT}/index.html"

# Descargar tu index.html (usa el curl ya presente)
curl -fsSL "https://raw.githubusercontent.com/roxsross/challenge-cloud-practioner-web/master/porfolio/index.html" -o "${DOCROOT}/index.html"

# Permisos (usuario de Apache en AL2023)
chown -R apache:apache "${DOCROOT}"
chmod -R 755 "${DOCROOT}"

# Reiniciar Apache por las dudas
systemctl restart httpd
