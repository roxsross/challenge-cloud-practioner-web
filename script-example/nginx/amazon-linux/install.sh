#!/bin/bash

# User Data para Amazon Linux 2023
sudo yum update -y
# Instalar nginx y herramientas
sudo yum install nginx unzip git wget -y
# Iniciar nginx
sudo systemctl start nginx
sudo systemctl enable nginx
# Reiniciar nginx
sudo systemctl restart nginx
