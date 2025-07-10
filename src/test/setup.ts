import '@testing-library/jest-dom'

// Fix React.act compatibility for React 19
import { configure } from '@testing-library/react'
import { act } from 'react'

configure({ 
  testIdAttribute: 'data-testid',
  // Use React 19's act function
  getElementError: (message: string | null) => {
    const error = new Error(message || 'Element error')
    error.name = 'TestingLibraryElementError'
    return error
  }
})

// Global act for compatibility
if (typeof window !== 'undefined') {
  // @ts-expect-error - Adding global act for compatibility
  window.React = { act }
}
