# Testing UI With The Chrome DevTools Connector

This workflow is useful when a page depends on browser state that is hard to
recreate in automated tests, such as login sessions, MFA, cookies, feature flags,
local storage, or authenticated API access.

## When To Use It

Use the Chrome DevTools connector for exploratory or regression checks in an
existing browser session:

- testing flows behind login or SSO
- verifying behavior after manual MFA
- checking UI state that depends on existing cookies or local storage
- inspecting console errors and network requests after real interactions
- confirming responsive layout with screenshots

Keep unit tests and Vitest/Testing Library tests for repeatable logic and core UI
behavior. Use this connector for session-dependent checks that are awkward or
unsafe to automate with stored credentials.

## Basic Flow

1. Start the app if it is local:

   ```bash
   pnpm dev --host 127.0.0.1
   ```

2. Open the page in the connected Chrome browser.

3. If login is required, log in manually in that browser. Complete MFA yourself.

4. Tell Codex to use the existing browser session. Example:

   ```text
   Use the current Chrome DevTools browser session. Do not clear cookies or open
   a new incognito session. Test the search flow on the already-authenticated page.
   ```

5. Codex should inspect the current page, interact with elements, and verify the
   result using the connector tools.

## Recommended Connector Sequence

Use this order for stable UI testing:

1. `list_pages`

   Find the existing browser tabs. Prefer the already-authenticated tab.

2. `select_page`

   Select the correct page if more than one tab is open.

3. `take_snapshot`

   Read the accessibility tree and element `uid`s. Prefer this over screenshots
   for finding buttons, inputs, links, and headings.

4. `fill_form`, `fill`, `click`, or `press_key`

   Interact with elements from the latest snapshot. Use `fill_form` when filling
   multiple fields.

5. `wait_for` or another `take_snapshot`

   Wait for the expected text or inspect the updated accessibility tree.

6. `list_console_messages`

   Check warnings and errors.

7. `list_network_requests`

   Confirm expected data/API requests loaded successfully.

8. `resize_page` and `take_screenshot`

   Check responsive layout and visual regressions when needed.

Element `uid`s are snapshot-scoped. After navigation or a significant DOM update,
take a fresh snapshot before clicking or filling more controls.

## Example: CID Viewer Flow

For this project, a useful manual browser-session check is:

```text
Use the current Chrome DevTools browser session at
http://127.0.0.1:5173/cid-viewer/.

1. Fill the search input with 819848608.
2. Verify the URL hash is #819848608.
3. Verify Concept details shows Biospecimen.
4. Verify the visible text "Exact match selected" is not present.
5. Click 650516960.json in the details panel.
6. Verify the search input changes to 650516960.
7. Verify Concept details shows Collection Setting.
8. Check console errors and network failures.
9. Resize to mobile width and take a screenshot.
```

## Example: Authenticated Page Flow

For an authenticated app, separate manual login from automated inspection:

```text
I have logged in manually in the current browser tab. Use that existing Chrome
DevTools session. Do not navigate away from the app unless needed, do not clear
storage, and do not log out.

Test that the dashboard loads, the account menu opens, and the billing page can
be reached. Check the console and failed network requests after each step.
```

If MFA or a re-login prompt appears, Codex should pause and let the user complete
that step manually.

## Practical Tips

- Use `take_snapshot` first; it exposes accessible names and stable targets for
  the next action.
- Prefer assertions based on visible headings, button names, input values, URL
  hash/path, console errors, and failed network requests.
- Keep each browser action small. Inspect after each important transition.
- Use the existing authenticated tab instead of opening a fresh browser context.
- Avoid tests that mutate production data unless the user explicitly approves.
- Do not paste passwords, tokens, session cookies, or MFA codes into chat.
- For destructive actions, stop before the final confirmation and ask the user.

## Limitations

The connector is excellent for live-session verification, but it is not a
replacement for repeatable automated tests. Results depend on the current
browser state, current user permissions, network conditions, and backend data.
When a behavior should be enforced in CI, add a unit, component, or end-to-end
test that creates its own test state.
