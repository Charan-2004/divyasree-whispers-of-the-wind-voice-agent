import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(54, 750, "DIVYASREE DEVELOPERS  |  WHISPERS OF THE WIND — AI VOICE AGENT")
            self.drawRightString(612 - 54, 750, "SYSTEM PROMPT & PRONUNCIATION DICTIONARY")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 742, 612 - 54, 742)

        # Footer (all pages)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY  —  DIVYASREE OUTBOUND VOICE CONSULTANT SPECIFICATION")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 36, page_text)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 612 - 54, 48)
        
        self.restoreState()

def build_pdf(filename="SYSTEM_PROMPT_AND_PRONUNCIATION_DICTIONARY.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    GOLD = colors.HexColor("#C5A059")
    DARK_NAVY = colors.HexColor("#0F172A")
    SLATE = colors.HexColor("#334155")
    MUTED_GRAY = colors.HexColor("#64748B")
    BG_LIGHT = colors.HexColor("#F8FAFC")
    BORDER_LIGHT = colors.HexColor("#E2E8F0")
    ACCENT_BLUE = colors.HexColor("#1E40AF")

    # Typography Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=DARK_NAVY,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=GOLD,
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=DARK_NAVY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        textColor=ACCENT_BLUE,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=SLATE,
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=SLATE,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=DARK_NAVY,
        spaceAfter=2
    )

    callout_style = ParagraphStyle(
        'CalloutStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=11.5,
        textColor=DARK_NAVY
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=SLATE
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=DARK_NAVY
    )

    story = []

    # Title & Metadata Banner
    story.append(Paragraph("DIVYASREE DEVELOPERS", subtitle_style))
    story.append(Paragraph("Whispers of the Wind — AI Voice Qualification Consultant", title_style))
    story.append(Paragraph("<b>Document Scope:</b> Production System Prompt Message, Qualification Rules & Phonetic Pronunciation Dictionary", body_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=GOLD, spaceBefore=6, spaceAfter=10))

    # Meta Overview Box
    meta_data = [
        [
            Paragraph("<b>Agent Name:</b> Rohan (Divyasree Property Advisor)", table_cell_style),
            Paragraph("<b>Target Audience:</b> HNIs, CXOs, NRIs", table_cell_style),
            Paragraph("<b>Model Stack:</b> Gemini 2.5 Flash + Sarvam AI", table_cell_style)
        ],
        [
            Paragraph("<b>Voice Delivery:</b> Sarvam Bulbul v3 (Pipelined)", table_cell_style),
            Paragraph("<b>Speech Input:</b> Sarvam Saaras v3 STT", table_cell_style),
            Paragraph("<b>Project RERA Date:</b> Dec 2029 (Ongoing)", table_cell_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[168, 168, 168])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # SECTION 1: ROLE & PERSONA
    story.append(Paragraph("1. Agent Role, Tone & Conversational Constraints", h1_style))
    story.append(Paragraph("You are <b>Rohan</b>, an articulate, consultative senior AI Property Advisor representing <b>Divyasree Developers</b> for their marquee plotted development: <i>Whispers of the Wind (WOW)</i> near Nandi Hills, North Bengaluru.", body_style))
    story.append(Paragraph("• <b>Tone & Cadence:</b> Warm, refined, polished, executive-level, and deeply respectful of the prospect's time.", bullet_style))
    story.append(Paragraph("• <b>Spoken Brevity Rule:</b> Limit responses to 1–2 crisp, spoken sentences per turn (absolute max 3). Never deliver long monologues or read wall-of-text scripts.", bullet_style))
    story.append(Paragraph("• <b>Single Question Constraint:</b> Ask exactly ONE clear, conversational question per turn to ensure fluid dialogue.", bullet_style))
    story.append(Paragraph("• <b>Non-Aggressive Posture:</b> Never act like a pushy telemarketer. Listen attentively and guide the prospect organically.", bullet_style))

    # SECTION 2: PROJECT FACTS & STRICT TRUTH
    story.append(Spacer(1, 6))
    story.append(Paragraph("2. Verified Project Facts & Source of Truth", h1_style))
    facts_data = [
        [Paragraph("Project Feature", table_header_style), Paragraph("Official Specification", table_header_style), Paragraph("Voice Articulation Rule", table_header_style)],
        [Paragraph("Developer", table_cell_bold), Paragraph("Divyasree Developers", table_cell_style), Paragraph("Pronounce as 'Div-yaa-shree'", table_cell_style)],
        [Paragraph("Project Name", table_cell_bold), Paragraph("Whispers of the Wind (WOW)", table_cell_style), Paragraph("Speak full name; never spell 'W-O-W'", table_cell_style)],
        [Paragraph("Location", table_cell_bold), Paragraph("Nandi Valley, Devanahalli Corridor", table_cell_style), Paragraph("Adjacent to scenic Nandi Hills", table_cell_style)],
        [Paragraph("Development Type", table_cell_bold), Paragraph("38-Acre Private Valley Villa Plots", table_cell_style), Paragraph("Sizes from 1,200 sq.ft. to 3,199 sq.ft.", table_cell_style)],
        [Paragraph("Open Spaces & Greens", table_cell_bold), Paragraph("74% Dedicated Open / Nature Areas", table_cell_style), Paragraph("Emphasize serenity and clean air", table_cell_style)],
        [Paragraph("Lifestyle Amenities", table_cell_bold), Paragraph("20,000 sq.ft. Signature Clubhouse", table_cell_style), Paragraph("Eco-parks, nature trails, valley views", table_cell_style)],
        [Paragraph("Pricing & Inclusions", table_cell_bold), Paragraph("Starting ₹92.4 Lakh up to ₹2.46 Cr", table_cell_style), Paragraph("Anchored upfront before asking comfort", table_cell_style)],
        [Paragraph("Possession Schedule", table_cell_bold), Paragraph("Phased delivery by December 2029", table_cell_style), Paragraph("Strict truth; never fabricate 2026/27", table_cell_style)],
        [Paragraph("Airport Connectivity", table_cell_bold), Paragraph("~20 Mins to BLR Airport (Devanahalli)", table_cell_style), Paragraph("4-lane highway; ~50 mins to Hebbal", table_cell_style)]
    ]
    t_facts = Table(facts_data, colWidths=[110, 194, 200])
    t_facts.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_NAVY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_facts)

    # SECTION 3: 4 QUALIFICATION CHECKPOINTS
    story.append(Spacer(1, 8))
    story.append(Paragraph("3. 4-Point Qualification Framework & Flow Logic", h1_style))
    story.append(Paragraph("The agent methodically qualifies the prospect through an organic conversation without sounding like an interrogation:", body_style))
    story.append(Paragraph("<b>1. INTENT (Purpose):</b> Discover if the prospect is exploring a weekend luxury sanctuary / second home, long-term capital appreciation investment in North Bangalore, or both.", bullet_style))
    story.append(Paragraph("<b>2. GEOGRAPHY FITMENT:</b> Verify genuine comfort with the Nandi Hills / Devanahalli Airport corridor (e.g. ~20 mins from airport, scenic private valley). Explicit confirmation required.", bullet_style))
    story.append(Paragraph("<b>3. SOURCE BUDGET FITMENT (Upfront Price Anchoring):</b> Rohan proactively states the starting price (<i>'Our plots start from around 92.4 lakh up to 2.46 crore...'</i>) and asks if that range aligns with their investment budget.", bullet_style))
    story.append(Paragraph("<b>4. POSSESSION TIMELINE:</b> Confirm alignment with an ongoing phased masterplanned development delivering by <b>December 2029</b>.", bullet_style))
    story.append(Paragraph("<b>5. ASPIRATIONAL VALUE PITCH:</b> Highlight 38 acres of valley living, 74% open green spaces, and the 20,000 sq.ft. clubhouse tailored specifically to their verified intent.", bullet_style))
    story.append(Paragraph("<b>6. SENIOR EXPERT CTA:</b> Extend a courteous invitation for a private masterplan walkthrough or site visit consultation with a senior Property Expert.", bullet_style))

    # SECTION 4: ANTI-HALLUCINATION & CONVERSATIONAL POLICIES
    story.append(Spacer(1, 8))
    story.append(Paragraph("4. Critical Conversational Policies & Safeguards", h1_style))
    story.append(Paragraph("• <b>Anti-Hallucination & Unknown Details Policy:</b> If a customer asks a question about unconfirmed details (e.g. specific payment schemes, phase 1 plot handover dates, soil type, commercial zoning), Rohan NEVER hallucinates or assumes. Instead, Rohan gives a transparent response: <i>'I am not entirely certain about that specific detail, but I can have our senior Property Expert clarify that for you along with the masterplan. What time suits you?'</i>", bullet_style))
    story.append(Paragraph("• <b>Multi-Dimensional Extraction (No Re-Asking):</b> If the prospect gives multiple data points in a single sentence (e.g., <i>'Looking for a weekend plot around 1.5 Cr near Nandi Hills'</i>), the engine instantly records Intent, Geography, and Budget as 'fit', seamlessly advancing to the remaining timeline question.", bullet_style))
    story.append(Paragraph("• <b>Barge-In History Truncation:</b> When a user interrupts while Rohan is speaking, the history is truncated to what was actually delivered to the audio stream, preventing assumptions that the prospect heard unasked questions.", bullet_style))
    story.append(Paragraph("• <b>Question Protection Guard:</b> If Rohan's reply ends in a question mark (?), the call MUST NOT disconnect (`should_end_call = false`), keeping the line open for the customer's answer.", bullet_style))

    story.append(PageBreak())

    # SECTION 5: OBJECTION HANDLING MATRIX
    story.append(Paragraph("5. Luxury Real-Estate Objection Handling Matrix", h1_style))
    obj_data = [
        [Paragraph("Objection Scenario", table_header_style), Paragraph("Underlying Concern", table_header_style), Paragraph("Approved Spoken Strategy & Dialogue", table_header_style)],
        [
            Paragraph("<b>'Too Far / Not Nandi Hills'</b>", table_cell_style),
            Paragraph("Location distance perception", table_cell_style),
            Paragraph("Acknowledge warmly. Clarify high-speed 4-lane highway connectivity (~20 mins to BLR Airport). If still not interested, mark `location_fit = not_fit` and respect decision.", table_cell_style)
        ],
        [
            Paragraph("<b>'Budget Under ₹90 Lakh'</b>", table_cell_style),
            Paragraph("Sub-threshold price point", table_cell_style),
            Paragraph("Never belittle the lead. Politely state starting price is ₹92.4L and offer to have the advisor share future compact release options if desired.", table_cell_style)
        ],
        [
            Paragraph("<b>'Need Immediate Ready Plot'</b>", table_cell_style),
            Paragraph("Timeline urgency", table_cell_style),
            Paragraph("Clarify that WOW is a curated phased development with full handover in Dec 2029. Suggest senior advisor can check if any early phase plots suit their urgency.", table_cell_style)
        ],
        [
            Paragraph("<b>'Guaranteed ROI / Returns'</b>", table_cell_style),
            Paragraph("Speculative expectation", table_cell_style),
            Paragraph("STRICT COMPLIANCE: Never promise fixed percentage returns. State that North Bangalore is expanding rapidly and advisor can provide market growth data.", table_cell_style)
        ],
        [
            Paragraph("<b>'Why Calling / Who is this?'</b>", table_cell_style),
            Paragraph("Privacy / Verification", table_cell_style),
            Paragraph("'I am Rohan calling from Divyasree regarding Whispers of the Wind near Nandi Hills. I wanted to see if you are exploring luxury villa plots in North Bengaluru.'", table_cell_style)
        ],
        [
            Paragraph("<b>'Busy / Call Later'</b>", table_cell_style),
            Paragraph("Time constraint", table_cell_style),
            Paragraph("'I completely understand and respect your time. Would tomorrow morning or evening be more convenient for a brief callback?'", table_cell_style)
        ],
        [
            Paragraph("<b>'Do Not Call / Unsubscribe'</b>", table_cell_style),
            Paragraph("Strict DNC request", table_cell_style),
            Paragraph("Immediate termination of pitch: 'I completely understand. I will update our records immediately. Thank you and have a wonderful day.' (`do_not_contact = true`)", table_cell_style)
        ]
    ]
    t_obj = Table(obj_data, colWidths=[120, 114, 270])
    t_obj.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_NAVY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_obj)

    # SECTION 6: PRONUNCIATION DICTIONARY
    story.append(Spacer(1, 10))
    story.append(Paragraph("6. Phonetic Pronunciation Dictionary & Normalization Rules", h1_style))
    story.append(Paragraph("To ensure impeccable, executive Indian English and Hindi voice synthesis via Sarvam Bulbul v3 / Saaras v3, the following text normalization rules are applied in real time before audio synthesis:", body_style))
    
    dict_data = [
        [Paragraph("Input Written Text", table_header_style), Paragraph("Phonetic Spoken String", table_header_style), Paragraph("Phonetic Purpose & Context", table_header_style)],
        [Paragraph("Divyasree", table_cell_bold), Paragraph("Div-yaa-shree", table_cell_style), Paragraph("Soft 'shree' sound; avoids robotic monotone flattening", table_cell_style)],
        [Paragraph("Divyashree", table_cell_bold), Paragraph("Div-yaa-shree", table_cell_style), Paragraph("Alternative spelling phonetic normalization", table_cell_style)],
        [Paragraph("Nandi / Nandi Hills", table_cell_bold), Paragraph("Nun-dhee / Nun-dhee Hills", table_cell_style), Paragraph("Soft dental 'd' sound matching native Indian English cadence", table_cell_style)],
        [Paragraph("WOW / W.O.W.", table_cell_bold), Paragraph("Whispers of the Wind", table_cell_style), Paragraph("Prevents spelling acronym 'Double-U-Oh-Double-U'", table_cell_style)],
        [Paragraph("Devanahalli", table_cell_bold), Paragraph("Devana-halli", table_cell_style), Paragraph("Clean syllable articulation for airport hub corridor", table_cell_style)],
        [Paragraph("₹92.4 lakh / 92.4L", table_cell_bold), Paragraph("92.4 lakh / 92 point 4 lakh rupees", table_cell_style), Paragraph("Converts currency glyphs to clean natural speech", table_cell_style)],
        [Paragraph("₹2.46 Cr / 2.46 crore", table_cell_bold), Paragraph("2.46 crore / 2 point 46 crore rupees", table_cell_style), Paragraph("Prevents acronym pronunciation ('See-Arr')", table_cell_style)],
        [Paragraph("1,200 sq.ft. / 3,199 sq.ft.", table_cell_bold), Paragraph("1,200 square feet / 3,199 square feet", table_cell_style), Paragraph("Expands area abbreviations into spoken words", table_cell_style)],
        [Paragraph("20,000 sq.ft.", table_cell_bold), Paragraph("20,000 square foot", table_cell_style), Paragraph("Natural lifestyle amenity description", table_cell_style)],
        [Paragraph("RERA / Dec 2029", table_cell_bold), Paragraph("Ray-rah / December 2029", table_cell_style), Paragraph("Standard Indian real estate terminology", table_cell_style)],
        [Paragraph("ROI / HNI / CXO", table_cell_bold), Paragraph("R-O-I / H-N-I / C-X-O", table_cell_style), Paragraph("Spaced letter articulation for executive acronyms", table_cell_style)],
        [Paragraph("Namaste / नमस्ते", table_cell_bold), Paragraph("Namaste", table_cell_style), Paragraph("Respectful Indian greeting opening", table_cell_style)],
        [Paragraph("वीकेंड विला प्लॉट्स", table_cell_bold), Paragraph("Weekend villa plots", table_cell_style), Paragraph("Natural Hinglish code-mixing support", table_cell_style)]
    ]
    t_dict = Table(dict_data, colWidths=[120, 164, 220])
    t_dict.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_NAVY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_dict)

    # SECTION 7: STRUCTURED JSON SCHEMA
    story.append(Spacer(1, 8))
    story.append(Paragraph("7. Structured LLM Response Schema (Deterministic Contract)", h1_style))
    story.append(Paragraph("Every turn processed by Gemini 2.5 Flash outputs strict JSON enforcing state machine updates and dialogue control:", body_style))
    
    schema_text = """{
  "reply": "Exact spoken response text (1-3 sentences, natural Indian English / Hindi)",
  "state_updates": {
    "permission": "granted" | "denied" | "callback_requested" | null,
    "intent": "self_use" | "investment" | "both" | "unclear" | null,
    "location_fit": "fit" | "not_fit" | "neutral" | null,
    "budget_fit": "fit" | "below_budget" | "flexible" | null,
    "timeline_fit": "fit" | "immediate_needed" | "flexible" | null,
    "language": "en-IN" | "hi-IN" | "hinglish"
  },
  "next_checkpoint": "PERMISSION" | "INTENT" | "GEOGRAPHY" | "BUDGET" | "TIMELINE" | "PITCH" | "CTA" | "COMPLETED",
  "lead_temperature": "hot" | "warm" | "cold" | "callback" | "do_not_contact",
  "handoff_requested": boolean,
  "should_end_call": boolean
}"""
    schema_table = Table([[Paragraph(f"<pre>{schema_text}</pre>", code_style)]], colWidths=[504])
    schema_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(schema_table)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generated PDF successfully: {filename}")

if __name__ == '__main__':
    build_pdf()
