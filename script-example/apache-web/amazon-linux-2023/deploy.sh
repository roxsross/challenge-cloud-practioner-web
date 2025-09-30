#!/bin/bash
yum install -y httpd
systemctl start httpd
systemctl enable httpd

cat > /var/www/html/index.html << 'FINALHTML'
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Camino en AWS | Portfolio</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            background: linear-gradient(135deg, #232F3E 0%, #4A90E2 100%);
            color: white;
            min-height: 100vh;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 2rem;
        }

        .hero {
            text-align: center;
            padding: 4rem 2rem;
        }

        .hero h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        .hero p {
            font-size: 1.5rem;
            opacity: 0.9;
        }

        .section {
            background: rgba(255,255,255,0.1);
            border-radius: 15px;
            padding: 2rem;
            margin: 2rem 0;
            backdrop-filter: blur(10px);
        }

        .section h2 {
            font-size: 2rem;
            margin-bottom: 1.5rem;
            color: #FF9900;
        }

        .timeline-item {
            background: rgba(255,255,255,0.15);
            padding: 1.5rem;
            margin: 1rem 0;
            border-radius: 10px;
            border-left: 4px solid #FF9900;
        }

        .timeline-item h3 {
            color: #FF9900;
            margin-bottom: 0.5rem;
        }

        .projects {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-top: 1rem;
        }

        .project-card {
            background: rgba(255,255,255,0.15);
            padding: 1.5rem;
            border-radius: 10px;
            transition: transform 0.3s;
        }

        .project-card:hover {
            transform: translateY(-5px);
        }

        .project-card h3 {
            color: #FF9900;
            margin-bottom: 1rem;
        }

        .skills {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-top: 1rem;
        }

        .skill {
            background: #FF9900;
            padding: 0.5rem 1rem;
            border-radius: 25px;
            font-weight: bold;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: bold;
        }

        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 0.8rem;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            background: rgba(255,255,255,0.9);
        }

        .form-group textarea {
            resize: vertical;
            min-height: 120px;
        }

        .btn {
            background: #FF9900;
            color: white;
            padding: 1rem 2rem;
            border: none;
            border-radius: 50px;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }

        .btn:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 20px rgba(255,153,0,0.5);
        }

        .success {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #FF9900;
            padding: 2rem 3rem;
            border-radius: 15px;
            text-align: center;
            display: none;
            z-index: 1000;
        }

        .success.show {
            display: block;
            animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }

        footer {
            text-align: center;
            padding: 2rem;
            margin-top: 2rem;
            opacity: 0.8;
        }

        @media (max-width: 768px) {
            .hero h1 { font-size: 2rem; }
            .hero p { font-size: 1.2rem; }
            .projects { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="hero">
            <h1>🚀 Mi Camino en AWS</h1>
            <p>Construyendo mi futuro en la nube</p>
        </div>

        <div class="section">
            <h2>👤 Sobre mí</h2>
            <p>Estudiante de AWS Cloud Practitioner apasionada por la tecnología. Mi objetivo es convertirme en consultora cloud y ayudar a empresas en su transformación digital.</p>
            <div class="skills">
                <span class="skill">EC2</span>
                <span class="skill">S3</span>
                <span class="skill">IAM</span>
                <span class="skill">Lambda</span>
                <span class="skill">VPC</span>
                <span class="skill">CloudWatch</span>
            </div>
        </div>

        <div class="section">
            <h2>📚 Mi Aprendizaje</h2>
            
            <div class="timeline-item">
                <h3>☁️ Fundamentos Cloud</h3>
                <p>Conceptos básicos de computación en la nube y modelos de servicio.</p>
            </div>
            
            <div class="timeline-item">
                <h3>🛡️ Seguridad</h3>
                <p>IAM, políticas de seguridad y mejores prácticas.</p>
            </div>
            
            <div class="timeline-item">
                <h3>💻 Compute</h3>
                <p>EC2, Lambda y servicios de cómputo escalables.</p>
            </div>
            
            <div class="timeline-item">
                <h3>💾 Storage</h3>
                <p>S3, EBS, EFS y soluciones de almacenamiento.</p>
            </div>
            
            <div class="timeline-item">
                <h3>🌐 Redes</h3>
                <p>VPC, subnets y configuración de redes seguras.</p>
            </div>
            
            <div class="timeline-item" style="background: #FF9900;">
                <h3 style="color: white;">🎓 AWS Cloud Practitioner</h3>
                <p><strong>Certificación en progreso - ¡Próximamente!</strong></p>
            </div>
        </div>

        <div class="section">
            <h2>🚀 Mis Proyectos</h2>
            <div class="projects">
                <div class="project-card">
                    <h3>🌍 Hosting en S3</h3>
                    <p>Página web personal desplegada en Amazon S3 con CloudFront.</p>
                </div>
                
                <div class="project-card">
                    <h3>⚡ API con Lambda</h3>
                    <p>API REST serverless usando Lambda y API Gateway.</p>
                </div>
                
                <div class="project-card">
                    <h3>🖼️ Galería</h3>
                    <p>Aplicación para gestionar imágenes con S3 y DynamoDB.</p>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>📧 Contacto</h2>
            <form onsubmit="enviarFormulario(event)">
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" id="nombre" required>
                </div>
                
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="email" required>
                </div>
                
                <div class="form-group">
                    <label>Mensaje</label>
                    <textarea id="mensaje" required></textarea>
                </div>
                
                <button type="submit" class="btn">Enviar Mensaje</button>
            </form>
        </div>

        <footer>
            <p>© 2024 - Portfolio AWS | Desplegado con ❤️ en EC2</p>
        </footer>
    </div>

    <div class="success" id="exito">
        <h2>✅ ¡Mensaje Enviado!</h2>
        <p>Gracias por contactarme</p>
    </div>

    <script>
        function enviarFormulario(e) {
            e.preventDefault();
            document.getElementById('exito').classList.add('show');
            document.getElementById('nombre').value = '';
            document.getElementById('email').value = '';
            document.getElementById('mensaje').value = '';
            setTimeout(() => {
                document.getElementById('exito').classList.remove('show');
            }, 3000);
        }
    </script>
</body>
</html>
FINALHTML

systemctl restart httpd