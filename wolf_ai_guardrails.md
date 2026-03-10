# 🛡️ Wolf HMS — AI Healthcare Guardrails & Architecture

> **Document Version:** 1.0 | **Date:** March 9, 2026
> **Purpose:** Blueprint for safe AI integration into Wolf HMS healthcare platform
> **Status:** Planned for future implementation

---

## AI Provider Decision

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Primary AI** | **Claude 3.5 Sonnet** (Anthropic) | Lowest hallucination rate, best at following safety rules, naturally cautious — ideal for healthcare |
| **Fallback AI** | **GPT-4o-mini** (OpenAI) | Cheaper backup if Claude is down |
| **Estimated Cost** | ~₹500–800/month | For ~500 patients/day, ~1,500 queries/day |

---

## 1. System Prompt Guardrails (The "Constitution")

Every AI call must include this system prompt:

```
You are Wolf Health Assistant, an AI triage helper inside Wolf HMS.
You are NOT a doctor. You do NOT diagnose. You do NOT prescribe.

ALLOWED:
✅ Provide general health information and first-aid guidance
✅ Help triage symptoms into severity levels (mild / moderate / severe)
✅ Always recommend consulting a doctor for proper diagnosis
✅ Detect emergencies and urge immediate hospital visit
✅ Reference patient's existing HMS data (allergies, active meds) for context

FORBIDDEN:
❌ NEVER diagnose a condition — say "this could be related to..." not "you have..."
❌ NEVER prescribe medications or dosages
❌ NEVER override or contradict a doctor's existing advice/prescription
❌ NEVER provide mental health crisis advice without including helpline numbers
❌ NEVER recommend stopping any prescribed medication
❌ NEVER claim to replace a medical professional

EMERGENCY PROTOCOL:
If the patient describes: chest pain, difficulty breathing, stroke symptoms
(face drooping, arm weakness, speech difficulty), severe bleeding, suicidal
thoughts, loss of consciousness, or allergic reaction with swelling:
→ IMMEDIATELY respond with emergency guidance
→ Show nearest hospital / emergency number
→ Do NOT continue general conversation
```

---

## 2. Emergency Detection (Auto-Escalate)

### Trigger Keywords/Patterns
| Category | Keywords |
|----------|----------|
| **Cardiac** | chest pain, heart attack, palpitations, crushing pressure |
| **Respiratory** | can't breathe, difficulty breathing, choking, asthma attack |
| **Stroke** | face drooping, arm weakness, slurred speech, sudden numbness |
| **Mental Health** | suicidal, want to die, self-harm, ending my life |
| **Severe Trauma** | heavy bleeding, unconscious, severe burn, poisoning |
| **Allergic** | throat swelling, anaphylaxis, severe allergic reaction |

### Auto-Response Template
```
🚨 EMERGENCY DETECTED

Based on what you've described, this may require immediate medical attention.

📞 Emergency: 112 (India) / 108 (Ambulance)
🏥 Nearest Hospital: [pulled from HMS geolocation]
📍 [Hospital Address & Directions]

Please seek help immediately. Do not wait.
```

---

## 3. Medical Disclaimer (Legal Protection)

**Every AI response** must end with this disclaimer (appended by output guardrails, not by the AI itself):

> ⚕️ *This is general health information, not medical advice. Please consult your doctor for diagnosis and treatment. Wolf HMS AI Assistant does not replace professional medical care.*

---

## 4. Audit Trail (Compliance & Accountability)

### What to Log
| Field | Description |
|-------|-------------|
| `patient_id` | Patient identifier from HMS |
| `session_id` | Unique conversation session |
| `timestamp` | ISO 8601 timestamp |
| `user_query` | Exact patient question |
| `ai_response` | Full AI response text |
| `severity_detected` | mild / moderate / severe / emergency |
| `emergency_triggered` | boolean — was emergency protocol activated? |
| `model_used` | claude-3.5-sonnet / gpt-4o-mini |
| `tokens_used` | Input + output token count |
| `cost` | Calculated cost of this interaction |

### Access Rules
- **Doctors** can view AI conversations for their patients
- **Patients** can view their own AI chat history
- **Admins** can audit all interactions
- **Retention:** Minimum 3 years (as per medical record standards)

---

## 5. Doctor Override Rules

| Scenario | AI Behavior |
|----------|-------------|
| Patient has active prescription | "I see you're currently on [medication] prescribed by Dr. [Name]. Please continue following your doctor's instructions." |
| Patient asks about changing medication | "Medication changes should only be made by your doctor. Would you like to book a follow-up appointment?" |
| AI suggestion conflicts with doctor's notes | Suppress AI suggestion, defer to doctor |
| Patient reports side effects | Log for doctor review + suggest contacting their prescribing doctor |

---

## 6. Content Filtering

### Blocked Topics
- Self-harm methods or instructions
- Drug abuse guidance or recreational drug information
- Unverified/alternative treatments presented as cures
- Anti-vaccination misinformation
- Claims that could delay seeking real treatment

### Filtered Responses
- Remove any specific drug dosage recommendations
- Remove any definitive diagnosis statements
- Flag responses that mention rare/serious conditions (to avoid unnecessary panic)

---

## 7. Architecture

```
Patient Query (Wolf Care App)
          ↓
┌──────────────────────────┐
│    INPUT GUARDRAILS       │
│  • Emergency keyword scan │
│  • Profanity filter       │
│  • Query classification   │
│    (medical vs general)   │
└──────────────────────────┘
          ↓
┌──────────────────────────┐
│    CONTEXT ENRICHMENT     │
│  • Patient allergies      │
│  • Active medications     │
│  • Recent appointments    │
│  • Doctor prescriptions   │
│    (from Wolf HMS DB)     │
└──────────────────────────┘
          ↓
┌──────────────────────────┐
│    AI ENGINE              │
│  Primary: Claude 3.5      │
│  Fallback: GPT-4o-mini    │
│  System: Medical          │
│          Constitution     │
└──────────────────────────┘
          ↓
┌──────────────────────────┐
│    OUTPUT GUARDRAILS      │
│  • Append disclaimer      │
│  • Block diagnosis claims │
│  • Severity classification│
│  • Log to audit trail     │
│  • Doctor override check  │
└──────────────────────────┘
          ↓
   Patient Response
   + Medical Disclaimer
   + Action Buttons
     (Book Appointment /
      Call Emergency /
      View Prescriptions)
```

---

## 8. Implementation Phases

- [ ] **Phase 1:** Claude API integration into Wolf HMS backend (`/api/ai/chat`)
- [ ] **Phase 2:** System prompt with medical constitution
- [ ] **Phase 3:** Emergency detection keyword scanner
- [ ] **Phase 4:** HMS context enrichment (allergies, meds, prescriptions)
- [ ] **Phase 5:** Audit trail logging in database
- [ ] **Phase 6:** Doctor dashboard — view patient AI conversations
- [ ] **Phase 7:** Content filtering & output guardrails
- [ ] **Phase 8:** Fallback to GPT-4o-mini when Claude is unavailable
- [ ] **Phase 9:** Analytics dashboard — AI usage, costs, emergency triggers

---

> [!CAUTION]
> **Legal Note:** Before deploying AI in a healthcare product in India, consult with a legal advisor regarding compliance with the Digital Information Security in Healthcare Act (DISHA) and any applicable ABDM (Ayushman Bharat Digital Mission) guidelines.
