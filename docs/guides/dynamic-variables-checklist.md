# User Guide: Dynamic Prompt Variables & Synthesis (Live Checklist)

This guide documents the workflow for using the Studio Generator's variable engine. Mark steps as complete as you iterate on your prompt architecture.

## 🧬 1. Variable Insertion
Define the placeholders that will form the architecture of your prompt.
- [ ] **Type Variable Syntax**: Use `[NAME]` or `[NAME:DEFAULT]` directly in the Core Synthesis input.
- [ ] **Verify Detection**: Confirm the "Discovered Logic" zone in the Designer Sidebar shows your new variable.
- [ ] **Set Inline Defaults**: (Optional) Use the colon syntax to provide a fallback value immediately.

## ⚡ 2. Activation & Override
Move variables from "discovered" to "active" to enable value mapping.
- [ ] **Activate Entry**: Click the `[NAME] +` button in the sidebar to move it to **Active DNA**.
- [ ] **Set Live Value**: Enter a specific string in the variable's input field (e.g., "Neon Purple").
- [ ] **Verify Registry**: (Optional) Check the **Variable Vault** tab to see the master registry of all constants.

## 🌕 3. Interactive DNA Workflow
Toggle visual mode for rapid, click-based iteration.
- [ ] **Toggle Interactive ON**: Flip the "OFF: Interactive" switch to **ON**.
- [ ] **Review Pills**: Confirm that bracketed text in the prompt has transformed into interactive pills.
- [ ] **Pop-up Editing**: Click a Pill directly within the text to open the Edit Bubble.
- [ ] **Apply Changes**: Modify the value in the bubble and press **Enter** or click **Apply**.

## ✨ 4. Neural Weave & Pre-Flight
Finalize the prompt resolution before sending it to the generation units.
- [ ] **Check Synthesis Status**: If the DNA icon is pulsing, synthesis is required.
- [ ] **Click Weave**: Trigger the NanoBanana AI engine to resolve all variables and modifiers.
- [ ] **Review Resolved Text**: Look at **Compiled Pre-Flight** to see the final string (variables replaced).
- [ ] **Copy to Buffer**: (Optional) Use the copy icon in the header to grab the raw resolved string.
- [ ] **Launch Generation**: Click **Generate Units** to manifest your synthesis.

---
*Last Updated: 2026-03-05*
