/**
 * API Documentation Routes
 *
 * SOLID: Single responsibility - serves API documentation
 * DRY: Reuses auto-generated swagger spec
 * KISS: Simple swagger-ui-express setup
 * Library-First: Uses swagger-ui-express for documentation UI
 */

import { Router } from 'express'
import swaggerUi from 'swagger-ui-express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// Get the swagger specification
function getSwaggerSpec() {
  const swaggerPath = path.join(__dirname, '../api-docs/swagger.json')

  if (!fs.existsSync(swaggerPath)) {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Studio AI API',
        version: '1.0.0',
        description:
          'Swagger documentation not yet generated. Run `npm run docs:generate` to create documentation.',
      },
      paths: {},
    }
  }

  try {
    const swaggerFile = fs.readFileSync(swaggerPath, 'utf8')
    return JSON.parse(swaggerFile)
  } catch (error) {
    console.error('Error reading swagger.json:', error)
    return {
      openapi: '3.0.0',
      info: {
        title: 'Studio AI API',
        version: '1.0.0',
        description: 'Error loading API documentation',
      },
      paths: {},
    }
  }
}

// Swagger UI options
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true,
  },
  customCss: `
    .swagger-ui .topbar { 
      background-color: #1f2937; 
    }
    .swagger-ui .topbar .download-url-wrapper .select-label {
      color: #ffffff;
    }
    .swagger-ui .info .title {
      color: #1f2937;
    }
    .swagger-ui .scheme-container {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }
  `,
  customSiteTitle: 'Studio AI API Documentation',
  customfavIcon: '/favicon.ico',
}

// GET /api/api-docs - Redirect to Swagger UI
router.get('/', (req, res) => {
  res.redirect('/api/api-docs/swagger')
})

// GET /api/api-docs/json - Raw swagger JSON
router.get('/json', (req, res) => {
  const spec = getSwaggerSpec()
  res.json(spec)
})

// GET /api/api-docs/swagger - Swagger UI interface
router.use('/swagger', swaggerUi.serve)
router.get('/swagger', swaggerUi.setup(getSwaggerSpec(), swaggerOptions))

// GET /api/api-docs/redoc - Alternative ReDoc interface (if needed)
router.get('/redoc', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Studio AI API - ReDoc</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <style>
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <redoc spec-url="/api/api-docs/json"></redoc>
        <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
      </body>
    </html>
  `
  res.send(html)
})

// GET /api/api-docs/health - Documentation health check
router.get('/health', (req, res) => {
  const swaggerPath = path.join(__dirname, '../api-docs/swagger.json')
  const exists = fs.existsSync(swaggerPath)

  let pathCount = 0
  let endpointCount = 0

  if (exists) {
    try {
      const spec = getSwaggerSpec()
      pathCount = Object.keys(spec.paths || {}).length
      endpointCount = Object.values(spec.paths || {}).reduce(
        (total, path: Record<string, unknown>) => {
          return total + Object.keys(path).length
        },
        0
      )
    } catch (_error) {
      // Ignore parsing errors for health check
    }
  }

  res.json({
    documentationExists: exists,
    pathCount,
    endpointCount,
    lastGenerated: exists ? fs.statSync(swaggerPath).mtime.toISOString() : null,
    urls: {
      swagger: '/api/api-docs/swagger',
      json: '/api/api-docs/json',
      redoc: '/api/api-docs/redoc',
    },
  })
})

export default router
