"""
Convert REQUIREMENTS.md → styled HTML → PDF via WeasyPrint
"""
import re
import sys
from pathlib import Path
import weasyprint

BOOTS_BLUE   = '#05054B'
BOOTS_LIGHT  = '#0C0C88'
SUBHEAD      = '#1E3A8A'
RED          = '#DC2626'
AMBER        = '#D97706'
GREEN        = '#2E7D32'
MUTED        = '#6B7280'
BG_CODE      = '#1F2937'
FG_CODE      = '#E5E7EB'
BG_CODE_BODY = '#F8F9FA'
TABLE_HDR    = '#05054B'
TABLE_ALT    = '#F0F4FF'

CSS = f"""
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

@page {{
  size: A4;
  margin: 20mm 18mm 22mm 18mm;
  @bottom-right {{
    content: "Page " counter(page) " of " counter(pages);
    font-family: 'Inter', sans-serif;
    font-size: 8pt;
    color: {MUTED};
  }}
  @bottom-left {{
    content: "BLeaf Clinical Workforce Management — Product Requirements";
    font-family: 'Inter', sans-serif;
    font-size: 8pt;
    color: {MUTED};
  }}
}}

* {{ box-sizing: border-box; margin: 0; padding: 0; }}

body {{
  font-family: 'Inter', 'Calibri', Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.6;
  color: #1F2937;
  background: #fff;
}}

/* Cover page */
.cover {{
  page-break-after: always;
  min-height: 270mm;
  display: flex;
  flex-direction: column;
}}
.cover-header {{
  background: {BOOTS_BLUE};
  color: white;
  padding: 50mm 18mm 40mm;
  text-align: left;
}}
.cover-header .product-label {{
  font-size: 9pt;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.55);
  margin-bottom: 12mm;
}}
.cover-header h1 {{
  font-size: 28pt;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
  margin-bottom: 4mm;
  border: none;
  padding: 0;
  background: none;
}}
.cover-header .subtitle {{
  font-size: 14pt;
  color: rgba(255,255,255,0.7);
  font-weight: 400;
}}
.cover-body {{
  flex: 1;
  padding: 16mm 18mm;
}}
.cover-meta {{
  width: 100%;
  border-collapse: collapse;
  margin-top: 10mm;
}}
.cover-meta td {{
  padding: 4mm 6mm;
  font-size: 10pt;
  border-bottom: 1px solid #E5E7EB;
}}
.cover-meta td:first-child {{
  font-weight: 600;
  color: {BOOTS_BLUE};
  width: 35%;
  background: #F0F4FF;
}}
.cover-note {{
  margin-top: 16mm;
  padding: 4mm 6mm;
  background: #F0F4FF;
  border-left: 3px solid {BOOTS_LIGHT};
  font-size: 9pt;
  color: {MUTED};
}}

/* TOC */
.toc {{
  page-break-after: always;
  padding: 8mm 0;
}}
.toc h2 {{
  font-size: 16pt;
  color: {BOOTS_BLUE};
  border-bottom: 2px solid {BOOTS_BLUE};
  padding-bottom: 3mm;
  margin-bottom: 6mm;
}}
.toc ul {{ list-style: none; padding: 0; }}
.toc > ul > li {{ margin-bottom: 2mm; }}
.toc > ul > li > a {{
  font-size: 11pt;
  font-weight: 600;
  color: {BOOTS_BLUE};
  text-decoration: none;
}}
.toc ul ul {{ padding-left: 6mm; margin-top: 1mm; }}
.toc ul ul li {{ margin-bottom: 1mm; }}
.toc ul ul li a {{
  font-size: 9.5pt;
  color: #374151;
  text-decoration: none;
}}

/* Epic section headers */
h1 {{
  font-size: 18pt;
  font-weight: 700;
  color: #fff;
  background: {BOOTS_BLUE};
  padding: 5mm 6mm;
  margin: 10mm 0 5mm;
  page-break-before: always;
  border-radius: 3px;
}}
h1:first-of-type {{ page-break-before: avoid; }}

h2 {{
  font-size: 13pt;
  font-weight: 700;
  color: {BOOTS_BLUE};
  margin: 8mm 0 3mm;
  padding-bottom: 2mm;
  border-bottom: 2px solid #E0E7FF;
}}

h3 {{
  font-size: 11pt;
  font-weight: 700;
  color: {SUBHEAD};
  margin: 6mm 0 2mm;
}}

h4 {{
  font-size: 10.5pt;
  font-weight: 700;
  color: #374151;
  margin: 5mm 0 2mm;
}}

p {{ margin: 2mm 0 4mm; }}

/* Code blocks */
pre {{
  background: {BG_CODE};
  color: {FG_CODE};
  border-radius: 4px;
  margin: 4mm 0;
  overflow: hidden;
  page-break-inside: avoid;
}}
pre code {{
  display: block;
  padding: 4mm 5mm;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 8pt;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
}}
.code-lang {{
  background: #111827;
  color: #9CA3AF;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5pt;
  font-weight: 600;
  letter-spacing: 0.08em;
  padding: 1.5mm 5mm;
  text-transform: uppercase;
  display: block;
}}

/* Inline code */
code {{
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 8.5pt;
  background: #FEF2F2;
  color: #C7254F;
  padding: 0.5mm 1.5mm;
  border-radius: 2px;
}}
pre code {{ background: none; color: inherit; padding: 0; }}

/* Tables */
table {{
  width: 100%;
  border-collapse: collapse;
  margin: 4mm 0;
  font-size: 9.5pt;
  page-break-inside: avoid;
}}
thead tr {{
  background: {TABLE_HDR};
  color: #fff;
}}
thead th {{
  padding: 3mm 4mm;
  font-weight: 600;
  text-align: left;
}}
tbody tr:nth-child(even) {{ background: {TABLE_ALT}; }}
tbody tr:nth-child(odd)  {{ background: #fff; }}
td {{ padding: 2.5mm 4mm; border-bottom: 1px solid #E5E7EB; }}

/* Lists */
ul, ol {{
  padding-left: 6mm;
  margin: 2mm 0 4mm;
}}
li {{ margin-bottom: 1.5mm; line-height: 1.5; }}
li p {{ margin: 0; }}

/* Checkboxes */
li.task-item {{ list-style: none; }}
li.task-item input {{ margin-right: 2mm; }}

/* Blockquote / design decisions */
blockquote {{
  border-left: 3px solid #93C5FD;
  background: #EFF6FF;
  padding: 3mm 5mm;
  margin: 3mm 0;
  color: #1E40AF;
  font-style: normal;
  border-radius: 0 3px 3px 0;
}}

/* User story highlight */
.user-story {{
  background: #F0F9FF;
  border-left: 3px solid {BOOTS_LIGHT};
  padding: 3mm 5mm;
  margin: 3mm 0;
  font-style: italic;
  font-size: 10.5pt;
}}

/* AC section */
.ac-section {{
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 3px;
  padding: 3mm 5mm;
  margin: 3mm 0;
}}

strong {{ font-weight: 600; }}
em {{ font-style: italic; }}

hr {{
  border: none;
  border-top: 1px solid #E5E7EB;
  margin: 5mm 0;
}}

a {{ color: {BOOTS_LIGHT}; text-decoration: none; }}
"""

def md_to_html(md_text: str) -> str:
    """
    Very targeted Markdown → HTML converter focused on the REQUIREMENTS.md structure.
    We use the markdown library rather than roll our own.
    """
    try:
        import markdown
        from markdown.extensions.tables import TableExtension
        from markdown.extensions.fenced_code import FencedCodeExtension
        from markdown.extensions.codehilite import CodeHiliteExtension
        from markdown.extensions.toc import TocExtension

        html_body = markdown.markdown(
            md_text,
            extensions=[
                'tables',
                'fenced_code',
                'codehilite',
                'toc',
                'nl2br',
                'sane_lists',
                'attr_list',
            ],
            extension_configs={
                'codehilite': {
                    'css_class': 'highlight',
                    'linenums': False,
                    'guess_lang': True,
                },
                'toc': {
                    'title': 'Table of Contents',
                    'toc_depth': 3,
                },
            },
        )
        return html_body
    except ImportError:
        # Fallback: basic conversion
        return f'<pre>{md_text}</pre>'


def build_cover_html() -> str:
    return f"""
<div class="cover">
  <div class="cover-header">
    <div class="product-label">Boots Digital Health · Clinical Operations</div>
    <h1>BLeaf<br>Clinical Workforce<br>Management Tool</h1>
    <div class="subtitle">Product Requirements Document</div>
  </div>
  <div class="cover-body">
    <table class="cover-meta">
      <tr><td>Document Type</td><td>Product Requirements Document</td></tr>
      <tr><td>Version</td><td>1.0 &mdash; Prototype → Production</td></tr>
      <tr><td>Date</td><td>June 2026</td></tr>
      <tr><td>Technology Stack</td><td>TypeScript &nbsp;·&nbsp; Node.js &nbsp;·&nbsp; Python</td></tr>
      <tr><td>Audience</td><td>Development team, QA, Product</td></tr>
      <tr><td>Status</td><td>Draft for review</td></tr>
    </table>
    <div class="cover-note">
      Generated from a working prototype. All code snippets are executable TypeScript, Python, or Node.js.
      Screenshots and wireframes are available in the live demo linked in each epic.
    </div>
  </div>
</div>
"""


def postprocess_html(html: str) -> str:
    """Apply custom classes to specific HTML patterns."""
    # Wrap fenced code blocks so we can add a language header
    def add_lang_label(m):
        classes = m.group(1) or ''
        lang = ''
        lm = re.search(r'language-(\w+)', classes)
        if lm:
            lang = lm.group(1).upper()
        code = m.group(2)
        return f'<pre><span class="code-lang">{lang}</span><code class="{classes}">{code}</code></pre>'

    html = re.sub(r'<pre><code class="([^"]*)">(.*?)</code></pre>',
                  add_lang_label, html, flags=re.DOTALL)

    return html


def build_pdf(md_path: str, output_path: str):
    md_text = Path(md_path).read_text(encoding='utf-8')

    # Remove the "Table of Contents" section from the markdown
    # (markdown library generates its own)
    md_text = re.sub(r'^## Table of Contents.*?(?=\n## |\n# )',
                     '', md_text, flags=re.DOTALL | re.MULTILINE)

    html_body = md_to_html(md_text)
    html_body = postprocess_html(html_body)

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
{CSS}
</style>
</head>
<body>
{build_cover_html()}
{html_body}
</body>
</html>
"""

    # Write intermediate HTML for inspection
    Path('/tmp/bleaf_req.html').write_text(full_html, encoding='utf-8')

    wp = weasyprint.HTML(string=full_html, base_url='/')
    wp.write_pdf(output_path)
    print(f'✅  PDF saved: {output_path}')


if __name__ == '__main__':
    build_pdf(
        md_path='/home/user/bleaf-demo/REQUIREMENTS.md',
        output_path='/home/user/bleaf-demo/BLeaf_Requirements.pdf',
    )
