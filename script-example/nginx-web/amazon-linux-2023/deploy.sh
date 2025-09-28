#!/bin/bash

# User Data para Amazon Linux 2023
sudo yum update -y

# Instalar nginx y herramientas
sudo yum install nginx unzip wget -y

# Iniciar nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Limpiar directorio web y preparar
sudo rm -f /usr/share/nginx/html/index.html
sudo rm -f /var/www/html/index.html
cd /usr/share/nginx/html

# Descargar template
sudo wget https://github.com/startbootstrap/startbootstrap-stylish-portfolio/archive/gh-pages.zip

# Extraer archivos
sudo unzip gh-pages.zip

# Mover contenido
sudo cp -r startbootstrap-stylish-portfolio-gh-pages/* .

# Limpiar
sudo rm gh-pages.zip
sudo rm -rf startbootstrap-stylish-portfolio-gh-pages

# Permisos
sudo chown -R nginx:nginx /usr/share/nginx/html
sudo chmod -R 755 /usr/share/nginx/html

# Reiniciar nginx
sudo systemctl restart nginx