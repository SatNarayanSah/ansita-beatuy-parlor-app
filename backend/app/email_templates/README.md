# Email templates

The verification and password-reset codes are sent with these files. Edit them freely;
restart the server to pick up changes.

- `code.html` — the designed email most people see. Keep styles inline and the table
  layout: Gmail and Outlook ignore `<style>` blocks and modern CSS layout.
- `code.txt` — plain-text version for mail apps that don't show HTML.

Placeholders (`$name`; write `$$` for a literal dollar sign):

| Placeholder | Value |
| --- | --- |
| `$code` | The 6-digit code |
| `$minutes` | Minutes until it expires |
| `$heading` | "Verify your email" or "Reset your password" |
| `$intro` | The sentence under the heading |
| `$brand` | `MAIL_FROM_NAME` |
| `$contact` | `MAIL_CONTACT`, or the sender address |
| `$logo` | An `<img>` of `MAIL_LOGO_URL`, or nothing (HTML only) |

The subject line, heading and intro for each kind of code are in `_PURPOSES` in
`app/mailer.py`.

Preview the email in a browser:

```
python -m app.preview_email > preview.html
```
