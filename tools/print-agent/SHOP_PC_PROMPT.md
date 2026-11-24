# Prompt for Claude on the shop PC (the print station)

Paste everything in the box into Claude Code on the PC that's on the same network as the printers.
Automatic printing for new paid orders is switched OFF in /admin/settings ("Print a label for every paid
order"). Turn it on only after the tests below pass.
**Don't paste the secret key into the chat.** When Claude makes the settings file, open it yourself and type the
key in. It's `PRINT_AGENT_TOKEN`, in Vercel → Project → Settings → Environment Variables.

---

```text
Build and install a "print station" on this Windows PC. It connects my online store to the two printers on this
network. I'm not a developer, so explain each step in plain words and tell me exactly what to click when you need
me.

Why it's needed: the store runs in the cloud and can't reach printers on this private network. Opening the network
up would be unsafe (the Zebra's raw print port has no password). So this PC reaches OUT to the store over HTTPS,
asks for print jobs, prints them, and reports back. Nothing on this network is opened to the internet, and the
router isn't touched.

The store's side already exists and is live. You are building only the program on this PC, and it must follow the
store's job protocol below exactly. Put it in C:\PrintStation. Ask me before installing anything, and before
registering anything that starts automatically.

━━━ THE PRINTERS
- Labels: Zebra ZD421, 4x6 labels, network address 192.168.1.74, raw port 9100. It takes ZPL text directly over
  a plain TCP connection: no driver, no Windows printer needed.
- Receipts: Epson WF-7720, A4 paper, installed as a Windows printer on this PC. Find its exact Windows printer
  name with Get-Printer, and its network address from its printer port (Get-PrinterPort), and confirm both with
  me. Windows often says a network printer is "Normal" even when it's switched off, so also check its address
  answers (TCP 9100 or 631) before calling it ready.

━━━ THE STORE'S JOB PROTOCOL (already live, don't change it)
Base URL: https://www.midwesternpeptides.com
Every request sends the header:  Authorization: Bearer <PRINT_AGENT_TOKEN>

1. Claim jobs:  GET /api/print/jobs?ready=<printers that are up>
   - `ready` is a comma list of the printers that passed their checks this cycle: "label", "receipt", or
     "label,receipt". Leave out a printer that is off, so its jobs stay waiting instead of burning retries.
   - Response: { "jobs": [ { "id": "<uuid>", "kind": "order_label" | "test" | "order_receipt", "payload": "<string>" } ],
                 "printerHost": "<ip or empty>" }
   - Without ?ready=, the store hands out label jobs only (that's all older print agents understand), so always
     send it. Receipt jobs only exist once I switch on receipt printing in the store's settings.
   - kind "order_label" or "test", OR no kind field at all: payload is ZPL text, sent as-is to the Zebra.
   - kind "order_receipt": payload is a base64-encoded A4 PDF for the Epson.
   - Any other kind: don't print it; report it as failed with "unknown job kind <kind>".
   - printerHost: if not empty, it overrides the Zebra's address from the settings file (so I can fix the
     address from the store's admin without touching this PC).
   - Each job is handed out once. A claimed job that isn't acknowledged within 2 minutes goes back in the queue
     (that's why the "never print twice" record below matters). Up to 5 jobs per claim.
   - Every poll is also the station's check-in. If an order comes in and the station hasn't polled for 90
     seconds, the store emails me that the station is offline. No separate heartbeat is needed.
   - The store allows 240 requests a minute. Polling every 3 seconds is fine; never go faster than every 2.

2. Report results:  POST /api/print/jobs   with JSON
     { "printed": ["<id>", ...], "failed": [ { "id": "<id>", "error": "<reason, max 300 chars>" } ] }
   - A failed job is retried up to 5 claims, then marked failed, and the store emails me.
   - Write error reasons a person can act on: "Zebra: out of labels", "Epson unreachable".

3. Errors: 401 = wrong key (log it clearly and keep running). 429 = rate limited (wait for the Retry-After
   header's seconds). Anything else, or a network drop: log it and try again next cycle. Never crash or exit
   because of a bad poll.

━━━ WHAT TO BUILD
Every ~3 seconds:
1. Check each printer:
   - Zebra: open TCP 9100, send ~HS, and read the reply: three lines, each wrapped in STX (0x02) and ETX (0x03)
     characters, with comma-separated fields. On line 1, field 2 = paper out and field 3 = paused. On line 2,
     field 3 = head open and field 4 = ribbon out ("1" means yes). Test this against the real printer and print
     me the three lines, so we both see the parse is right. If any flag is set, the Zebra isn't ready, and the
     log says why ("Zebra: head open").
   - Epson: check its Windows printer status (offline, error, out of paper).
2. Claim jobs with ?ready= set to the printers that passed. Skip the claim if neither passed.
3. Print each job:
   - Label: send the ZPL bytes to the Zebra on port 9100.
   - Receipt: decode the PDF to a temporary file and print it to the Epson at A4 and 100% scale (no
     fit-to-page shrinking), silently, with no dialog. Pick a dependable silent PDF printing method on
     Windows, for example SumatraPDF's command line (-print-to "<printer>" -print-settings "noscale,paper=A4"
     -silent). Download it only from its official site, and ask me first. Tell me which method you chose and
     why. Delete the temporary file right after printing, even if printing failed.
4. Report printed and failed IDs in one POST.

Never print a job twice:
- Keep a small local record of the IDs you have printed (a file that survives crashes and restarts).
- If a claimed job's ID is already in that record, don't print it again; just report it as printed.
- Trim the record to the last ~7 days.

Settings file next to the program (and in .gitignore if it's ever in a repo):
- SITE_URL
- PRINT_AGENT_TOKEN (I'll type this in myself)
- ZEBRA_HOST=192.168.1.74 and ZEBRA_PORT=9100
- EPSON_PRINTER_NAME
- POLL_SECONDS=3

Logs:
- Record job IDs, job kinds, printer status changes and errors, each with a timestamp.
- Never log customer names, addresses, ZPL or PDF contents, or the key.
- Rotate or cap the log file so it can't grow forever.

Use Node.js (no extra packages needed) or .NET, whichever is already installed here. Keep it to one small
program plus its settings file.

━━━ INSTALL
- Make it start when the PC boots, even if nobody logs in, and restart itself if it stops. Use a Windows
  service, or a scheduled task "At startup" that runs whether or not a user is logged on.
- Printers added for one Windows user can be invisible to a service account. Make sure the account it runs as
  can see and print to the Epson, by running a test print as that account, and fix it if not.
- Keep the PC from sleeping while plugged in. Set Windows Update active hours so it doesn't restart the PC
  during the working day.

━━━ TEST (tell me plainly what passed and what didn't)
Heads-up: one old label from November 11 is still waiting in the store's queue. It will print the first time the
station connects. That's expected, and it's the first test.

1. Run it in the foreground first. Confirm it polls with no errors (no 401 or 429) and the old label prints.
2. In the store's admin, I'll open Printing and press Reprint on that order. A fresh label should come out of
   the Zebra, and the job should show as printed there.
3. Receipts: once the store starts sending receipt jobs, I'll reprint one from an order. It should come out of
   the Epson at A4, at full size.
4. Turn the Zebra off, queue a test label, turn it back on. The label should wait, then print once, not fail
   and not print twice.
5. Restart the PC. The station should come back on its own and nothing should reprint.
6. Scan the barcode on a printed label with a phone.
```
