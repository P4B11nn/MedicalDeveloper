# 🚀 Medical Developer v4.2.0 - Deployment en Azure Portal

## 📋 **Pasos para Deploy desde Azure Portal (Sin instalaciones locales)**

### 1️⃣ **Preparar tu Repositorio GitHub**

**A. Subir archivos a GitHub:**
```bash
# Si no has subido los cambios recientes:
git add .
git commit -m "feat: Azure deployment configuration ready"
git push origin v4.1.1
```

**B. Archivos de configuración creados:**
- ✅ `staticwebapp.config.json` - Configuración Azure Static Web Apps
- ✅ `.github/workflows/azure-static-web-apps.yml` - CI/CD automático
- ✅ `manifest.json` - PWA optimizada
- ✅ `sw.js` - Service Worker v4.2.0-prod

### 2️⃣ **Crear Azure Static Web App desde Portal**

**A. Acceder a Azure Portal:**
1. Ve a [portal.azure.com](https://portal.azure.com)
2. Inicia sesión con tu cuenta de estudiante
3. Busca "Static Web Apps" en la barra de búsqueda

**B. Crear nuevo recurso:**
1. Click en **"+ Create"**
2. Selecciona tu **subscription de estudiante**
3. Crea o selecciona un **Resource Group** (ej: `rg-medicaldeveloper`)
4. **Name**: `medicaldeveloper-app`
5. **Plan type**: `Free` (perfecto para estudiantes)
6. **Region**: Elige la más cercana (ej: East US 2)

**C. Configurar código fuente:**
1. **Source**: `GitHub`
2. **GitHub account**: Autoriza tu cuenta GitHub
3. **Organization**: Tu usuario GitHub
4. **Repository**: `MedicalWebOffline`
5. **Branch**: `v4.1.1`
6. **Build Presets**: `Custom`
7. **App location**: `/` (raíz del proyecto)
8. **Api location**: dejar vacío
9. **Output location**: dejar vacío

### 3️⃣ **Configurar Deployment**

**A. Configuración automática:**
- Azure creará automáticamente el workflow en `.github/workflows/`
- El token `AZURE_STATIC_WEB_APPS_API_TOKEN` se configura automáticamente
- El deployment se ejecutará en cada push a la rama `v4.1.1`

**B. Verificar configuración:**
1. Ve a tu repositorio en GitHub
2. Verifica que aparezca en **Actions** el workflow corriendo
3. El primer deployment tomará ~2-5 minutos

### 4️⃣ **Acceder a tu Aplicación**

**Una vez completado el deployment:**

1. **URL de la app**: Se mostrará en el portal de Azure
   - Formato: `https://gentle-hill-xxxxxxx.azurestaticapps.net`

2. **Funcionalidades disponibles:**
   - ✅ **Progressive Web App (PWA)** - Instalable desde navegador
   - ✅ **Offline Mode** - Funciona sin internet
   - ✅ **Dashboard Administrativo** - Gestión completa
   - ✅ **Dashboard Practicante** - Vista optimizada
   - ✅ **SSL/HTTPS** - Seguridad automática
   - ✅ **CDN Global** - Rendimiento optimizado

### 5️⃣ **Configuraciones Post-Deployment**

**A. Dominio personalizado (Opcional):**
1. En Azure Portal > Tu Static Web App
2. **Custom domains** > **+ Add**
3. Configura tu dominio propio

**B. Monitoreo:**
1. **Application Insights** está incluido gratuitamente
2. Ve métricas en tiempo real desde Azure Portal
3. Logs de errores y performance automáticos

### 6️⃣ **Actualizar la Aplicación**

**Para futuras actualizaciones:**
```bash
# Solo necesitas hacer push a GitHub
git add .
git commit -m "feat: nuevas funcionalidades"
git push origin v4.1.1
```
- El deployment es **100% automático**
- Toma ~2-3 minutos actualizar
- Zero downtime deployments

---

## 🎯 **Características Incluidas en tu Plan de Estudiante**

| Recurso | Límite Gratuito | Tu App |
|---------|----------------|--------|
| **Bandwidth** | 100 GB/mes | ✅ Suficiente |
| **Storage** | 0.5 GB | ✅ Tu app ~50MB |
| **Functions** | 2 apps | ✅ Solo usas 1 |
| **Custom domains** | Ilimitados | ✅ Disponible |
| **SSL certificates** | Automático | ✅ Incluido |
| **Global CDN** | Incluido | ✅ Incluido |

## 🔧 **Troubleshooting**

**Si el deployment falla:**

1. **Verificar GitHub Actions:**
   - Ve a tu repo > **Actions** tab
   - Verifica los logs del workflow

2. **Archivos críticos:**
   ```
   ✅ index.html (página principal)
   ✅ menuInicio.html (dashboard)
   ✅ staticwebapp.config.json (configuración)
   ✅ manifest.json (PWA)
   ✅ sw.js (Service Worker)
   ```

3. **Configuración correcta:**
   - Branch: `v4.1.1` ✅
   - App location: `/` ✅
   - No API backend requerido ✅

## 📞 **Soporte**

- **GitHub Issues**: Logs detallados en Actions
- **Azure Portal**: Monitoring y logs en tiempo real
- **PWA Testing**: Chrome DevTools > Application > Service Workers

---

## 🎉 **¡Tu aplicación estará lista en minutos!**

Una vez completados los pasos, tendrás:
- **URL pública** para acceder desde cualquier lugar
- **PWA instalable** en móviles y escritorio
- **Funcionalidad offline** completa
- **Actualizaciones automáticas** con cada commit
- **SSL y CDN** incluidos gratuitamente
- **Cero costo** con tu plan de estudiante