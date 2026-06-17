import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsPublicController {
  constructor(private readonly teamsSvc: TeamsService) {}

  @Get('p/:id')
  getPublicProfile(@Param('id') teamId: string) {
    return this.teamsSvc.getPublicProfile(teamId);
  }

  @Get('invite/:id')
  async getInvitePreview(@Param('id') teamId: string, @Res() res: Response) {
    try {
      const team = await this.teamsSvc.getPublicProfile(teamId);

      const appUrl = process.env.APP_URL || 'https://sportcard.miguelangeljaimen.cl';
      const redirectUrl = `${appUrl}/login?return_url=%2Fteams%2F${teamId}`;

      // URL base para la imagen: usar logoUrl si existe, sino generar un placeholder genérico
      const imageUrl = team.logoUrl || `${appUrl}/assets/logo.png`;

      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${team.name} - SportCard</title>

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${appUrl}/teams/invite/${teamId}">
  <meta property="og:title" content="${team.name}">
  <meta property="og:description" content="Te invitan a unirte al equipo de ${team.sport}. ${team.name} en SportCard.">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${appUrl}/teams/invite/${teamId}">
  <meta property="twitter:title" content="${team.name}">
  <meta property="twitter:description" content="Te invitan a unirte al equipo de ${team.sport}. ${team.name} en SportCard.">
  <meta property="twitter:image" content="${imageUrl}">

  <!-- WhatsApp -->
  <meta property="og:image:type" content="image/png">

  <!-- Redirección -->
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <link rel="canonical" href="${redirectUrl}">

  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #1e1e1e 0%, #0a0a0a 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 28px;
    }
    .sport {
      color: #00e87a;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .message {
      color: #888;
      margin-bottom: 30px;
      font-size: 14px;
    }
    a {
      display: inline-block;
      background: #00e87a;
      color: #1e1e1e;
      padding: 12px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: bold;
      font-size: 16px;
      transition: opacity 0.3s;
    }
    a:hover {
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚽</div>
    <h1>${team.name}</h1>
    <div class="sport">${team.sport}</div>
    <p class="message">Te están invitando a unirte a este equipo.<br>Redirigiendo...</p>
    <a href="${redirectUrl}">Aceptar invitación</a>
  </div>

  <script>
    // Fallback en caso que el meta refresh no funcione
    setTimeout(() => {
      window.location.href = "${redirectUrl}";
    }, 2000);
  </script>
</body>
</html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      throw new NotFoundException('Equipo no encontrado.');
    }
  }
}
