# Claude-EA Prototype-First TODO List

## Stage 1: Quick UI Mockup ✅ When All Checked

- [ ] Create basic HTML structure
  ```bash
  mkdir -p claude-ea/prototype
  cd claude-ea/prototype
  ```
- [ ] Create index.html with:
  - [ ] Sidebar for agent cards
  - [ ] Main chat area
  - [ ] Tab bar for projects
  - [ ] Message input with @mention preview
- [ ] Create styles.css:
  - [ ] Mobile-first responsive design
  - [ ] Agent card styling (status colors)
  - [ ] Collapsible sidebar
- [ ] Create mockup.js:
  - [ ] Mock agent data
  - [ ] Click interactions
  - [ ] Show different views
- [ ] Add mock terminal using xterm.js CDN
- [ ] Test on mobile browser
- [ ] **Review together: "Is this what you envisioned?"**

## Stage 2: Interactive Prototype ✅ When All Checked

- [ ] Add fake agent interactions:
  - [ ] Click agent card → route message
  - [ ] Type @a → show autocomplete
  - [ ] Show message queue
  - [ ] ESC to clear queue
- [ ] Add view toggles:
  - [ ] Single agent view
  - [ ] Split view (2 agents)
  - [ ] Grid view mockup
- [ ] Add status changes:
  - [ ] Online → Busy → Online
  - [ ] Token usage bar animation
- [ ] Add project tabs:
  - [ ] Switch between 2 mock projects
  - [ ] Different agents per project
- [ ] **Review: "Is this the right UX flow?"**

## Stage 3: Minimal Working Backend ✅ When All Checked

- [ ] Create simple Express server
- [ ] Add Socket.IO for real-time updates
- [ ] Create ONE working agent process:
  - [ ] Basic spawn with SDK
  - [ ] No IPC yet, just console output
  - [ ] Track PID properly
- [ ] Connect UI to backend:
  - [ ] Show real agent status
  - [ ] Send message to agent
  - [ ] See response in UI
- [ ] **Review: "Is this the right architecture?"**

## Stage 4: Core Features Only ✅ When All Checked

- [ ] Add IPC between 2 agents:
  - [ ] Simple socket communication
  - [ ] @mention routing
- [ ] Add process cleanup:
  - [ ] Kill process on shutdown
  - [ ] No zombies
- [ ] Add #team command:
  - [ ] Show active agents
- [ ] Add session tracking:
  - [ ] Save session ID
  - [ ] Resume on restart
- [ ] **Review: "Are the core features working?"**

## Stage 5: Scale to Full System ✅ When All Checked

- [ ] Refactor into library structure
- [ ] Add remaining commands
- [ ] Add team templates
- [ ] Add all UI features
- [ ] Polish and optimize

## Why Prototype First?

1. **Visual Alignment** - We both see the same thing
2. **UX Validation** - Test interactions before building
3. **Faster Feedback** - Changes are easier in mockups
4. **Risk Reduction** - Don't build the wrong thing
5. **Clear Vision** - Backend serves the UI, not vice versa

## Prototype Success Criteria

- [ ] You say "Yes, this is what I want!"
- [ ] Mobile UX feels good
- [ ] Core interactions are smooth
- [ ] We agree on the architecture
- [ ] The vision is clear

## Notes

- Start with static HTML/CSS/JS
- Use CDN versions of libraries (no build step)
- Focus on look and feel, not perfect code
- Mock data is fine
- Get feedback early and often
