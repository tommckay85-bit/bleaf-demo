"""
BLeaf Requirements — Bilingual PDF (English requirements + Italian translation per story)
All code blocks remain in English.
"""

from pathlib import Path
import weasyprint

BOOTS_BLUE  = '#05054B'
BOOTS_MID   = '#0C0C88'
SUBHEAD     = '#1E3A8A'
IT_BG       = '#F0F7FF'
IT_BORDER   = '#93C5FD'
IT_TEXT     = '#1E3A8A'
RED         = '#DC2626'
AMBER       = '#D97706'
GREEN       = '#2E7D32'
MUTED       = '#6B7280'
TABLE_ALT   = '#F0F4FF'
CODE_DARK   = '#1F2937'
CODE_LIGHT  = '#E5E7EB'

CSS = f"""
@page {{
  size: A4;
  margin: 18mm 16mm 22mm 16mm;
  @bottom-right {{
    content: "Pagina " counter(page) " di " counter(pages);
    font-family: 'Calibri', Arial, sans-serif;
    font-size: 8pt;
    color: {MUTED};
  }}
  @bottom-left {{
    content: "BLeaf Clinical Workforce Management — Requisiti di Prodotto";
    font-family: 'Calibri', Arial, sans-serif;
    font-size: 8pt;
    color: {MUTED};
  }}
}}

* {{ box-sizing: border-box; margin: 0; padding: 0; }}

body {{
  font-family: 'Calibri', Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.6;
  color: #1F2937;
}}

/* ── Cover ── */
.cover {{ page-break-after: always; }}
.cover-top {{
  background: {BOOTS_BLUE};
  padding: 44mm 16mm 36mm;
}}
.cover-eyebrow {{
  font-size: 8.5pt; font-weight: 700; letter-spacing: .18em;
  text-transform: uppercase; color: rgba(255,255,255,.45); margin-bottom: 10mm;
}}
.cover-title {{
  font-size: 30pt; font-weight: 700; color: #fff; line-height: 1.1; margin-bottom: 3mm;
}}
.cover-sub {{
  font-size: 14pt; color: rgba(255,255,255,.65);
}}
.cover-lang-badge {{
  display: inline-block; margin-top: 6mm;
  background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.25);
  border-radius: 20px; padding: 2mm 6mm;
  font-size: 9pt; color: rgba(255,255,255,.75); letter-spacing: .05em;
}}
.cover-body {{ padding: 12mm 0 0; }}
.cover-meta {{ width: 100%; border-collapse: collapse; }}
.cover-meta td {{
  padding: 3.5mm 5mm; font-size: 10pt; border-bottom: 1px solid #E5E7EB;
}}
.cover-meta td:first-child {{
  font-weight: 700; color: {BOOTS_BLUE}; width: 38%; background: {TABLE_ALT};
}}
.cover-note {{
  margin-top: 10mm; padding: 3.5mm 5mm;
  background: #FFFBEB; border-left: 3px solid {AMBER};
  font-size: 9pt; color: #78350F;
}}

/* ── Section (Epic) headers ── */
.epic-header {{
  page-break-before: always;
  padding: 5mm 6mm;
  color: #fff;
  border-radius: 3px;
  margin: 0 0 5mm;
}}
.epic-header h2 {{
  font-size: 17pt; font-weight: 700; margin: 0; color: #fff;
}}
.epic-header .epic-sub {{
  font-size: 10pt; opacity: .75; margin-top: 1mm;
}}

/* ── Section headings ── */
h2.section-h {{
  font-size: 14pt; font-weight: 700; color: {BOOTS_BLUE};
  border-bottom: 2px solid #DBEAFE;
  padding-bottom: 2mm; margin: 8mm 0 3mm;
}}
h3 {{
  font-size: 11.5pt; font-weight: 700; color: {SUBHEAD};
  margin: 6mm 0 2mm;
}}
h4 {{ font-size: 10.5pt; font-weight: 700; color: #374151; margin: 5mm 0 2mm; }}

p {{ margin: 1.5mm 0 4mm; }}

/* ── User story block ── */
.story-block {{
  border: 1.5px solid #DBEAFE;
  border-radius: 5px;
  margin: 5mm 0;
  page-break-inside: avoid;
  overflow: hidden;
}}
.story-header {{
  background: {BOOTS_BLUE}; color: #fff;
  padding: 2.5mm 5mm;
  font-size: 9pt; font-weight: 700; letter-spacing: .06em;
}}
.story-en {{
  padding: 3.5mm 5mm 4mm;
  font-size: 10.5pt;
  border-bottom: 1px solid #DBEAFE;
  font-style: italic;
  color: #1F2937;
}}
.story-en strong {{ font-style: normal; font-weight: 700; color: {BOOTS_BLUE}; font-size: 9pt; display: block; margin-bottom: 1mm; }}

/* Italian translation box */
.story-it {{
  padding: 3.5mm 5mm;
  background: {IT_BG};
  border-left: 3px solid {IT_BORDER};
  font-size: 10pt;
  color: {IT_TEXT};
  font-style: italic;
}}
.story-it .it-label {{
  font-style: normal; font-weight: 700; font-size: 8pt;
  text-transform: uppercase; letter-spacing: .1em;
  color: {MUTED}; display: block; margin-bottom: 1mm;
}}

/* ── Acceptance Criteria ── */
.ac-section {{ margin: 4mm 0; }}
.ac-title {{
  font-size: 9pt; font-weight: 700; color: #374151;
  text-transform: uppercase; letter-spacing: .08em; margin-bottom: 2mm;
}}
.ac-list {{ list-style: none; padding: 0; margin: 0; }}
.ac-list li {{
  display: flex; align-items: flex-start; gap: 3mm;
  padding: 1.5mm 0; border-bottom: 1px solid #F3F4F6;
  font-size: 10pt;
}}
.ac-list li:last-child {{ border-bottom: none; }}
.ac-check {{ color: {MUTED}; font-size: 11pt; flex-shrink: 0; line-height: 1.4; }}

/* Italian AC */
.ac-it {{ margin: 2mm 0 0; }}
.ac-it-title {{
  font-size: 8.5pt; font-weight: 700; color: {IT_TEXT};
  text-transform: uppercase; letter-spacing: .06em; margin-bottom: 1mm;
  display: flex; align-items: center; gap: 2mm;
}}
.ac-it-title::before {{ content: "🇮🇹"; font-size: 10pt; }}
.ac-it-list {{ list-style: none; padding: 0 0 0 3mm; margin: 0; }}
.ac-it-list li {{
  display: flex; align-items: flex-start; gap: 3mm;
  padding: 1mm 0;
  font-size: 9.5pt; color: {IT_TEXT};
  border-bottom: 1px solid #DBEAFE;
  font-style: italic;
}}
.ac-it-list li:last-child {{ border-bottom: none; }}

/* ── Code blocks ── */
.code-wrap {{ margin: 4mm 0; page-break-inside: avoid; }}
.code-lang {{
  background: #111827; color: #9CA3AF;
  font-family: 'Courier New', monospace;
  font-size: 7.5pt; font-weight: 700; letter-spacing: .1em;
  padding: 1.5mm 5mm; text-transform: uppercase;
}}
pre {{
  background: {CODE_DARK}; color: {CODE_LIGHT};
  padding: 4mm 5mm; margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 8pt; line-height: 1.55;
  white-space: pre-wrap; word-break: break-all;
  border-radius: 0 0 3px 3px;
}}
code {{
  font-family: 'Courier New', monospace;
  font-size: 8.5pt; background: #FEF2F2; color: #C7254F;
  padding: 0.3mm 1.5mm; border-radius: 2px;
}}
pre code {{ background: none; color: inherit; padding: 0; }}

/* ── Tables ── */
table {{ width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 9.5pt; page-break-inside: avoid; }}
thead tr {{ background: {BOOTS_BLUE}; color: #fff; }}
thead th {{ padding: 2.5mm 4mm; font-weight: 700; text-align: left; }}
tbody tr:nth-child(even) {{ background: {TABLE_ALT}; }}
td {{ padding: 2mm 4mm; border-bottom: 1px solid #E5E7EB; }}

/* ── Info boxes ── */
.design-note {{
  background: #FFFBEB; border-left: 3px solid {AMBER};
  padding: 3mm 5mm; margin: 3mm 0; font-size: 10pt; color: #78350F;
  border-radius: 0 3px 3px 0;
}}
.design-note strong {{ color: #92400E; }}

ul.body-list {{ padding-left: 5mm; margin: 2mm 0; }}
ul.body-list li {{ margin-bottom: 1.5mm; font-size: 10pt; }}

hr {{ border: none; border-top: 1px solid #E5E7EB; margin: 5mm 0; }}
"""

# ─── Content definitions ──────────────────────────────────────────────────────

EPICS = [
    {
        "num": 1,
        "title": "BODCON — Stato Operativo",
        "title_en": "BODCON Operational Status",
        "color": "#DC2626",
        "intro_en": "BODCON (Business Operations CONdition) is a 5-level operational risk rating visible at all times as a compact 46px banner at the top of the dashboard. It mirrors escalation frameworks used in emergency services.",
        "intro_it": "BODCON (Business Operations CONdition) è un sistema di valutazione del rischio operativo a 5 livelli, sempre visibile come banner compatto da 46px nella parte superiore della dashboard. Si ispira ai framework di escalation utilizzati nei servizi di emergenza.",
        "sections": [
            {
                "title": "3.1 BODCON Level Definitions / Definizioni dei Livelli BODCON",
                "html": """
<table>
<thead><tr><th>Livello</th><th>Etichetta</th><th>Descrizione EN</th><th>Descrizione IT</th><th>Trigger</th></tr></thead>
<tbody>
<tr><td>1</td><td>BODCON 1 🔴</td><td>Critical</td><td>Critico</td><td>≥4 red, or ≥3 red + ≥3 amber</td></tr>
<tr><td>2</td><td>BODCON 2 🟠</td><td>Severe</td><td>Grave</td><td>≥3 red, or ≥2 red + ≥3 amber, or ≥1 red + ≥6 amber</td></tr>
<tr><td>3</td><td>BODCON 3 🟡</td><td>Elevated</td><td>Elevato</td><td>≥2 red, or ≥6 amber, or ≥1 red + ≥3 amber</td></tr>
<tr><td>4</td><td>BODCON 4 🟡</td><td>Monitoring</td><td>Monitoraggio</td><td>≥1 red, or ≥3 amber</td></tr>
<tr><td>5</td><td>BODCON 5 🟢</td><td>Normal</td><td>Normale</td><td>≤2 amber, or all green</td></tr>
</tbody>
</table>""",
            },
            {
                "title": "3.2 RAG Status Formula",
                "html": """
<div class="design-note"><strong>Design decision:</strong> BODCON is driven by current queue only — not projected demand. Projected demand drives a separate, non-alarming advisory (amber ▲ in the banner). This prevents false escalations early in the day when queues are naturally building.<br><br>
<em>Decisione di design: BODCON si basa solo sulla coda corrente, non sulla domanda proiettata. La domanda proiettata genera un avviso consultivo separato e non allarmante (ambra ▲ nel banner). Questo evita false escalation all'inizio della giornata quando le code si stanno naturalmente formando.</em></div>
<div class="code-wrap"><div class="code-lang">Formula</div>
<pre>gap = requiredMins − availableMins

requiredMins = (pendingOrders × orderAHTMins) + (pendingMessages × messageAHTMins)
availableMins = allocatedPrescriberCount × 480   (8-hour prescribing day)

RAG:  gap ≤ 0       → GREEN   (capacity sufficient / capacità sufficiente)
      0 < gap ≤ 180 → AMBER   (up to 3 prescriber-hours behind / fino a 3h-prescrittore di ritardo)
      gap > 180     → RED     (more than 3 prescriber-hours behind / oltre 3h-prescrittore di ritardo)</pre></div>""",
            },
        ],
        "stories": [
            {
                "id": "US-BOD-01",
                "en": "As a <strong>Medical Manager</strong>, I want to see the current BODCON level at a glance at the top of the dashboard so that I immediately know the operational risk without having to read a dashboard in detail.",
                "it": "In qualità di <strong>Medical Manager</strong>, voglio vedere il livello BODCON corrente a colpo d'occhio nella parte superiore della dashboard, in modo da conoscere immediatamente il rischio operativo senza dover analizzare la dashboard nel dettaglio.",
                "ac_en": [
                    "BODCON badge is visible on every screen within the tool (not just the home dashboard)",
                    "Badge shows the numeric level (1–5) and a short description ('Normal operations', 'Elevated', etc.)",
                    "Background and border colour reflects severity: red (1), orange (2), amber (3/4), neutral (5)",
                    "Banner is exactly 46px tall — compact enough not to dominate the screen",
                    "Banner refreshes automatically when order/message/allocation state changes (no page reload required)",
                ],
                "ac_it": [
                    "Il badge BODCON è visibile in ogni schermata dello strumento (non solo nella dashboard principale)",
                    "Il badge mostra il livello numerico (1–5) e una breve descrizione ('Operazioni normali', 'Elevato', ecc.)",
                    "Il colore di sfondo e del bordo riflette la gravità: rosso (1), arancione (2), ambra (3/4), neutro (5)",
                    "Il banner è alto esattamente 46px — abbastanza compatto da non dominare lo schermo",
                    "Il banner si aggiorna automaticamente al variare dello stato di ordini/messaggi/allocazioni (senza ricaricare la pagina)",
                ],
                "code": None,
            },
            {
                "id": "US-BOD-02",
                "en": "As a <strong>Medical Manager</strong>, I want to see how many guardrails are red, amber, and green at a glance so that I understand which service areas are under pressure.",
                "it": "In qualità di <strong>Medical Manager</strong>, voglio vedere a colpo d'occhio quanti guardrail sono rossi, ambra e verdi, in modo da capire quali aree di servizio sono sotto pressione.",
                "ac_en": [
                    "Three RAG dot counters are always shown (🔴 N, 🟡 N, 🟢 N) even when count is 0",
                    "Counts update in real-time as orders arrive or prescribers are allocated",
                    "Clicking 'Details >' opens a modal with per-category breakdown: pending orders, messages, prescriber count, current RAG, and projected RAG badge if worse",
                ],
                "ac_it": [
                    "I tre contatori RAG (🔴 N, 🟡 N, 🟢 N) sono sempre visibili, anche quando il conteggio è 0",
                    "I conteggi si aggiornano in tempo reale all'arrivo di nuovi ordini o all'allocazione di prescrittori",
                    "Il pulsante 'Dettagli >' apre una finestra modale con il dettaglio per categoria: ordini in attesa, messaggi, numero prescrittori allocati, RAG corrente e badge RAG proiettato (se peggiore)",
                ],
                "code": None,
            },
            {
                "id": "US-BOD-03",
                "en": "As a <strong>Medical Manager</strong>, I want a projected pressure warning to appear when expected remaining order volume would breach capacity so that I can plan staffing proactively.",
                "it": "In qualità di <strong>Medical Manager</strong>, voglio che venga visualizzato un avviso di pressione proiettata quando il volume di ordini rimanenti previsto supererebbe la capacità disponibile, in modo da pianificare il personale in modo proattivo.",
                "ac_en": [
                    "Warning only appears when at least one category's projected RAG is worse than its current RAG",
                    "Warning text truncates with … if too long for the banner — full text shows on hover (title attribute)",
                    "'Details >' button is always visible and never obscured by the warning text",
                    "Warning is amber, not red — must not be confused with a current-state alert",
                    "Historical order volumes stored by service category and day-of-week (Sunday=0, Saturday=6)",
                ],
                "ac_it": [
                    "L'avviso appare solo quando il RAG proiettato di almeno una categoria è peggiore di quello corrente",
                    "Il testo dell'avviso viene troncato con … se troppo lungo — il testo completo è visibile al passaggio del mouse (attributo title)",
                    "Il pulsante 'Dettagli >' è sempre visibile e non viene mai nascosto dal testo dell'avviso",
                    "L'avviso è di colore ambra, non rosso — non deve essere confuso con un alert sullo stato corrente",
                    "I volumi storici degli ordini sono memorizzati per categoria di servizio e giorno della settimana (Domenica=0, Sabato=6)",
                ],
                "code": ("typescript", """const DAILY_ORDER_CONFIG = [
  { categoryId: 'womens-health',     expectedOrders: [1968, 2150, 1767, 1609, 1471, 1537, 1685] },
  { categoryId: 'weight-management', expectedOrders: [1801, 2035, 1886, 1890, 1896, 1967, 1535] },
  { categoryId: 'mens-health',       expectedOrders: [209,  311,  275,  259,  278,  263,  218]  },
  { categoryId: 'sexual-health',     expectedOrders: [340,  420,  380,  350,  320,  380,  410]  },
  { categoryId: 'dermatology',       expectedOrders: [311,  307,  318,  344,  343,  304,  287]  },
  { categoryId: 'mental-health',     expectedOrders: [120,  180,  165,  155,  150,  160,  130]  },
  { categoryId: 'general-health',    expectedOrders: [187,  280,  184,  185,  228,  194,  169]  },
]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]"""),
            },
        ],
    },

    {
        "num": 2,
        "title": "Riquadri di Capacità del Servizio",
        "title_en": "Service Capacity Tiles",
        "color": "#1565C0",
        "intro_en": "The main grid shows one tile per service category. Tiles are the central unit of workforce allocation — prescribers are dragged onto tiles and the tile's RAG indicator shows live capacity status.",
        "intro_it": "La griglia principale mostra un riquadro per ogni categoria di servizio. I riquadri sono l'unità centrale di allocazione del personale: i prescrittori vengono trascinati sui riquadri e l'indicatore RAG del riquadro mostra lo stato di capacità in tempo reale.",
        "sections": [
            {
                "title": "4.1 Tile Layout / Layout del Riquadro",
                "html": """<div class="code-wrap"><div class="code-lang">ASCII Layout</div><pre>┌─────────────────────────────────────┐  ← 3px RAG bar (top edge)
│ [Icon] Category Name     [badges]   │  ← Header
│        N services        N orders   │
├─────────────────────────────────────┤
│ [Avatar] Dr Name   ×               │  ← Prescriber rows (scrollable)
│ [Avatar] Dr Name   ×               │  ← maxHeight: 224px (~5 rows)
│ ┌ · · · + drop another · · · ┐    │
│ └───────────────────────────┘      │
│ ▼ Show all 8                        │  ← Expand toggle (when >4 allocated)
└─────────────────────────────────────┘</pre></div>""",
            },
        ],
        "stories": [
            {
                "id": "US-TIL-01",
                "en": "As a <strong>Resource Manager</strong>, I want to drag prescribers from the right-hand pool panel onto a service tile so that I can allocate them to handle that category's orders.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio trascinare i prescrittori dal pannello pool di destra su un riquadro di servizio, in modo da poterli allocare per gestire gli ordini di quella categoria.",
                "ac_en": [
                    "Prescriber card in pool panel is draggable",
                    "Valid drop targets (tiles where the prescriber is qualified) show a coloured dashed border on hover",
                    "Invalid drop targets (no matching service IDs) dim to 50% opacity and reject the drop",
                    "On successful drop, prescriber status changes from online → allocated",
                    "Prescriber can be dragged from one tile to another (moving, not duplicating)",
                    "Prescriber can be dragged back to the pool panel to deallocate (status reverts to online)",
                ],
                "ac_it": [
                    "La scheda del prescrittore nel pannello pool è trascinabile",
                    "I riquadri validi (dove il prescrittore è qualificato) mostrano un bordo tratteggiato colorato al passaggio del mouse",
                    "I riquadri non validi (senza service ID corrispondenti) si attenuano al 50% di opacità e rifiutano il rilascio",
                    "Al rilascio riuscito, lo stato del prescrittore cambia da online → allocated",
                    "Il prescrittore può essere trascinato da un riquadro a un altro (spostamento, non duplicazione)",
                    "Il prescrittore può essere trascinato di nuovo nel pannello pool per essere deallocato (lo stato torna a online)",
                ],
                "code": ("typescript", """// Regola di corrispondenza competenze / Skill matching rule
const canWork = category.serviceIds.some(sId => prescriber.serviceIds.includes(sId));"""),
            },
            {
                "id": "US-TIL-02",
                "en": "As a <strong>Resource Manager</strong>, I want tile prescriber lists to scroll internally when there are many allocations so that the tile height stays fixed and the drag-drop area remains usable regardless of team size.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio che la lista dei prescrittori nel riquadro scorra internamente in presenza di molte allocazioni, in modo che l'altezza del riquadro rimanga fissa e l'area di drag-and-drop resti utilizzabile indipendentemente dalla dimensione del team.",
                "ac_en": [
                    "Prescriber list within each tile has a maxHeight of 224px (~5 rows) and overflowY: auto",
                    "A '▼ Show all N' expand button appears when more than 4 prescribers are allocated",
                    "Clicking the toggle expands to show all prescribers; label changes to '▲ Show less'",
                    "The outer tile size does not force the page to scroll with many allocations",
                    "Drop zone ('+ drop another') remains visible at the bottom of the scrollable list",
                ],
                "ac_it": [
                    "La lista dei prescrittori in ogni riquadro ha una maxHeight di 224px (~5 righe) e overflowY: auto",
                    "Il pulsante '▼ Mostra tutti N' appare quando sono allocati più di 4 prescrittori",
                    "Il clic sul pulsante espande la lista; l'etichetta cambia in '▲ Mostra meno'",
                    "Le dimensioni esterne del riquadro non costringono la pagina a scorrere con molte allocazioni",
                    "La zona di rilascio ('+ trascina qui') rimane visibile in fondo alla lista scorrevole",
                ],
                "code": None,
            },
            {
                "id": "US-TIL-03",
                "en": "As a <strong>Resource Manager</strong>, I want to right-click a prescriber in a tile to move them to another tile or return them to the pool without drag-and-drop so that allocation is accessible and efficient.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio fare clic destro su un prescrittore in un riquadro per spostarlo in un altro riquadro o riportarlo nel pool, senza ricorrere al drag-and-drop, in modo che l'allocazione sia accessibile ed efficiente.",
                "ac_en": [
                    "Right-clicking a prescriber opens a context menu at cursor position",
                    "Menu shows: prescriber name header; 'Move to' section with eligible categories; '↩ Return to pool' action",
                    "Only categories where the prescriber has a matching service ID are shown as move targets",
                    "Clicking a move target moves the prescriber from the current tile to the target",
                    "Clicking outside the menu dismisses it without making changes",
                    "Context menu is position: fixed — never clipped by scrollable containers",
                ],
                "ac_it": [
                    "Il clic destro su un prescrittore apre un menu contestuale nella posizione del cursore",
                    "Il menu mostra: intestazione con nome; sezione 'Sposta in' con le categorie idonee; azione '↩ Ritorna al pool'",
                    "Vengono mostrate come destinazioni solo le categorie in cui il prescrittore ha un service ID corrispondente",
                    "Il clic su una destinazione sposta il prescrittore dal riquadro corrente a quello di destinazione",
                    "Un clic all'esterno del menu lo chiude senza apportare modifiche",
                    "Il menu contestuale è position: fixed — non viene mai tagliato da contenitori scorrevoli",
                ],
                "code": ("typescript", """// Calcolo destinazioni menu contestuale / Context menu target computation
const targets = SERVICE_CATEGORIES.filter(cat =>
  cat.id !== currentCategoryId &&
  cat.serviceIds.some(sId => prescriber.serviceIds.includes(sId))
);"""),
            },
            {
                "id": "US-TIL-04",
                "en": "As a <strong>Resource Manager</strong>, I want the tile to show a red, amber, or green indicator bar so that I can see which categories are under capacity pressure at a glance.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio che il riquadro mostri una barra indicatrice rossa, ambra o verde, in modo da vedere a colpo d'occhio quali categorie sono sotto pressione di capacità.",
                "ac_en": [
                    "3px bar at the top edge of each tile: green (#2E7D32), amber (#D97706), or red (#DC2626)",
                    "RAG status updates in real-time when orders arrive or prescribers are allocated/deallocated",
                    "Tile header badges show: pending order count (coloured by severity) and pending message count",
                ],
                "ac_it": [
                    "La barra da 3px al bordo superiore di ogni riquadro è: verde (#2E7D32), ambra (#D97706) o rossa (#DC2626)",
                    "Lo stato RAG si aggiorna in tempo reale all'arrivo di ordini o all'allocazione/deallocazione di prescrittori",
                    "I badge dell'intestazione mostrano: conteggio ordini in attesa (colorato per gravità) e conteggio messaggi in attesa",
                ],
                "code": None,
            },
        ],
    },

    {
        "num": 3,
        "title": "Gestione del Personale Prescrittore",
        "title_en": "Prescriber Workforce Management",
        "color": "#2E7D32",
        "intro_en": "Management of the prescriber pool: search, grouping, auto-allocation, and manual reset.",
        "intro_it": "Gestione del pool di prescrittori: ricerca, raggruppamento, auto-allocazione e reset manuale.",
        "sections": [],
        "stories": [
            {
                "id": "US-POOL-01",
                "en": "As a <strong>Resource Manager</strong>, I want to search for a prescriber by name in the right-hand panel so that I can quickly locate prescribers who may be hidden in a long scrollable tile.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio cercare un prescrittore per nome nel pannello di destra, in modo da individuare rapidamente i prescrittori che potrebbero essere nascosti in un lungo riquadro scorrevole.",
                "ac_en": [
                    "Search input filters all 55+ prescribers in real-time as the user types",
                    "Results show: avatar, name, role, and the category tile they are allocated to (in the category's colour)",
                    "If not allocated, their current status is shown (online, offline, on-break, etc.)",
                    "Search is case-insensitive and matches on partial name",
                    "A × button clears the search and returns to the standard pool view",
                    "Prescribers with status online remain draggable from search results",
                ],
                "ac_it": [
                    "Il campo di ricerca filtra tutti i 55+ prescrittori in tempo reale durante la digitazione",
                    "I risultati mostrano: avatar, nome, ruolo e il riquadro categoria a cui è allocato (nel colore della categoria)",
                    "Se non allocato, viene mostrato lo stato corrente (online, offline, in pausa, ecc.)",
                    "La ricerca non distingue maiuscole/minuscole e corrisponde anche a nomi parziali",
                    "Il pulsante × cancella la ricerca e torna alla visualizzazione pool standard",
                    "I prescrittori con stato online rimangono trascinabili dai risultati di ricerca",
                ],
                "code": None,
            },
            {
                "id": "US-POOL-02",
                "en": "As a <strong>Resource Manager</strong>, I want the pool panel to group prescribers into Available Pool, Scheduled, and Offline sections so that I can understand who is available to allocate.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio che il pannello pool raggruppi i prescrittori nelle sezioni Pool Disponibile, Pianificati e Non in servizio, in modo da capire chi è disponibile per l'allocazione.",
                "ac_en": [
                    "'Available Pool' — status online (draggable, full colour)",
                    "'Scheduled' — status scheduled (muted, not draggable, 'Sched' badge)",
                    "'Offline' — status offline (greyscale, 'Log in' button to set online)",
                    "When all online prescribers are allocated: shows 'All online prescribers allocated'",
                ],
                "ac_it": [
                    "'Pool Disponibile' — stato online (trascinabili, a colori)",
                    "'Pianificati' — stato scheduled (attenuati, non trascinabili, badge 'Sched')",
                    "'Non in servizio' — stato offline (in grigio, pulsante 'Accedi' per impostare online)",
                    "Quando tutti i prescrittori online sono allocati: mostra 'Tutti i prescrittori online sono allocati'",
                ],
                "code": None,
            },
            {
                "id": "US-POOL-03",
                "en": "As a <strong>Resource Manager</strong>, I want to click ⚡ Auto-allocate to distribute all available prescribers proportionally across service categories so that I don't have to manually allocate 50+ people every morning.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio fare clic su ⚡ Auto-alloca per distribuire tutti i prescrittori disponibili proporzionalmente tra le categorie di servizio, in modo da non dover allocare manualmente 50+ persone ogni mattina.",
                "ac_en": [
                    "All online/scheduled prescribers are allocated — nobody left in the pool after auto-allocation (unless no eligible category exists)",
                    "Prescribers distributed proportionally to each category's requiredMins (AHT × workload)",
                    "Categories with zero workload receive zero prescribers",
                    "Role/skill constraints respected — prescriber only allocated where canWork is true",
                    "After allocation, order priorityScore values are recomputed for all orders",
                ],
                "ac_it": [
                    "Tutti i prescrittori online/scheduled vengono allocati — nessuno rimane nel pool dopo l'auto-allocazione (a meno che non esista una categoria idonea)",
                    "I prescrittori vengono distribuiti proporzionalmente in base ai requiredMins di ogni categoria (AHT × carico di lavoro)",
                    "Le categorie con carico di lavoro zero non ricevono prescrittori",
                    "I vincoli di ruolo/competenza vengono rispettati — un prescrittore viene allocato solo dove canWork è true",
                    "Dopo l'allocazione, i valori priorityScore degli ordini vengono ricalcolati per tutti gli ordini",
                ],
                "code": ("typescript", """// Algoritmo auto-alloca / Auto-allocate algorithm
// Passo 1: Calcolo minuti richiesti per categoria
const workload = categories.map(cat => ({
  categoryId: cat.id,
  reqMins: pendingOrders[cat.id] * aht.orderMins + pendingMsgs[cat.id] * aht.msgMins,
}));

// Passo 2: Target proporzionali (ogni prescrittore assegnato esattamente una volta)
const n = available.length;
const totalReq = workload.reduce((s, w) => s + w.reqMins, 0);
let targets = workload.map(w => ({
  categoryId: w.categoryId,
  target: w.reqMins > 0 ? Math.max(1, Math.round(n * w.reqMins / totalReq)) : 0,
}));

// Passo 3: Normalizzare affinché sum(targets) === n
// Passo 4: Assegnare prescrittori idonei (filtrati per competenza) per target
// Passo 5: Assegnare prescrittori non ancora allocati alla categoria più adatta"""),
            },
            {
                "id": "US-POOL-04",
                "en": "As a <strong>Resource Manager</strong>, I want to clear all allocations with one click so that I can reset and re-allocate if the team changes at the start of a shift.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio cancellare tutte le allocazioni con un clic, in modo da poter reimpostare e riallocare il personale se il team cambia all'inizio di un turno.",
                "ac_en": [
                    "'Clear allocations' button returns all allocated prescribers to online status",
                    "All DayAllocation records reset to empty prescriberIds arrays",
                    "Action does not affect non-prescribing slots, breaks, or appointments",
                ],
                "ac_it": [
                    "Il pulsante 'Cancella allocazioni' riporta tutti i prescrittori allocati allo stato online",
                    "Tutti i record DayAllocation vengono reimpostati con array prescriberIds vuoti",
                    "L'azione non influisce sugli slot non prescrittori, sulle pause o sugli appuntamenti",
                ],
                "code": None,
            },
        ],
    },

    {
        "num": 4,
        "title": "Monitoraggio della Performance",
        "title_en": "Performance Monitoring",
        "color": "#6A1B9A",
        "intro_en": "The Performance Monitor is a 220px left-panel that automatically flags prescribers who are processing orders or messages significantly below the team average rate.",
        "intro_it": "Il Performance Monitor è un pannello sinistro da 220px che segnala automaticamente i prescrittori che elaborano ordini o messaggi significativamente al di sotto della media del team.",
        "sections": [
            {
                "title": "6.1 Flag Levels / Livelli di Segnalazione",
                "html": """<table>
<thead><tr><th>Flag</th><th>Colore</th><th>Trigger EN</th><th>Trigger IT</th></tr></thead>
<tbody>
<tr><td>🚨 Take Action</td><td>Rosso</td><td>Below threshold for ≥ actionHours</td><td>Sotto soglia per ≥ actionHours</td></tr>
<tr><td>⏸ Idle</td><td>Viola</td><td>No activity for ≥ idleMinutes</td><td>Nessuna attività per ≥ idleMinutes</td></tr>
<tr><td>👁 Watch</td><td>Ambra</td><td>Below threshold for ≥ watchHours</td><td>Sotto soglia per ≥ watchHours</td></tr>
</tbody>
</table>""",
            },
            {
                "title": "6.2 Computation Logic / Logica di Calcolo",
                "html": """<div class="code-wrap"><div class="code-lang">typescript</div><pre>const watchRate  = eventsInWatchWindow  / watchHours;    // eventi per ora
const actionRate = eventsInActionWindow / actionHours;   // eventi per ora

// Media del team = media delle frequenze nella watch-window, ESCLUDENDO gli zeri
// (così i prescrittori appena allocati non abbassano la media di base)
const avgRate = mean(stats.filter(s => s.watchRate > 0).map(s => s.watchRate));
const threshold = avgRate * (1 - slowRateThresholdPct / 100);

// Assegnazione flag / Flag assignment:
// isIdle && !(watchSlow && actionSlow)  → 'idle'
// watchSlow && actionSlow               → 'action'
// watchSlow only                        → 'watch'</pre></div>""",
            },
        ],
        "stories": [
            {
                "id": "US-PERF-01",
                "en": "As a <strong>Medical Manager</strong>, I want the Performance Monitor panel to automatically flag prescribers who are processing orders significantly below the team average so that I can identify if someone needs support.",
                "it": "In qualità di <strong>Medical Manager</strong>, voglio che il pannello Performance Monitor segnali automaticamente i prescrittori che elaborano ordini significativamente al di sotto della media del team, in modo da identificare se qualcuno ha bisogno di supporto.",
                "ac_en": [
                    "Panel refreshes every 30 seconds without user action",
                    "Flags only appear when there is a baseline average (at least one prescriber with activity data)",
                    "Each flag card shows: avatar, name, role, rate vs team average, and time below threshold",
                    "Sections ordered: Take Action first, then Idle, then Watch",
                    "Empty state: 'All prescribers on track' when no flags exist",
                ],
                "ac_it": [
                    "Il pannello si aggiorna ogni 30 secondi senza intervento dell'utente",
                    "Le segnalazioni appaiono solo quando esiste una media di base (almeno un prescrittore con dati di attività)",
                    "Ogni scheda di segnalazione mostra: avatar, nome, ruolo, frequenza vs media del team e tempo sotto soglia",
                    "Sezioni ordinate: prima 'Azione Richiesta', poi 'Inattivo', poi 'Osservazione'",
                    "Stato vuoto: 'Tutti i prescrittori in linea' quando non ci sono segnalazioni",
                ],
                "code": None,
            },
            {
                "id": "US-PERF-02",
                "en": "As a <strong>Medical Manager</strong>, I want to configure the performance thresholds so that the flags are appropriate for our service and team.",
                "it": "In qualità di <strong>Medical Manager</strong>, voglio configurare le soglie di performance, in modo che le segnalazioni siano adeguate al nostro servizio e al nostro team.",
                "ac_en": [
                    "⚙ gear icon opens a configuration modal",
                    "Four configurable fields: slow rate threshold (%), watch hours, take-action hours, idle minutes",
                    "Numeric inputs with min/max: threshold 5–80%, watch 0.25–4h, action 0.5–8h, idle 5–120min",
                    "Changes take effect immediately on save without page reload",
                ],
                "ac_it": [
                    "L'icona ⚙ apre una finestra modale di configurazione",
                    "Quattro campi configurabili: soglia frequenza lenta (%), ore osservazione, ore azione, minuti inattività",
                    "Input numerici con min/max: soglia 5–80%, osservazione 0,25–4h, azione 0,5–8h, inattività 5–120min",
                    "Le modifiche hanno effetto immediato al salvataggio, senza ricaricare la pagina",
                ],
                "code": None,
            },
        ],
    },

    {
        "num": 5,
        "title": "Agenda degli Appuntamenti",
        "title_en": "Appointment Diary",
        "color": "#00838F",
        "intro_en": "The Appointment Diary provides a calendar grid for the prescribing day (08:00–20:00) with columns per clinic type. Columns represent appointment types, not individual prescribers.",
        "intro_it": "L'Agenda degli Appuntamenti fornisce una griglia calendario per la giornata prescrittiva (08:00–20:00) con colonne per tipo di clinica. Le colonne rappresentano i tipi di appuntamento, non i singoli prescrittori.",
        "sections": [
            {
                "title": "7.1 Grid Structure / Struttura della Griglia",
                "html": """<ul class="body-list">
<li><strong>Time column / Colonna oraria:</strong> righe a slot da 30 minuti, 08:00–20:00 (24 slot)</li>
<li><strong>Clinic type columns / Colonne per tipo di clinica:</strong> una colonna per tipo (es. Visita Video, Revisione Asincrona, Clinica Telefonica)</li>
<li><strong>Cell height / Altezza cella:</strong> 44px per slot da 30 minuti</li>
<li><strong>Column width / Larghezza colonna:</strong> 180px per tipo di clinica</li>
</ul>""",
            },
        ],
        "stories": [
            {
                "id": "US-DIARY-01",
                "en": "As a <strong>Medical Manager</strong>, I want to see all today's appointments in a time-grid view so that I can understand prescriber capacity committed to appointments vs available for orders.",
                "it": "In qualità di <strong>Medical Manager</strong>, voglio vedere tutti gli appuntamenti di oggi in una vista a griglia oraria, in modo da capire la capacità dei prescrittori impegnata negli appuntamenti rispetto a quella disponibile per gli ordini.",
                "ac_en": [
                    "Grid renders all appointments for the current day",
                    "Appointments displayed in correct clinic type column and time slot",
                    "Multi-slot appointments (>30 min) visually span the correct number of rows",
                    "Break groups appear as coloured bands across all columns during the break period",
                    "Grid is horizontally scrollable if there are many clinic types",
                ],
                "ac_it": [
                    "La griglia mostra tutti gli appuntamenti del giorno corrente",
                    "Gli appuntamenti sono visualizzati nella colonna del tipo di clinica e nella fascia oraria corretti",
                    "Gli appuntamenti su più slot (>30 min) si estendono visivamente sul numero corretto di righe",
                    "I gruppi di pausa appaiono come bande colorate su tutte le colonne durante il periodo di pausa",
                    "La griglia è scorrevole orizzontalmente in presenza di molti tipi di clinica",
                ],
                "code": None,
            },
            {
                "id": "US-DIARY-02",
                "en": "As a <strong>Resource Manager</strong>, I want to click a time slot to add a new appointment so that I can schedule patient consultations.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio fare clic su una fascia oraria per aggiungere un nuovo appuntamento, in modo da pianificare le consultazioni dei pazienti.",
                "ac_en": [
                    "Clicking an empty slot opens New Appointment modal, pre-filled with clinic type and time",
                    "Required: patient reference (PT-XXXX format), prescriber, start time, duration",
                    "Prescriber dropdown shows only prescribers eligible for the clinic type (matching requiredRoles)",
                    "Duration defaults to the clinic type's defaultDurationMins (15–480 min, 15-min steps)",
                    "Saved appointment appears immediately in the grid",
                ],
                "ac_it": [
                    "Il clic su uno slot vuoto apre la finestra modale Nuovo Appuntamento, precompilata con tipo di clinica e orario",
                    "Obbligatori: riferimento paziente (formato PT-XXXX), prescrittore, orario di inizio, durata",
                    "Il menu prescrittore mostra solo i prescrittori idonei per il tipo di clinica (corrispondenti a requiredRoles)",
                    "La durata predefinita è defaultDurationMins del tipo di clinica (15–480 min, a passi di 15 min)",
                    "L'appuntamento salvato appare immediatamente nella griglia",
                ],
                "code": None,
            },
            {
                "id": "US-DIARY-03",
                "en": "As a <strong>Resource Manager</strong>, I want to click an existing appointment to edit or cancel it.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio fare clic su un appuntamento esistente per modificarlo o cancellarlo.",
                "ac_en": [
                    "Clicking a single appointment opens the Edit Appointment modal",
                    "Edit allows changing: patient ref, prescriber, start time, duration, status, notes",
                    "'Cancel appt' sets status to cancelled (removed from view, retained for audit)",
                    "'Delete' removes the appointment entirely",
                    "Multiple appointments at same slot show a count badge ('3 · click to expand')",
                    "Clicking the count badge opens an expanded popover listing all appointments in that slot",
                ],
                "ac_it": [
                    "Il clic su un singolo appuntamento apre la finestra modale Modifica Appuntamento",
                    "La modifica permette di cambiare: riferimento paziente, prescrittore, orario di inizio, durata, stato, note",
                    "'Annulla appuntamento' imposta lo stato su cancelled (rimosso dalla vista, conservato per audit)",
                    "'Elimina' rimuove completamente l'appuntamento",
                    "Più appuntamenti nello stesso slot mostrano un badge contatore ('3 · clicca per espandere')",
                    "Il clic sul badge del contatore apre un popover espanso che elenca tutti gli appuntamenti in quello slot",
                ],
                "code": None,
            },
            {
                "id": "US-DIARY-04",
                "en": "As a <strong>Resource Manager</strong>, I want to create and configure clinic types with custom colours and role requirements so that the diary reflects our actual appointment types.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio creare e configurare i tipi di clinica con colori personalizzati e requisiti di ruolo, in modo che l'agenda rifletta i nostri tipi di appuntamento reali.",
                "ac_en": [
                    "'+ Clinic Type' button opens the New Clinic Type modal",
                    "Required fields: name, colour (8 preset colours), default duration",
                    "Optional: required roles (multi-select: Pharmacist, Nurse, GP, Specialist)",
                    "Existing clinic types shown as clickable pills in the toolbar for editing",
                    "Clinic type colour appears as a 3px top border on the diary column header",
                ],
                "ac_it": [
                    "Il pulsante '+ Tipo Clinica' apre la finestra modale Nuovo Tipo Clinica",
                    "Campi obbligatori: nome, colore (8 colori preimpostati), durata predefinita",
                    "Facoltativo: ruoli richiesti (selezione multipla: Farmacista, Infermiere, Medico di Base, Specialista)",
                    "I tipi di clinica esistenti vengono mostrati come etichette cliccabili nella barra degli strumenti",
                    "Il colore del tipo di clinica appare come bordo superiore da 3px nell'intestazione della colonna dell'agenda",
                ],
                "code": None,
            },
        ],
    },

    {
        "num": 6,
        "title": "Priorità Ordini e Regole di Allocazione",
        "title_en": "Order Priority & Allocation Rules",
        "color": "#E65100",
        "intro_en": "Each order has a numeric priorityScore computed from base urgency, SLA proximity, and configurable allocation rules. Higher score = higher priority.",
        "intro_it": "Ogni ordine ha un priorityScore numerico calcolato in base all'urgenza di base, alla prossimità SLA e alle regole di allocazione configurabili. Punteggio più alto = priorità più alta.",
        "sections": [
            {
                "title": "8.1 Priority Score Calculation / Calcolo del Punteggio di Priorità",
                "html": """<div class="code-wrap"><div class="code-lang">typescript</div><pre>function computePriorityScore(order: Order, rules: AllocationRule[], slas: SLAConfig[]): number {
  let score = 0;

  // Punteggio urgenza base / Base urgency score
  score += order.urgency === 'critical' ? 80 : order.urgency === 'urgent' ? 40 : 0;

  // Prossimità SLA / SLA proximity
  const pctElapsed = (order.ageHours / sla.targetHours) * 100;
  if (pctElapsed >= sla.criticalThresholdPct) score += 60; // >85% trascorso
  else if (pctElapsed >= sla.warningThresholdPct) score += 30; // >60% trascorso

  // Regole configurabili / Configurable rules
  for (const rule of rules.filter(r => r.enabled)) {
    if (rule.action === 'boost')        score += rule.actionValue;
    if (rule.action === 'deprioritise') score -= rule.actionValue;
    if (rule.action === 'escalate')     score += 200; // In cima alla coda / Forces to top
  }
  return Math.max(0, score);
}</pre></div>
<table>
<thead><tr><th>ID</th><th>Nome / Name</th><th>Condizione / Condition</th><th>Azione / Action</th><th>Valore</th><th>Attivo</th></tr></thead>
<tbody>
<tr><td>rule-01</td><td>Critical Urgency Boost</td><td>urgency = critical</td><td>boost</td><td>+100</td><td>✅</td></tr>
<tr><td>rule-02</td><td>Urgent Order Boost</td><td>urgency = urgent</td><td>boost</td><td>+50</td><td>✅</td></tr>
<tr><td>rule-03</td><td>SLA Breach Risk</td><td>ageHours > 20</td><td>boost</td><td>+60</td><td>✅</td></tr>
<tr><td>rule-04</td><td>High Value Order</td><td>value > £60</td><td>boost</td><td>+20</td><td>✅</td></tr>
<tr><td>rule-05</td><td>Stale Order Flag</td><td>ageHours > 36</td><td>escalate</td><td>—</td><td>✅</td></tr>
<tr><td>rule-06</td><td>Routine Deprioritise</td><td>urgency = routine</td><td>deprioritise</td><td>-10</td><td>❌</td></tr>
</tbody>
</table>""",
            },
        ],
        "stories": [
            {
                "id": "US-RULE-01",
                "en": "As a <strong>Medical Manager</strong>, I want to configure allocation rules so that the system prioritises orders in line with our clinical policies.",
                "it": "In qualità di <strong>Medical Manager</strong>, voglio configurare le regole di allocazione, in modo che il sistema prioretizzi gli ordini in linea con le nostre politiche cliniche.",
                "ac_en": [
                    "Rules list shows all rules with: name, description, condition, action, enabled toggle",
                    "Rules can be enabled/disabled without deleting them",
                    "Rule fields: field (urgency/ageHours/value), operator (gt/lt/eq/gte/lte), value, action, actionValue",
                    "Changes to rules trigger re-scoring of all pending orders",
                    "escalate action adds 200 to the score (guarantees top of queue regardless of other rules)",
                ],
                "ac_it": [
                    "La lista delle regole mostra tutte le regole con: nome, descrizione, condizione, azione, toggle abilitato/disabilitato",
                    "Le regole possono essere abilitate/disabilitate senza eliminarle",
                    "Campi della regola: field (urgency/ageHours/value), operator (gt/lt/eq/gte/lte), value, action, actionValue",
                    "Le modifiche alle regole attivano il ricalcolo del punteggio di tutti gli ordini in attesa",
                    "L'azione escalate aggiunge 200 al punteggio (garantisce la posizione in cima alla coda)",
                ],
                "code": None,
            },
            {
                "id": "US-RULE-02",
                "en": "As a <strong>Medical Manager</strong>, I want to configure SLA targets per category so that the priority scoring reflects our service commitments.",
                "it": "In qualità di <strong>Medical Manager</strong>, voglio configurare gli obiettivi SLA per categoria, in modo che il punteggio di priorità rifletta i nostri impegni di servizio.",
                "ac_en": [
                    "Each category has configurable targetHours, warningThresholdPct, criticalThresholdPct",
                    "Default: warning at 60% elapsed, critical at 85% elapsed — both must be overridable",
                    "SLA configuration changes take effect immediately on existing orders",
                ],
                "ac_it": [
                    "Ogni categoria ha targetHours, warningThresholdPct, criticalThresholdPct configurabili",
                    "Predefinito: avviso al 60% del tempo trascorso, critico all'85% — entrambi devono poter essere modificati",
                    "Le modifiche alla configurazione SLA hanno effetto immediato sugli ordini esistenti",
                ],
                "code": None,
            },
        ],
    },

    {
        "num": 7,
        "title": "Gestione delle Pause",
        "title_en": "Break Management",
        "color": "#D97706",
        "intro_en": "Break groups allow batches of prescribers to be scheduled for breaks. The Apply Breaks button checks the current time and automatically removes prescribers from their tiles.",
        "intro_it": "I gruppi di pausa consentono di pianificare le pause per gruppi di prescrittori. Il pulsante Applica Pause controlla l'orario corrente e rimuove automaticamente i prescrittori dai loro riquadri.",
        "sections": [],
        "stories": [
            {
                "id": "US-BRK-01",
                "en": "As a <strong>Resource Manager</strong>, I want to define break groups (e.g. 'Morning break 10:00–10:15') so that I can schedule when batches of prescribers go on break.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio definire gruppi di pausa (es. 'Pausa mattina 10:00–10:15'), in modo da pianificare quando i gruppi di prescrittori vanno in pausa.",
                "ac_en": [
                    "Break groups have: name, start time, end time, colour, list of prescribers, enabled flag",
                    "Groups are configurable via the Diary view's toolbar",
                    "A break group can contain any subset of prescribers",
                    "Multiple groups can overlap in time (different cohorts, staggered breaks)",
                ],
                "ac_it": [
                    "I gruppi di pausa hanno: nome, orario di inizio, orario di fine, colore, lista di prescrittori, flag abilitato",
                    "I gruppi sono configurabili tramite la barra degli strumenti della vista Agenda",
                    "Un gruppo di pausa può contenere qualsiasi sottoinsieme di prescrittori",
                    "Più gruppi possono sovrapporsi nel tempo (coorti diverse con pause scaglionate)",
                ],
                "code": None,
            },
            {
                "id": "US-BRK-02",
                "en": "As a <strong>Resource Manager</strong>, I want to click '☕ Apply Breaks' to automatically move prescribers currently on break from their allocated tiles.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio fare clic su '☕ Applica Pause' per spostare automaticamente dai riquadri allocati i prescrittori attualmente in pausa.",
                "ac_en": [
                    "'Apply Breaks' checks current clock time against all enabled break groups",
                    "Prescribers within an active break window move from allocated → on-break",
                    "Prescribers on break are removed from their category tile's prescriberIds",
                    "If no break groups are currently active, the action has no effect",
                    "Break status is transient — prescribers can be manually re-allocated after break",
                ],
                "ac_it": [
                    "'Applica Pause' confronta l'orario corrente con tutti i gruppi di pausa abilitati",
                    "I prescrittori in una finestra di pausa attiva vengono spostati da allocated → on-break",
                    "I prescrittori in pausa vengono rimossi dai prescriberIds del loro riquadro categoria",
                    "Se nessun gruppo di pausa è attivo, l'azione non ha effetto",
                    "Lo stato di pausa è transitorio — i prescrittori possono essere riallocati manualmente dopo la pausa",
                ],
                "code": ("typescript", """// Logica applicazione pause / Break application logic
function applyBreaks(state: State): State {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const activeBreaks = state.breakGroups.filter(bg => {
    if (!bg.enabled) return false;
    const start = timeToMins(bg.startTime);
    const end   = timeToMins(bg.endTime);
    return nowMins >= start && nowMins < end;
  });

  const prescriberIdsToBreak = new Set(activeBreaks.flatMap(bg => bg.prescriberIds));

  // Sposta solo i prescrittori attualmente allocated
  // (non influisce su stati non-prescribing o in-appointment)
  return {
    ...state,
    allocations: state.allocations.map(a => ({
      ...a,
      prescriberIds: a.prescriberIds.filter(id => !prescriberIdsToBreak.has(id)),
    })),
    prescribers: state.prescribers.map(p =>
      prescriberIdsToBreak.has(p.id) && p.status === 'allocated'
        ? { ...p, status: 'on-break', allocatedCategoryId: undefined }
        : p
    ),
  };
}"""),
            },
        ],
    },

    {
        "num": 8,
        "title": "Pool Non Prescrittori",
        "title_en": "Non-Prescribing Pool",
        "color": "#374151",
        "intro_en": "The Non-Prescribing tile tracks prescribers who are temporarily unavailable for clinical work due to admin, training, meetings, or lunch.",
        "intro_it": "Il riquadro Non Prescrittori tiene traccia dei prescrittori temporaneamente non disponibili per l'attività clinica a causa di attività amministrative, formazione, riunioni o pausa pranzo.",
        "sections": [],
        "stories": [
            {
                "id": "US-NP-01",
                "en": "As a <strong>Resource Manager</strong>, I want to move a prescriber to the Non-Prescribing pool with a reason and optional note so that the team understands why they are unavailable.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio spostare un prescrittore nel pool Non Prescrittori con una motivazione e una nota opzionale, in modo che il team capisca perché non è disponibile.",
                "ac_en": [
                    "Non-prescribing tile accepts drag-drop from the pool panel or any category tile",
                    "On drop, a modal opens to select prescriber (if not set) and reason",
                    "Reasons: Admin, Training, Meeting, Lunch, Other",
                    "Optional free-text note (e.g. 'Team all-hands')",
                    "'+' button on the tile opens the same modal without requiring a drag",
                    "Prescriber removed from any category tile allocation when moved to non-prescribing",
                    "Prescriber status becomes non-prescribing",
                ],
                "ac_it": [
                    "Il riquadro non prescrittori accetta il drag-and-drop dal pannello pool o da qualsiasi riquadro categoria",
                    "Al rilascio, si apre una finestra modale per selezionare il prescrittore (se non impostato) e la motivazione",
                    "Motivazioni: Amministrazione, Formazione, Riunione, Pranzo, Altro",
                    "Nota in testo libero opzionale (es. 'Assemblea del team')",
                    "Il pulsante '+' sul riquadro apre la stessa finestra modale senza richiedere un trascinamento",
                    "Il prescrittore viene rimosso dall'allocazione del riquadro categoria quando spostato ai non prescrittori",
                    "Lo stato del prescrittore diventa non-prescribing",
                ],
                "code": None,
            },
            {
                "id": "US-NP-02",
                "en": "As a <strong>Resource Manager</strong>, I want to return a prescriber from non-prescribing back to the available pool via the × button on their card.",
                "it": "In qualità di <strong>Resource Manager</strong>, voglio riportare un prescrittore dai non prescrittori al pool disponibile tramite il pulsante × sulla loro scheda.",
                "ac_en": [
                    "Each prescriber card in the non-prescribing tile has a × button",
                    "Clicking × sets the prescriber back to online status and removes their NonPrescribingSlot",
                    "The prescriber immediately appears in the pool panel's 'Available Pool' section",
                ],
                "ac_it": [
                    "Ogni scheda prescrittore nel riquadro non prescrittori ha un pulsante ×",
                    "Il clic su × riporta il prescrittore allo stato online e rimuove il suo NonPrescribingSlot",
                    "Il prescrittore appare immediatamente nella sezione 'Pool Disponibile' del pannello pool",
                ],
                "code": None,
            },
        ],
    },
]


def escape(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;') \
            .replace('"', '&quot;').replace("'", '&#39;')


def render_story(s):
    code_html = ''
    if s['code']:
        lang, src = s['code']
        code_html = f'''<div class="code-wrap">
  <div class="code-lang">{lang}</div>
  <pre><code>{escape(src)}</code></pre>
</div>'''

    ac_en_items = ''.join(
        f'<li><span class="ac-check">☐</span> {item}</li>'
        for item in s['ac_en']
    )
    ac_it_items = ''.join(
        f'<li><span class="ac-check">☐</span> {item}</li>'
        for item in s['ac_it']
    )

    return f'''
<div class="story-block">
  <div class="story-header">{s["id"]}</div>
  <div class="story-en"><strong>🇬🇧 English</strong>{s["en"]}</div>
  <div class="story-it"><span class="it-label">🇮🇹 Traduzione italiana</span>{s["it"]}</div>
</div>

<div class="ac-section">
  <div class="ac-title">🇬🇧 Acceptance Criteria</div>
  <ul class="ac-list">{ac_en_items}</ul>

  <div class="ac-it" style="margin-top:4mm;">
    <div class="ac-it-title">Criteri di Accettazione</div>
    <ul class="ac-it-list">{ac_it_items}</ul>
  </div>
</div>

{code_html}
<hr>
'''


def render_epic(e):
    color = e['color']
    sections_html = ''.join(
        f'<h3>{sec["title"]}</h3>{sec["html"]}'
        for sec in e['sections']
    )
    stories_html = ''.join(render_story(s) for s in e['stories'])

    return f'''
<div class="epic-header" style="background:{color};">
  <h2>Epic {e["num"]} — {e["title"]}</h2>
  <div class="epic-sub">{e["title_en"]}</div>
</div>

<p>{e["intro_en"]}</p>
<p style="color:{color};font-style:italic;font-size:10pt;">{e["intro_it"]}</p>

{sections_html}

<h2 class="section-h">User Stories</h2>
{stories_html}
'''


def build_cover():
    return '''
<div class="cover">
  <div class="cover-top">
    <div class="cover-eyebrow">Boots Digital Health · Clinical Operations</div>
    <div class="cover-title">BLeaf<br>Clinical Workforce<br>Management Tool</div>
    <div class="cover-sub">Requisiti di Prodotto — Product Requirements</div>
    <div class="cover-lang-badge">🇬🇧 English Requirements &nbsp;·&nbsp; 🇮🇹 Traduzione Italiana</div>
  </div>
  <div class="cover-body">
    <table class="cover-meta">
      <tr><td>Tipo Documento / Document Type</td><td>Product Requirements Document (bilingue)</td></tr>
      <tr><td>Versione / Version</td><td>1.0 — Prototype → Production</td></tr>
      <tr><td>Data / Date</td><td>Giugno / June 2026</td></tr>
      <tr><td>Stack tecnologico / Tech Stack</td><td>TypeScript · Node.js · Python</td></tr>
      <tr><td>Destinatari / Audience</td><td>Team di sviluppo, QA, Product</td></tr>
    </table>
    <div class="cover-note">
      <strong>Nota:</strong> Tutti i requisiti sono in inglese (lingua di riferimento del sistema). Sotto ogni user story e ogni elenco di criteri di accettazione è presente una traduzione italiana per il team di sviluppo. I blocchi di codice rimangono in inglese.<br>
      <strong>Note:</strong> All requirements are in English (the system's reference language). An Italian translation appears below each user story and acceptance criteria list. All code blocks remain in English.
    </div>
  </div>
</div>'''


def build_html():
    epics_html = ''.join(render_epic(e) for e in EPICS)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>{CSS}</style>
</head>
<body>
{build_cover()}
{epics_html}
</body>
</html>'''


def main():
    html = build_html()
    Path('/tmp/bleaf_bilingual.html').write_text(html, encoding='utf-8')
    out = '/home/user/bleaf-demo/BLeaf_Requirements_IT.pdf'
    weasyprint.HTML(string=html, base_url='/').write_pdf(out)
    print(f'✅  {out}')


if __name__ == '__main__':
    main()
