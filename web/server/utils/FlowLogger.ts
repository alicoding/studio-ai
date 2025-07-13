/**
 * FlowLogger - Simple runtime flow documentation
 *
 * KISS: Tracks execution flows without complex instrumentation
 * Self-discovering: Logs actual execution paths as they happen
 */

export class FlowLogger {
  private static flows: Map<string, string[]> = new Map()
  private static enabled = process.env.LOG_FLOWS === 'true'

  /**
   * Log a step in a flow
   */
  static log(flowName: string, step: string): void {
    if (!this.enabled) return

    if (!this.flows.has(flowName)) {
      this.flows.set(flowName, [])
    }
    this.flows.get(flowName)!.push(`[${new Date().toISOString()}] ${step}`)
  }

  /**
   * Print a specific flow
   */
  static print(flowName: string): void {
    const flow = this.flows.get(flowName)
    if (!flow) {
      console.log(`No flow found: ${flowName}`)
      return
    }

    console.log(`\n📊 Flow: ${flowName}`)
    flow.forEach((step, i) => {
      console.log(`   ${i + 1}. ${step}`)
    })
  }

  /**
   * Print all flows
   */
  static printAll(): void {
    console.log('\n📊 All Recorded Flows:')
    this.flows.forEach((steps, flowName) => {
      console.log(`\n${flowName}:`)
      steps.forEach((step, i) => {
        console.log(`   ${i + 1}. ${step}`)
      })
    })
  }

  /**
   * Get flows as JSON
   */
  static toJSON(): Record<string, string[]> {
    const result: Record<string, string[]> = {}
    this.flows.forEach((steps, flowName) => {
      result[flowName] = steps
    })
    return result
  }

  /**
   * Clear all flows
   */
  static clear(): void {
    this.flows.clear()
  }

  /**
   * Enable/disable logging
   */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }
}
