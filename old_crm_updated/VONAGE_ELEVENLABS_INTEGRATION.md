# VONAGE_ELEVENLABS_INTEGRATION.md 🔌 (INTEGRATION GUIDE)

**Ziel:** Telefonie über **Vonage** annehmen und die **ElevenLabs Agents/Voice** als „Sarah“ sprechen lassen.  
Dieses Dokument ist ein praxisnaher Leitfaden (ohne Secrets), den du in deiner Infrastruktur umsetzen kannst.

> Hinweis: APIs/Details können sich ändern. Prüfe die aktuellen Vonage- und ElevenLabs-Dokumentationen und passe Endpoints/Parameter entsprechend an.

---

## Architektur (High-Level)

```
Inbound Call (PSTN)
  -> Vonage Number
    -> Vonage Voice Webhook (NCCO / Call Control)
      -> Deine App (Webserver)
        -> ElevenLabs Agent (Dialog / TTS)
      <- Audio zurück (Stream/Play)
```

**Wichtigste Bausteine:**
- Vonage: Telefonnummer + Voice Application + Webhooks
- Dein Server: Webhook-Endpunkte (Answer/Event), Session-State, Audio-Brücke
- ElevenLabs: Agent/Voice Konfiguration, ggf. Streaming/TTS

---

## Voraussetzungen

- Vonage Account (Voice API aktiviert)
- Vonage Telefonnummer
- Vonage Voice Application (mit Webhook URLs)
- ElevenLabs Account + (optional) Agent-ID
- Öffentliche HTTPS-URL für deine Webhooks (z. B. via Reverse Proxy)

---

## Konfiguration (Environment Variablen)

> Keine Secrets committen. Nutze `.env.local` oder Secret Manager.

```bash
# Vonage
VONAGE_API_KEY="..."
VONAGE_API_SECRET="..."
VONAGE_APPLICATION_ID="..."
VONAGE_PRIVATE_KEY_PATH="/secure/path/private.key"

# ElevenLabs
ELEVENLABS_API_KEY="..."
ELEVENLABS_AGENT_ID="..."         # falls Agents genutzt werden
ELEVENLABS_VOICE_ID="..."         # falls klassische TTS Voice genutzt wird

# Public URL
PUBLIC_BASE_URL="https://your-domain.example"
```

---

## Vonage: Voice Application & Webhooks

In Vonage legst du eine **Voice Application** an und setzt:
- **Answer URL**: `PUBLIC_BASE_URL + /webhooks/vonage/answer`
- **Event URL**: `PUBLIC_BASE_URL + /webhooks/vonage/event`

### Answer Webhook (NCCO)
Beim „Answer“ erwartest du ein NCCO, das z. B.:
- eine Begrüßung abspielt oder
- direkt einen **Stream**/„connect“ zu deinem Audio/WS-Endpoint herstellt (je nach Vonage Feature/Plan).

Beispiel (konzeptionell):

```json
[
  {
    "action": "talk",
    "text": "Hallo, hier ist Sarah Hoffmann. Passt es gerade 30 Sekunden?"
  }
]
```

> Für echte Agent-Dialoge brauchst du typischerweise eine Audio-Brücke (Stream/WS) oder du spielst TTS-Antworten sequenziell ab, während du parallel Speech-to-Text verarbeitest. Welche Variante möglich ist, hängt von deinen Vonage/ElevenLabs Features ab.

---

## ElevenLabs: Agent vs. klassische TTS

### Option A: ElevenLabs Agent (Dialog-Engine)
**Pros:** Dialoglogik + Stil im Prompt, weniger eigener State.  
**Cons:** Integration hängt vom Agent-Interface (Audio/Text/Streaming) ab.

Empfehlung:
- Lege den Agenten „Solar-Beraterin Sarah“ in ElevenLabs an
- Nutze den Prompt aus `old_crm_updated/ELEVENLABS_TELESALES_AGENT_PROMPT.md`
- Lies Antworten als Audio aus und spiele sie im Call ab

### Option B: Eigene Dialoglogik + ElevenLabs TTS
**Pros:** Volle Kontrolle über Gesprächslogik/Policies.  
**Cons:** Mehr Engineering: STT, Turn-Taking, State, Rate Limiting.

---

## Turn-Taking (wer spricht wann?)

Damit Telefonate natürlich wirken, brauchst du eine klare Turn-Logik:
- **Listening Mode:** Nutzer spricht → STT transkribiert
- **Thinking Mode:** Prompt/Policy → Antwort generieren
- **Speaking Mode:** ElevenLabs TTS/Agent → Audio abspielen

**Praktische Regeln:**
- Warte nach Nutzer-Satzende ~600–900ms, bevor du antwortest (dein „Response Delay“).
- Kürze Antworten (1–2 Sätze), stelle 1 Frage pro Turn.
- Bei Overlap (Nutzer spricht während Sarah spricht): Audio stoppen und zurück in Listening.

---

## Webhook-Endpunkte (Server)

Du brauchst typischerweise:
- `POST /webhooks/vonage/answer` → liefert NCCO zurück
- `POST /webhooks/vonage/event` → Call-Events (answered, completed, dtmf, etc.)

Optional (wenn Streaming genutzt wird):
- `GET /webhooks/vonage/stream` oder `WS /webhooks/vonage/ws` → Audio rein/raus

### Session-State
Pro Call speicherst du minimal:
- `callId`
- `conversationId` (falls ElevenLabs Agent Sessions nutzt)
- zuletzt erkannte Nutzer-Intention/Phase (1–6)
- Timing (letzte Aktivität, Timeout)

---

## Sicherheit

- **Webhook-Validierung**: Prüfe, ob Requests von Vonage stammen (Signaturen/Headers, falls verfügbar).
- **Rate Limiting**: Schutz gegen Missbrauch.
- **PII-Minimierung**: Nur notwendige Daten loggen (kein Vollmitschnitt ohne Rechtsgrundlage).
- **Secrets**: nie im Repo, nur als Env/Secret Manager.

---

## Debugging-Checklist

- Kommt `answer` an? (HTTP 200, korrektes NCCO)
- Kommt `event` an? (Call Lifecycle sichtbar)
- Werden TTS/Agent Antworten erzeugt? (Logs, Status Codes)
- Klingt Audio sauber? (Format/Codec korrekt, Latenz ok)
- Abbruch/„Stop“-Wünsche werden respektiert? (sofort beenden)

---

## Minimaler Integrationsablauf (konzeptionell)

1. Call kommt rein → Vonage ruft `answer` auf  
2. Dein Server antwortet mit NCCO (z. B. kurzer „talk“ oder Stream connect)  
3. Nutzer spricht → STT (dein Service oder Provider)  
4. Text → ElevenLabs Agent (oder LLM + TTS)  
5. Audio → im Call abspielen  
6. Wiederholen, bis Termin vereinbart oder Nutzer stoppt

