#!/bin/bash

# User Data para EC2 Ubuntu
sudo apt update

# Instalar nginx y herramientas
sudo apt install nginx unzip wget -y

# Iniciar nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Reiniciar nginx
sudo systemctl restart nginx