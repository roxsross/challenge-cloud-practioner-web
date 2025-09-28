#!/bin/bash

# User Data para EC2 Ubuntu
sudo apt update

# Instalar nginx y herramientas
sudo apt install nginx unzip wget -y

# Iniciar nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configurar firewall
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Limpiar directorio web y preparar
sudo rm -f /var/www/html/index.nginx-debian.html
cd /var/www/html

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
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Reiniciar nginx
sudo systemctl restart nginx