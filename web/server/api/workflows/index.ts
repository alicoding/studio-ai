/**
 * Workflow API Routes
 *
 * SOLID: Single responsibility - route registration
 * DRY: Centralized workflow API routing
 * KISS: Simple route aggregation
 * Library-First: Standard Express routing
 */

import { Router } from 'express'
import validateRouter from './validate'
import executeRouter from './execute'
import savedRouter from './saved'
import importRouter from './import'

const router = Router()

// Mount sub-routes
router.use('/validate', validateRouter)
router.use('/execute', executeRouter)
router.use('/saved', savedRouter)
router.use('/import', importRouter)

export default router
