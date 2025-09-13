# Fix: Task Assignment Not Working for Adi

## Problem Summary
Tasks created through the `/api/ingest-opus` endpoint are not being assigned to Adi when:
- User says "for me" or "my task"
- Tasks are created in the "Adi Rev Ops" board
- The system should assign to Adi but shows "⚠️ Assignee not found in database"

## Root Cause
The system has the wrong email address configured for Adi:
- **Currently configured**: `adi@opus.com`
- **Actual Asana email**: `atiwari@opusbehavioral.com`

## Files That Need Updating

### 1. opus-config.json (Line ~344)
Current:
```json
{
  "asana_id": "1211317165447198",
  "name": "Adi Rev Ops",
  "category": "department",
  "default_assignee": "adi@opus.com",  // ← WRONG EMAIL
  ...
}
```

Should be:
```json
{
  "asana_id": "1211317165447198",
  "name": "Adi Rev Ops",
  "category": "department",
  "default_assignee": "atiwari@opusbehavioral.com",  // ← CORRECT EMAIL
  ...
}
```

### 2. lib/ai/opus-client.ts (Line ~192)
Current:
```typescript
Assignment logic (use context to route, not to add content):
- Sales/demos/follow-ups → Gabriel (dlacap@opusbehavioral.com)
- Department heads → Appropriate head
- Strategic items → Adi (adi@opus.com)  // ← WRONG EMAIL
```

Should be:
```typescript
Assignment logic (use context to route, not to add content):
- Sales/demos/follow-ups → Gabriel (dlacap@opusbehavioral.com)
- Department heads → Appropriate head
- Strategic items → Adi (atiwari@opusbehavioral.com)  // ← CORRECT EMAIL
```

## Implementation Steps

### Step 1: Sync Asana Users (IMPORTANT - Do this first!)
Run the Asana sync script to ensure all users are in the database:
```bash
npm run sync:asana
```

This will pull all users from Asana including Adi's record with email `atiwari@opusbehavioral.com`.

### Step 2: Update opus-config.json
1. Open `opus-config.json`
2. Search for `"name": "Adi Rev Ops"`
3. Change `"default_assignee": "adi@opus.com"` to `"default_assignee": "atiwari@opusbehavioral.com"`

### Step 3: Update lib/ai/opus-client.ts
1. Open `lib/ai/opus-client.ts`
2. Search for `Strategic items → Adi`
3. Change `adi@opus.com` to `atiwari@opusbehavioral.com`

### Step 4: Test the Fix
Create a test task to verify assignment works:
```bash
curl -X POST http://localhost:3001/api/ingest-opus \
  -H "Authorization: Bearer sk-asana-op-7f3d4b2a9c1e5h8m2x4v7w9q3n6p8r5t" \
  -H "Content-Type: application/json" \
  -d '{"text": "Create a task for me in the RevOps board to test assignee fix"}'
```

Expected result in logs:
```
🔍 Looking up assignee: atiwari@opusbehavioral.com
✅ Found assignee ID: [some-id]
```

## Verification
After making these changes:
1. Tasks created "for me" should be assigned to Adi
2. Tasks in the "Adi Rev Ops" board should automatically assign to Adi
3. The logs should show successful assignee lookup for `atiwari@opusbehavioral.com`
4. In Asana, the task should show as assigned to Adi Tiwari

## Current Git Status
- Branch: `feature/fix-assignee-not-found`
- Previous work merged to main: Due time fixes and timezone handling
- This fix is isolated and ready to implement

## Notes
- The Asana sync script (`npm run sync:asana`) pulls users from Asana into the local database
- The assignee lookup happens in `app/api/ingest-opus/route.ts` at the `findAssigneeId` function
- The AI determines assignee based on the prompt context and opus-config.json settings
- When user says "for me" or "my task", it should resolve to the Adi Rev Ops board's default assignee