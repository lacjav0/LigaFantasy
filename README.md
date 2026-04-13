# LigaFantasy ⚽🚀

Desarrollos personales para la liga fantasy y optimización de equipos.

## Sorare Fantasy Optimizer

Herramienta completa para optimizar tu equipo en ligas Fantasy utilizando datos reales de Sorare.

### Características Principales

- **Buscador Interactivo**: Encuentra jugadores directamente desde la API de Sorare.
- **Optimización de Tácticas**: Elige tu formación (4-4-2, 4-3-3, etc.) y descubre tu mejor XI.
- **Algoritmo de Puntuación**: Basado en el estado de forma (L5) y estabilidad (L15).
- **Persistencia Local**: Guarda tu lista de jugadores y cárgala automáticamente al iniciar.
- **Interfaz Moderna**: Dashboard oscuro con micro-animaciones y UX optimizado.

### Instalación y Ejecución

1. **Abrir la terminal y navegar a la carpeta del proyecto**:
   ```bash
   cd c:\Antigravity\Proyectos\SorareFantasyOptimizer
   ```
2. **Instalar dependencias** (solo la primera vez):
   ```bash
   npm install
   ```
3. **Iniciar la aplicación**:
   ```bash
   npm start
   ```
4. **Acceder a la herramienta**:
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Uso del Optimizador

1. **Buscar Jugadores**: Utiliza la barra de búsqueda para encontrar jugadores por nombre.
2. **Gestionar Lista**: Añade los jugadores de tu equipo o los que sigues a tu lista persistente.
3. **Seleccionar Formación**: Elige la táctica que prefieras (ej. 4-3-3).
4. **Optimizar**: La aplicación calculará automáticamente el mejor XI basándose en los puntos SO5 de Sorare.
5. **Guardar**: No olvides pulsar en "Guardar Lista" para que tus jugadores aparezcan en la próxima sesión.

### Tecnologías Utilizadas

- **Backend**: Node.js, Express, GraphQL (Sorare API).
- **Frontend**: Vanilla CSS, HTML5 Semántico, JavaScript Moderno.
- **Iconos**: Phosphor Icons.

## Autor

Desarrollado con ayuda de **Antigravity AI**.
