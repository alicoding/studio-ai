/**
 * TDD Tests to understand Claude's actual session structure
 * These tests will help us build proper session relationship tracking
 *
 * KISS: Start with actual session data to understand the structure
 * DRY: Extract reusable patterns once we understand them
 * SOLID: Build proper abstractions based on real data
 */

import { describe, it, expect } from 'vitest'
import { readFile, readdir } from 'fs/promises'
import path from 'path'
import os from 'os'

// Real session data from Claude Studio project
const CLAUDE_STUDIO_DIR = path.join(
  os.homedir(),
  '.claude/projects/-Users-ali-claude-swarm-claude-team-claude-studio'
)

// Session IDs from the actual project
const SESSION_IDS = {
  root: 'a07fd349-e78b-4d99-af0f-08eaa2261d3b', // Has 0 continuation markers
  continuation1: '7386247c-c858-440a-9f89-f4610c8bdf5d', // Has 5 continuation markers
  continuation2: 'e5f9351d-c3e6-4a8f-96e5-35fcbbeaf856', // Has 1 continuation marker
  latest: '13e92f08-cc91-46dd-b842-5c4865d2c271', // Has 21 continuation markers
}

describe('Claude Session Structure Analysis', () => {
  describe('Understanding JSONL Structure', () => {
    it('should identify what fields exist in session messages', async () => {
      const sessionFile = path.join(CLAUDE_STUDIO_DIR, `${SESSION_IDS.root}.jsonl`)
      const content = await readFile(sessionFile, 'utf-8')
      const lines = content.split('\n').filter((line) => line.trim())

      // First line is summary
      const summary = JSON.parse(lines[0])
      console.log('Summary line:', summary)
      expect(summary.type).toBe('summary')
      expect(summary).toHaveProperty('leafUuid')

      // Real messages start from line 2
      if (lines.length > 1) {
        const firstMessage = JSON.parse(lines[1])
        console.log('First message fields:', Object.keys(firstMessage))

        expect(firstMessage).toHaveProperty('parentUuid')
        expect(firstMessage).toHaveProperty('sessionId')
        expect(firstMessage).toHaveProperty('uuid')
        expect(firstMessage).toHaveProperty('timestamp')
        expect(firstMessage).toHaveProperty('type')
      }
    })

    it('should analyze continuation session structure', async () => {
      const sessionFile = path.join(CLAUDE_STUDIO_DIR, `${SESSION_IDS.latest}.jsonl`)
      const content = await readFile(sessionFile, 'utf-8')
      const lines = content.split('\n').filter((line) => line.trim())

      // Find the continuation message
      let continuationMessage = null
      for (const line of lines) {
        const msg = JSON.parse(line)
        if (msg.message?.content?.[0]?.text?.includes('This session is being continued from')) {
          continuationMessage = msg
          break
        }
      }

      expect(continuationMessage).toBeTruthy()
      console.log('Continuation message structure:', {
        parentUuid: continuationMessage.parentUuid,
        sessionId: continuationMessage.sessionId,
        hasPreviousSessionRef: continuationMessage.previousSessionId || 'NO EXPLICIT REFERENCE',
      })

      // Check if there's any reference to the previous session
      expect(continuationMessage.parentUuid).toBe(null) // First message has no parent
    })
  })

  describe('Finding Session Relationships', () => {
    it('should map how sessions reference each other', async () => {
      const sessions = []

      for (const [name, sessionId] of Object.entries(SESSION_IDS)) {
        const sessionFile = path.join(CLAUDE_STUDIO_DIR, `${sessionId}.jsonl`)
        const content = await readFile(sessionFile, 'utf-8')
        const lines = content.split('\n').filter((line) => line.trim())

        // Get last message
        const lastMessage = JSON.parse(lines[lines.length - 1])

        // Check for continuation text
        let hasContinuation = false
        let continuationCount = 0
        for (const line of lines) {
          if (line.includes('This session is being continued from')) {
            hasContinuation = true
            continuationCount++
          }
        }

        // Skip summary line, get first real message
        const firstRealMessage = lines.find((line) => {
          const msg = JSON.parse(line)
          return msg.type !== 'summary'
        })

        const parsedFirstMessage = firstRealMessage ? JSON.parse(firstRealMessage) : null

        sessions.push({
          name,
          sessionId,
          firstUuid: parsedFirstMessage?.uuid || 'no-uuid',
          lastUuid: lastMessage.uuid || 'no-uuid',
          hasContinuation,
          continuationCount,
          timestamp: parsedFirstMessage?.timestamp
            ? new Date(parsedFirstMessage.timestamp)
            : new Date(),
        })
      }

      // Sort by timestamp
      sessions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      console.log('Session timeline:')
      sessions.forEach((s) => {
        console.log(
          `${s.name}: ${s.sessionId.slice(0, 8)} - ${s.timestamp.toISOString()} - Continuations: ${s.continuationCount}`
        )
      })

      // Verify our understanding
      expect(sessions[0].continuationCount).toBe(0) // Root has no continuations
      expect(sessions[sessions.length - 1].continuationCount).toBeGreaterThan(0) // Latest has continuations
    })

    it('should check if last UUID of one session appears in next session', async () => {
      // Get sessions in chronological order
      const sessionFiles = await readdir(CLAUDE_STUDIO_DIR)
      const jsonlFiles = sessionFiles.filter((f) => f.endsWith('.jsonl'))

      const sessionData = await Promise.all(
        jsonlFiles.map(async (filename) => {
          const content = await readFile(path.join(CLAUDE_STUDIO_DIR, filename), 'utf-8')
          const lines = content.split('\n').filter((line) => line.trim())
          const firstMsg = JSON.parse(lines[0])
          const lastMsg = JSON.parse(lines[lines.length - 1])

          return {
            sessionId: filename.replace('.jsonl', ''),
            firstTimestamp: new Date(firstMsg.timestamp),
            lastUuid: lastMsg.uuid,
            firstMessage: firstMsg,
          }
        })
      )

      // Sort by timestamp
      sessionData.sort((a, b) => a.firstTimestamp.getTime() - b.firstTimestamp.getTime())

      // Check if any session references the previous session's last UUID
      for (let i = 1; i < sessionData.length; i++) {
        const prevSession = sessionData[i - 1]
        const currSession = sessionData[i]

        // Search current session for reference to previous session's last UUID
        const content = await readFile(
          path.join(CLAUDE_STUDIO_DIR, `${currSession.sessionId}.jsonl`),
          'utf-8'
        )

        const containsPrevUuid = content.includes(prevSession.lastUuid)
        console.log(
          `Session ${i}: ${currSession.sessionId.slice(0, 8)} references previous session's last UUID: ${containsPrevUuid}`
        )
      }
    })
  })

  describe('Understanding Continuation Patterns', () => {
    it('should analyze continuation message content for patterns', async () => {
      const sessionFile = path.join(CLAUDE_STUDIO_DIR, `${SESSION_IDS.latest}.jsonl`)
      const content = await readFile(sessionFile, 'utf-8')
      const lines = content.split('\n').filter((line) => line.trim())

      // Find all continuation messages
      const continuationMessages = []
      for (const line of lines) {
        const msg = JSON.parse(line)
        if (msg.message?.content?.[0]?.text?.includes('This session is being continued from')) {
          continuationMessages.push(msg)
        }
      }

      console.log(`Found ${continuationMessages.length} continuation messages`)

      // Analyze the first continuation for patterns
      if (continuationMessages.length > 0) {
        const firstContinuation = continuationMessages[0]
        const text = firstContinuation.message.content[0].text

        // Look for session ID references in the summary
        const sessionIdPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
        const foundIds = text.match(sessionIdPattern) || []

        console.log('Session IDs found in continuation text:', foundIds)

        // Check if the summary references specific session files
        const fileReferences = text.match(/\/[^\s]+\.jsonl/g) || []
        console.log('File references in continuation:', fileReferences)
      }
    })

    it('should determine actual parent-child relationships', async () => {
      // Strategy: Since Claude doesn't store explicit parent session IDs,
      // we need to infer relationships from:
      // 1. Temporal order (sessions created later are likely continuations)
      // 2. Continuation text presence
      // 3. Role/agent assignments
      // 4. Summary content references

      const sessions = await analyzeAllSessions()

      // Build relationship graph
      const relationships = []

      for (let i = 1; i < sessions.length; i++) {
        const prevSession = sessions[i - 1]
        const currSession = sessions[i]

        if (currSession.hasContinuation) {
          relationships.push({
            parent: prevSession.sessionId,
            child: currSession.sessionId,
            evidence: 'temporal_order_with_continuation',
          })
        }
      }

      console.log('Inferred relationships:', relationships)

      // Test our inference
      expect(relationships.length).toBeGreaterThan(0)
      expect(relationships[0].evidence).toBe('temporal_order_with_continuation')
    })
  })

  describe('Discovering True Session Relationships', () => {
    it('should extract referenced session IDs from continuation messages', async () => {
      // This test discovers the KEY to Claude's session relationships
      const sessionRelationships = new Map<string, string[]>()

      const sessionFiles = await readdir(CLAUDE_STUDIO_DIR)
      const jsonlFiles = sessionFiles.filter((f) => f.endsWith('.jsonl'))

      for (const filename of jsonlFiles) {
        const sessionId = filename.replace('.jsonl', '')
        const content = await readFile(path.join(CLAUDE_STUDIO_DIR, filename), 'utf-8')
        const lines = content.split('\n').filter((line) => line.trim())

        const referencedSessions: string[] = []

        for (const line of lines) {
          const msg = JSON.parse(line)

          // Look for continuation messages that reference other sessions
          if (msg.message?.content?.[0]?.text?.includes('This session is being continued from')) {
            const text = msg.message.content[0].text

            // Extract ALL session IDs mentioned in the continuation text
            const sessionIdPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
            const foundIds = text.match(sessionIdPattern) || []

            // These are the sessions this one continues from
            referencedSessions.push(...foundIds.filter((id: string) => id !== sessionId))
          }
        }

        if (referencedSessions.length > 0) {
          sessionRelationships.set(sessionId, [...new Set(referencedSessions)])
        }
      }

      console.log('Session parent-child relationships from continuation text:')
      for (const [child, parents] of sessionRelationships) {
        console.log(
          `${child.slice(0, 8)} continues from: ${parents.map((p) => p.slice(0, 8)).join(', ')}`
        )
      }

      // This reveals the true structure!
      expect(sessionRelationships.size).toBeGreaterThan(0)
    })
  })

  describe('Building Proper Session Groups', () => {
    it('should group sessions by actual relationships not assumptions', async () => {
      const sessions = await analyzeAllSessions()

      // Group by continuation chains
      const groups = new Map<string, any[]>()

      // Start with root sessions (no continuation)
      const rootSessions = sessions.filter((s) => !s.hasContinuation)

      for (const root of rootSessions) {
        const group = [root]

        // Find all sessions that come after this root chronologically
        const subsequentSessions = sessions.filter(
          (s) => s.timestamp > root.timestamp && s.hasContinuation
        )

        group.push(...subsequentSessions)
        groups.set(root.sessionId, group)
      }

      // Handle case where all sessions are continuations
      if (rootSessions.length === 0) {
        groups.set('all-continuations', sessions)
      }

      console.log(`Found ${groups.size} session groups`)
      for (const [key, group] of groups) {
        console.log(`Group ${key.slice(0, 8)}: ${group.length} sessions`)
      }

      // For Claude Studio, we expect 1 group since they're all related
      expect(groups.size).toBeLessThanOrEqual(2)
    })
  })
})

// Helper function to analyze all sessions
async function analyzeAllSessions() {
  const sessionFiles = await readdir(CLAUDE_STUDIO_DIR)
  const jsonlFiles = sessionFiles.filter((f) => f.endsWith('.jsonl'))

  const sessions = await Promise.all(
    jsonlFiles.map(async (filename) => {
      const sessionId = filename.replace('.jsonl', '')
      const content = await readFile(path.join(CLAUDE_STUDIO_DIR, filename), 'utf-8')
      const lines = content.split('\n').filter((line) => line.trim())

      let hasContinuation = false
      let continuationCount = 0
      let assignedRole = null

      for (const line of lines) {
        const msg = JSON.parse(line)

        // Check for continuation
        if (msg.message?.content?.[0]?.text?.includes('This session is being continued from')) {
          hasContinuation = true
          continuationCount++
        }

        // Check for role assignment
        if (msg.message?.content?.[0]?.text?.match(/@(\w+)/)) {
          const match = msg.message.content[0].text.match(/@(\w+)/)
          if (match) assignedRole = match[1]
        }
      }

      const firstMsg = JSON.parse(lines[0])

      return {
        sessionId,
        timestamp: new Date(firstMsg.timestamp),
        hasContinuation,
        continuationCount,
        assignedRole,
        messageCount: lines.length,
      }
    })
  )

  return sessions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}
