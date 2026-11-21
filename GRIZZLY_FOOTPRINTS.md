# Grizzly Footprints (opt-in usage analytics)

## Purpose
A developer-only usage dashboard for GrizzlyJohn at /developer.html.
Tracking is **OFF by default**. John explicitly opts in in Settings using an enrollment code shared by the developer.

## Configure the two private environment variables in Netlify
For the **grizzlyjohn** site, under Project configuration > Environment variables, add:

- GRIZZLY_USAGE_VIEW_TOKEN: a randomly generated, private 48-character hex developer access code.
- GRIZZLY_USAGE_COLLECT_TOKEN: a **different**, randomly generated, private 48-character hex enrollment code for John.

Mark both as secret if supported, with availability to Netlify Functions on the production deploy. **Never put either token in this public GitHub repo, source HTML, or a query string.** Redeploy the site after adding/changing variables.

The deployment deliberately fails closed until both variables are present. No analytics are collected without a valid collection token and explicit per-device consent.

## John's consent
1. John opens GrizzlyJohn > Settings > Share App Usage With Jen.
2. John pastes his private enrollment code and checks the explicit consent box.
3. He chooses Enable Usage Sharing. The app verifies the server has accepted the code.
4. He can choose Stop Sharing Usage in Settings at any time. This prevents future transmission from that device.

The enrollment token and consent are kept in localStorage under \`gj-usage:\` keys, **outside the \`grizzlyjohn:\` namespace** and outside personal backup data. No analytics payload includes any record content.

## Developer dashboard
Open https://grizzlyjohn.netlify.app/developer.html, enter GRIZZLY_USAGE_VIEW_TOKEN and choose a 7, 30, or 90-day window.

- App open = page load, or return from background after 2+ minutes.
- Session = first activity following a 30-minute inactivity gap.
- Feature visit = tapping a main navigation tab, plus an initial Today view.
- Action = certain explicit UI actions (e.g. Gold Stars, Sleep, gratitude, DBT Toolbox, Quest, Weather, or Oracle).

Counts are best-effort; offline activity and browser restrictions can produce undercounts. **No time-spent measurements are inferred.** This dashboard measures only opted-in devices using the collection token, not general Netlify visitors.

## Data minimization and safety
The backend validates event types and uses only:
- device-local calendar date,
- device-local hour (0 to 23),
- broad feature name,
- event type.

Each event is stored as a unique immutable key in a dedicated Netlify Blob store. **No user ID, device identifier, email, IP address, text, medications, feelings, sleep duration, location, or personal notes are written.** Collection and view codes are distinct; the read API requires the developer code. The separate existing GrizzlyJohn backup endpoint and history are untouched.

Historical anonymous counts remain stored after a device opts out; opting out stops new events. When John requests deletion of existing counts, an administrator should remove the data from the dedicated \`grizzly-footprints-production\` Netlify Blob store. Changing the enrollment code in Netlify also prevents further collection from previously enrolled devices once redeployed.
