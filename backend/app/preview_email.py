"""Prints a sample code email as HTML, to check the template in a browser.

    python -m app.preview_email > preview.html          # verification email
    python -m app.preview_email reset > preview.html    # password reset email
"""

import base64
import sys

from .mailer import LOGO_CID, LOGO_FILE, render_code_email

if __name__ == "__main__":
    purpose = sys.argv[1] if len(sys.argv) > 1 else "verify"
    subject, _, html = render_code_email("482913", purpose, 10)
    if LOGO_FILE.is_file():  # browsers can't resolve cid: links; inline the logo instead
        data = base64.b64encode(LOGO_FILE.read_bytes()).decode()
        html = html.replace(f"cid:{LOGO_CID}", f"data:image/png;base64,{data}")
    print(f"<!-- Subject: {subject} -->")
    print(html)
