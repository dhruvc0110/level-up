// Level Up — User guide (sidebar → Guide).
//
// PROCESS: every change to how Level Up works, and every bug fix a user could
// notice, updates this guide in the same release: the chapter text, any
// screenshot that no longer matches (site/guide/*.jpg, taken with fictitious
// demo data only), GUIDE_UPDATED, and a "What's new" entry.

const GUIDE_UPDATED = '11 Oct 2026';

// ── Building blocks ───────────────────────────────────────────────────────
function GShot({ src, caption, width }) {
  return (
    <figure style={{ margin: '18px 0 22px' }}>
      <a href={'guide/' + src} target="_blank" rel="noopener noreferrer" title="Open full size">
        <img src={'guide/' + src} alt={caption} loading="lazy"
          style={{ display: 'block', width: '100%', maxWidth: width || '100%', border: '1px solid var(--line-2)', borderRadius: 4, background: 'var(--bg-2)' }}/>
      </a>
      {caption && <figcaption style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, fontStyle: 'italic', fontFamily: 'var(--serif)' }}>{caption}</figcaption>}
    </figure>
  );
}
function GSteps({ items }) {
  return (
    <ol style={{ margin: '10px 0 16px', paddingLeft: 22, color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.7 }}>
      {items.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
    </ol>
  );
}
function GList({ items }) {
  return (
    <ul style={{ margin: '8px 0 16px', paddingLeft: 20, color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.7 }}>
      {items.map((s, i) => <li key={i} style={{ marginBottom: 3 }}>{s}</li>)}
    </ul>
  );
}
function GTip({ children, kind }) {
  return (
    <div style={{
      margin: '14px 0 18px', padding: '11px 14px', borderRadius: 3, fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)',
      background: 'var(--bg-2)', border: '1px solid var(--line-2)',
      borderLeft: '3px solid ' + (kind === 'warn' ? 'var(--signal)' : 'var(--ink-3)'),
    }}>{children}</div>
  );
}
function GH({ children }) {
  return <h3 className="serif" style={{ fontSize: 19, fontWeight: 400, color: 'var(--ink-1)', margin: '26px 0 6px', letterSpacing: '-0.01em' }}>{children}</h3>;
}
function GP({ children }) {
  return <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)', margin: '6px 0 12px', textWrap: 'pretty' }}>{children}</p>;
}
const B = ({ children }) => <b style={{ color: 'var(--ink-1)', fontWeight: 600 }}>{children}</b>;
const K = ({ children }) => (
  <kbd style={{ fontFamily: 'var(--mono)', fontSize: 11.5, padding: '1px 6px', borderRadius: 3, border: '1px solid var(--line-3)', background: 'var(--bg-2)', color: 'var(--ink-1)' }}>{children}</kbd>
);

// ── Chapters ──────────────────────────────────────────────────────────────
const GUIDE_CHAPTERS = [
  {
    id: 'start', title: 'Getting started', blurb: 'Sign in, where your data lives, staying connected',
    body: () => <>
      <GP>Level Up is your private career command center. It collects opportunities from Gmail and LinkedIn, researches each company, shows who you know there, and tracks everything through a pipeline organised around your six career personas.</GP>
      <GH>Sign in</GH>
      <GSteps items={[
        <>Open <B>dhruvc0110.github.io/level-up</B> in Chrome.</>,
        <>Click <B>Continue with Google</B> and choose your account.</>,
        <>Google shows <B>“Google hasn't verified this app”</B>. That's expected for a private app: click <B>Advanced → Go to dhruvc0110.github.io</B>.</>,
        <>Tick <B>every</B> permission box (Drive, Gmail, Contacts, Calendar), then <B>Continue</B>.</>,
      ]}/>
      <GH>Where your data lives</GH>
      <GList items={[
        <>Everything is one file in your Google Drive: <B>Level Up / levelup-data.json</B>. Nothing is stored on any other server.</>,
        <>Changes save automatically. The corner shows <B>Saving… / Saved to Drive</B>.</>,
        <>Gmail, Contacts and Calendar are <B>read-only</B>: Level Up never sends, edits or deletes anything there.</>,
        <>Make a copy any time: <B>Settings → Google → Download backup</B>.</>,
      ]}/>
      <GH>Staying connected to Google</GH>
      <GP>Google gives browser apps a 1-hour pass. Level Up renews it for you:</GP>
      <GList items={[
        <>While you work, any click in the last 10 minutes renews it. A Google window flashes and closes by itself.</>,
        <>After a break you'll see <B>Continue as you@gmail.com</B>. One click, no password.</>,
        <>If it times out mid-task, a bar says <B>“Google connection timed out — your work is waiting to save”</B>. Click anywhere (or <B>Reconnect</B>) and it carries on. Nothing is lost.</>,
      ]}/>
      <GShot src="signin.jpg" caption="Returning after a break: one click to reconnect." width={520}/>
      <GH>One window at a time</GH>
      <GP>If you open Level Up in a second tab or window, the first one saves and pauses with <B>“Level Up is open in another window”</B>. Click <B>Use Level Up here</B> to switch back. This stops two copies overwriting each other.</GP>
      <GTip>On your phone or a second computer, avoid editing at the same moment as on your laptop. The last one to save wins.</GTip>
      <GH>Install it like an app</GH>
      <GList items={[
        <><B>Laptop (Chrome):</B> click the install icon at the right end of the address bar.</>,
        <><B>Phone (Chrome):</B> <B>⋮ → Add to Home screen → Install</B>.</>,
      ]}/>
    </>,
  },
  {
    id: 'dashboard', title: 'Dashboard', blurb: 'Your day at a glance',
    body: () => <>
      <GP>The Dashboard answers “what needs me today?”. The header shows today's date, what's overdue and what's due this week, plus counters for <B>Overdue</B>, <B>Today</B> and <B>Active</B> opportunities.</GP>
      <GShot src="dashboard.jpg" caption="Dashboard: six modules; drag a module to rearrange."/>
      <GList items={[
        <><B>Overdue & today</B>: next actions past or on their due date. Click one to open it.</>,
        <><B>Pipeline shape</B>: how many opportunities sit in each stage.</>,
        <><B>This week</B>: what's coming up in the next 7 days.</>,
        <><B>Activity, last 7 days</B>: inbox decisions and calendar meetings per day.</>,
        <><B>Personas in play</B>: opportunities per persona.</>,
        <><B>Fit distribution</B>: how strong your pipeline is, by fit score.</>,
      ]}/>
    </>,
  },
  {
    id: 'pipeline', title: 'Pipeline & opportunities', blurb: 'Track every role from discovered to decision',
    body: () => <>
      <GP>Each opportunity moves through five stages: <B>Discovered → Evaluating → Applied → In Conversations → Decision</B>.</GP>
      <GShot src="pipeline.jpg" caption="Pipeline: drag a card to another column to change its stage."/>
      <GH>Add an opportunity</GH>
      <GList items={[
        <><B>From the Inbox</B> (most common): accept an email or LinkedIn job. See <i>Inbox</i>.</>,
        <><B>By hand</B>: <B>New opportunity</B> (top right of Dashboard or Pipeline). Use this for leads from calls, dinners or referrals.</>,
      ]}/>
      <GH>Open an opportunity</GH>
      <GP>Click a card. The panel shows everything about the role:</GP>
      <GShot src="opportunity.jpg" caption="Opportunity panel: company profile, job details and the people you can reach out to."/>
      <GList items={[
        <><B>Stage</B> buttons along the top, plus <B>Persona</B> and <B>Fit score</B>.</>,
        <><B>Company</B>: a web-researched profile (see <i>Company profiles</i>).</>,
        <><B>Job details</B>: location, size, industry, hiring manager and <B>People you can reach out to</B> on LinkedIn.</>,
        <><B>People you know at …</B>: your own contacts at that company.</>,
        <><B>Source, Key contact, Next action</B> (with due date) and <B>Notes</B>: all editable.</>,
        <><B>Archive</B> (top right) removes it from the pipeline.</>,
      ]}/>
      <GTip><B>Outreach drafts</B> (right side) currently produce <B>sample text</B> to show the layout. Real Claude-written drafts are planned.</GTip>
    </>,
  },
  {
    id: 'inbox', title: 'Inbox', blurb: 'Review what came in before it reaches the pipeline',
    body: () => <>
      <GP>Everything new lands in the Inbox first, from <B>Gmail</B> (emails you labelled) and <B>LinkedIn</B> (your saved jobs). Claude reads each one and fills in company, role, persona, fit and next action. Nothing reaches your Pipeline until you accept it.</GP>
      <GShot src="inbox.jpg" caption="Inbox: candidates to triage, and items Claude dismissed as not opportunities."/>
      <GH>Triage an item</GH>
      <GSteps items={[
        <>Click a row to open it.</>,
        <>Check the <B>Company</B> profile, <B>Job details</B> and <B>People you know</B>.</>,
        <>Correct anything in the form (company, role, persona, fit, stage, next action, notes).</>,
        <>Click <B>Accept into Pipeline</B>, or <B>Reject</B> to dismiss it.</>,
      ]}/>
      <GShot src="inbox-row.jpg" caption="An opened LinkedIn job: company profile, job details and people to reach out to."/>
      <GList items={[
        <><B>Dismissed</B>: newsletters and similar that Claude set aside as not opportunities. You can still open and accept them.</>,
        <>Rows marked <B>LinkedIn · saved job</B> came from LinkedIn. Rows with an email address came from Gmail.</>,
        <>Rejected and accepted items never come back, even if you sync again.</>,
      ]}/>
    </>,
  },
  {
    id: 'gmail', title: 'Gmail: labelling emails', blurb: 'Send recruiter emails to Level Up with one label',
    body: () => <>
      <GP>Level Up only reads emails that carry the Gmail label <B>LevelUp</B>. Your other mail is never read.</GP>
      <GH>One-time setup: create the label</GH>
      <GSteps items={[
        <>In Gmail on your laptop, in the left sidebar, find <B>Labels</B> and click <B>+</B>.</>,
        <>Name it <B>LevelUp</B> (one word) and click <B>Create</B>.</>,
      ]}/>
      <GH>Label an email</GH>
      <GList items={[
        <><B>Laptop:</B> open the email → the <B>label icon</B> in the toolbar → tick <B>LevelUp</B>.</>,
        <><B>Phone (Gmail app):</B> open the email → <B>⋮ → Change labels</B> → tick <B>LevelUp</B> → OK.</>,
      ]}/>
      <GH>Optional: label search-firm emails automatically</GH>
      <GSteps items={[
        <>In Gmail's search bar, click the <B>filter icon</B> (right end).</>,
        <>In <B>From</B>, enter the firms' domains, e.g. <B>@spencerstuart.com OR @kornferry.com OR @heidrick.com OR @russellreynolds.com</B>.</>,
        <>Click <B>Create filter</B> → tick <B>Apply the label: LevelUp</B> → <B>Create filter</B>.</>,
      ]}/>
      <GH>Bring them into Level Up</GH>
      <GP>Click <B>Sync Gmail now</B> in the Inbox, or <B>Settings → Google → Sync now</B> (which also refreshes Contacts and Calendar). Each email is read once. Claude decides whether it's a real opportunity and fills in the details.</GP>
      <GTip>Removing the label later doesn't remove the item from Level Up. Reject it in the Inbox instead.</GTip>
    </>,
  },
  {
    id: 'linkedin', title: 'LinkedIn saved jobs', blurb: 'One click brings your saved jobs in, fully researched',
    body: () => <>
      <GP>LinkedIn doesn't let apps read your saved jobs, so Level Up uses a <B>bookmark button</B> you click while on LinkedIn. It reads only what LinkedIn shows you, at a human pace, in your own browser.</GP>
      <GH>One-time setup: install the button</GH>
      <GSteps items={[
        <>Show Chrome's bookmarks bar: <K>Cmd</K> + <K>Shift</K> + <K>B</K>.</>,
        <>In Level Up, go to <B>Settings → LinkedIn saved jobs</B>.</>,
        <>Drag the <B>Sync to Level Up</B> button onto the bookmarks bar.</>,
      ]}/>
      <GShot src="settings-linkedin.jpg" caption="Settings → LinkedIn saved jobs: drag the button to your bookmarks bar."/>
      <GTip kind="warn">When <i>What's new</i> says the LinkedIn button changed, delete the old bookmark and drag the new one. The old one keeps running the old version.</GTip>
      <GH>Sync your saved jobs</GH>
      <GSteps items={[
        <>On LinkedIn, open <B>My Jobs → Saved</B> (Job tracker).</>,
        <>Click <B>Sync to Level Up</B> in your bookmarks bar. A <B>Level Up</B> box appears bottom-right.</>,
        <><B>Keep that LinkedIn tab in front.</B> It reads each new job's page about 45 seconds apart. LinkedIn only loads job details on a visible tab, so the box shows <B>Paused</B> if you switch away and carries on when you return.</>,
        <>When it says done, click <B>Open in Level Up</B>. If Chrome blocks the pop-up, choose <B>Always allow pop-ups from linkedin.com</B> and click again.</>,
        <>Watch the Inbox fill in. The corner counts <B>“LinkedIn: 4 of 10 done…”</B>.</>,
      ]}/>
      <GShot src="linkedin-box.jpg" caption="The progress box on LinkedIn while it reads your saved jobs." width={560}/>
      <GH>Good to know</GH>
      <GList items={[
        <><B>10 per page:</B> LinkedIn shows 10 saved jobs per page. The box tells you when there are more. Go to the next page and click again. You can do pages back to back; they queue up safely.</>,
        <><B>Only new jobs are read.</B> Jobs already read are skipped next time, so a re-run with one new save takes under a minute.</>,
        <><B>Stop and send what's read</B> ends early and keeps what's done.</>,
        <><B>Unsaving on LinkedIn</B> doesn't remove the job from Level Up. Level Up is your master list.</>,
      ]}/>
      <GH>What each job brings in</GH>
      <GList items={[
        <>Company, role, location, on-site/hybrid/remote, company size and industry.</>,
        <>A short summary of the mandate, plus suggested persona, fit and next action.</>,
        <>The <B>hiring manager</B> (when the posting names one) with your connection level.</>,
        <><B>People you can reach out to</B>: LinkedIn's full “Show all” list, such as connections at the company and fellow alumni, with links.</>,
        <>A web-researched <B>Company</B> profile, added in the background.</>,
      ]}/>
      <GH>Update one job</GH>
      <GP>Open the job itself on LinkedIn, scroll until <B>People you can reach out to</B> appears, and click the bookmark. Level Up updates that job, even if it's already in your Pipeline.</GP>
    </>,
  },
  {
    id: 'companies', title: 'Company profiles', blurb: 'Automatic web research on every employer',
    body: () => <>
      <GP>After every Gmail or LinkedIn sync, Level Up researches each new employer on the web and adds a short profile to the Inbox item and the opportunity.</GP>
      <GShot src="company.jpg" caption="A company profile: what they do, revenue, employees, ownership, recent news and sources." width={720}/>
      <GList items={[
        <><B>What they do</B> in 2–3 lines, <B>revenue</B> (marked “estimate” for private companies), <B>employees</B>, <B>ownership</B> (public with ticker, private, PE-backed), <B>HQ</B> and founding year.</>,
        <>Up to 3 <B>recent news</B> items, the website and the <B>sources</B> used.</>,
        <><B>Recruiter postings are skipped</B> (a search firm hiring for an unnamed client). Click <B>Research anyway</B> to override.</>,
        <>If a name is shared by several companies and the right one isn't certain, it says <B>“Couldn't confidently identify”</B> rather than guess.</>,
        <><B>Refresh</B> re-runs the research. Each company is researched once and reused for all its jobs (about 5¢ each in Claude usage).</>,
      ]}/>
    </>,
  },
  {
    id: 'network', title: 'Network & connections', blurb: 'Your contacts, warm paths and LinkedIn connections',
    body: () => <>
      <GP>The Network holds your contacts from <B>Google Contacts</B>, with <B>last touch</B> dates from your <B>Calendar</B>, plus anyone you add by hand or import from LinkedIn.</GP>
      <GShot src="network.jpg" caption="Network: search, filter by relationship strength, and see warm paths to opportunities."/>
      <GList items={[
        <><B>Search</B> by name, company or title. Filter by <B>Strong / Warm / Cold / Recruiters</B> or persona.</>,
        <>Click a contact to see notes, strength, last touch and the opportunities they could help with.</>,
        <><B>Warm paths</B> (right) shows which opportunities have a known contact and which have none.</>,
        <>Refresh from Google: <B>Settings → Google → Sync now</B>.</>,
      ]}/>
      <GH>Add your LinkedIn connections</GH>
      <GP>This makes <B>People you know at …</B> far more complete, since many Google contacts have no company listed.</GP>
      <GSteps items={[
        <>On LinkedIn: <B>Me → Settings & Privacy → Data privacy → Get a copy of your data</B>.</>,
        <>Choose <B>Download larger data archive</B> → <B>Request archive</B>.</>,
        <>When LinkedIn's email arrives (up to 24 hours), download and unzip it.</>,
        <>In Level Up: <B>Settings → LinkedIn connections</B> → upload <B>Connections.csv</B>. Matching people are merged, not duplicated.</>,
      ]}/>
    </>,
  },
  {
    id: 'personas', title: 'Personas', blurb: 'The six versions of you',
    body: () => <>
      <GP>You're running several searches at once: Enterprise CIO, Transformation Director, Managing Director, Fractional Advisor, PE Operating Partner and Board Director. Each opportunity is tagged with the persona it fits, and Claude uses them when reading emails and jobs.</GP>
      <GShot src="personas.jpg" caption="Personas: positioning, skills, targets, and how each is doing in the pipeline."/>
      <GList items={[
        <>Each card shows positioning, skills, company size, sectors, tone, and its strongest active opportunities.</>,
        <><B>Edit</B> (pencil) or <B>New persona</B> opens the curator: identity, positioning, voice and targeting.</>,
      ]}/>
      <GTip>The curator's <B>voice preview</B> is sample text for now.</GTip>
    </>,
  },
  {
    id: 'career', title: 'Career profile', blurb: 'Your career knowledge base: the source for every resume and note',
    body: () => <>
      <GP>The Career profile holds every fact about your career in one place: roles, scope, achievements with their numbers, boards, education and certifications. Resumes and outreach notes will draw from it, so it's worth keeping accurate. It grows each time you add a source, and tells you what needs refreshing.</GP>
      <GShot src="career.jpg" caption="Career profile: roles with scope, and each achievement with its numbers, themes, personas and sources."/>
      <GH>Add a source (resume or LinkedIn)</GH>
      <GSteps items={[
        <>Open <B>Career profile</B> in the sidebar.</>,
        <>Pick the type (<B>Resume</B>, <B>LinkedIn profile</B> or <B>Bio or other document</B>), then <B>Choose file</B> (PDF or Word .docx).</>,
        <>Claude reads it, usually in under a minute.</>,
        <><B>Review changes</B> shows everything it found, compared with your profile. <B>New</B> items are ticked; untick anything you don't want. <B>Known</B> items already exist and just gain this file as an extra source. <B>Similar</B> items look like an achievement you have in different words: choose <B>Same achievement (merge)</B> or <B>Add as separate</B>. <B>Conflicts</B> (e.g. a different team size): <B>Keep yours</B>, <B>Use this file's</B> or <B>Decide later</B>.</>,
        <>Click <B>Apply to my profile</B>. Nothing changes until you do.</>,
      ]}/>
      <GTip><B>Your LinkedIn profile as a PDF:</B> on LinkedIn, open your profile → <B>More</B> (or <B>Resources</B>) → <B>Save to PDF</B>. Old .doc files can't be read: save them as .docx or PDF first.</GTip>
      <GH>What's in each tab</GH>
      <GList items={[
        <><B>Experience</B>: roles newest first. Edit a role's title, dates and scope (P&L, budget, team, geography). Edit any achievement, or add one by hand under its role.</>,
        <><B>Skills & themes</B>: how often your achievements show each theme and skill. Click one to see the achievements behind it.</>,
        <><B>Education & boards</B>: degrees, board seats, publications and talks, certifications and awards.</>,
        <><B>Sources</B>: every file you imported, with how many facts it contributed. The originals are kept in your Drive under <B>Level Up / Sources</B>.</>,
        <><B>Needs review</B>: what to fix or confirm (below).</>,
      ]}/>
      <GShot src="career-themes.jpg" caption="Skills & themes: click a theme to see the evidence behind it."/>
      <GH>Keeping it fresh</GH>
      <GP>Each fact remembers when you last confirmed it (the small dot: green = recent, amber = over 12 months). <B>Needs review</B> lists:</GP>
      <GList items={[
        <><B>Conflicting values</B> you chose to decide later: <B>Keep yours</B> or <B>Use new</B>.</>,
        <><B>No number yet</B>: senior readers look for scale; add a figure if you have one.</>,
        <><B>Add the scope</B>: a role with no P&L, budget or team size.</>,
        <><B>Not confirmed in 12 months</B>: click <B>Still true</B>, or edit it.</>,
      ]}/>
      <GShot src="career-review.jpg" caption="Needs review: conflicts, missing numbers or scope, and facts due for a check." width={760}/>
      <GTip>Coming next: tailored resumes and outreach notes will draw on this profile, and any wording you improve there will be offered back into it, so the profile keeps getting better.</GTip>
    </>,
  },
  {
    id: 'brand', title: 'Brand', blurb: 'Plan and track your LinkedIn presence',
    body: () => <>
      <GP>Brand helps you post consistently: a content calendar, a consistency score, the mix of formats, and the themes you write about.</GP>
      <GShot src="brand.jpg" caption="Brand: consistency, format mix and the content calendar."/>
      <GList items={[
        <><B>New post</B>: pick a format (article, quick take, anecdote, survey, reply, professional update) and a theme, then draft, schedule or publish.</>,
        <>The <B>consistency</B> score and cadence come from the posts you mark as published.</>,
      ]}/>
      <GTip><B>AI draft</B> here produces sample text for now. Write or paste your own until Claude drafting is switched on.</GTip>
    </>,
  },
  {
    id: 'settings', title: 'Settings', blurb: 'Theme, Claude key, Google, LinkedIn, backups',
    body: () => <>
      <GH>Appearance</GH>
      <GP>Choose <B>Dark</B> (default), <B>Light</B> or <B>Neutral</B>. It's saved with your data, so every device follows.</GP>
      <GShot src="settings-appearance.jpg" caption="Settings → Appearance." width={720}/>
      <GH>Claude API key</GH>
      <GP>Level Up uses Claude to read emails and jobs and to research companies. Create a key at <B>console.anthropic.com → API keys</B>, paste it into <B>Settings → Claude API key</B>, click <B>Save key</B>, then <B>Test connection</B>. It's stored in your own Drive file and used only from your browser.</GP>
      <GH>Google</GH>
      <GShot src="settings-google.jpg" caption="Settings → Google: sync, open the data file, back up and restore." width={720}/>
      <GList items={[
        <><B>Sync now</B>: Gmail (labelled emails), Contacts and Calendar in one go.</>,
        <><B>Open data file in Drive</B>: see the file itself.</>,
        <><B>Download backup</B>: saves a copy of all your data to your computer.</>,
        <><B>Restore from backup</B>: replaces <i>all</i> current data with a backup file. Download a fresh backup first.</>,
      ]}/>
      <GH>LinkedIn</GH>
      <GList items={[
        <><B>LinkedIn saved jobs</B>: the bookmark button (see <i>LinkedIn saved jobs</i>).</>,
        <><B>LinkedIn connections</B>: upload Connections.csv (see <i>Network & connections</i>).</>,
      ]}/>
      <GH>Signing out</GH>
      <GP><B>Sign out</B> sits at the bottom of the sidebar. It saves first, then disconnects Google on this browser.</GP>
    </>,
  },
  {
    id: 'help', title: 'Troubleshooting', blurb: 'Quick answers to common hiccups',
    body: () => <>
      {[
        ["Google says “hasn't verified this app”", <>Expected for your private app. Click <B>Advanced → Go to dhruvc0110.github.io</B> and tick every box.</>],
        ["I was asked to sign in again", <>Google limits browser apps to 1 hour. Click <B>Continue as …</B>: no password, no consent screen.</>],
        ["“Level Up is open in another window”", <>Another tab took over so the two can't overwrite each other. Click <B>Use Level Up here</B>.</>],
        ["I ran the LinkedIn button but nothing showed up", <>Watch the corner counter. Jobs land one at a time (10–15 seconds each). If the LinkedIn box said <B>Read 0 job pages</B>, the tab wasn't in front; click the bookmark again and keep it visible.</>],
        ["“Hiring manager not read yet”", <>Only the Saved-list card came through. Open the job on LinkedIn, scroll down, click the bookmark there.</>],
        ["“Couldn't read this job's page details”", <>Claude was briefly unavailable. Same fix: click the bookmark on that job's page.</>],
        ["Some saved jobs are missing", <>LinkedIn shows 10 per page. Go to the next page of Saved and click the bookmark again.</>],
        ["The company profile looks wrong", <>Click <B>Refresh</B> on the profile. If it's a recruiter posting, it's skipped on purpose.</>],
        ["A job came from email, not LinkedIn", <>Rows with an email address come from Gmail (the LevelUp label). Reject them if they're not relevant.</>],
        ["Gmail sync says the label wasn't found", <>Create the Gmail label <B>LevelUp</B> (see <i>Gmail: labelling emails</i>).</>],
        ["A resume won't import", <>Use PDF or Word <B>.docx</B> (old .doc files can't be read). Very long documents may need splitting.</>],
        ["I see an old version after an update", <>Press <K>Cmd</K> + <K>Shift</K> + <K>R</K> once.</>],
      ].map(([q, a], i) => (
        <div key={i} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--line-1)' : 'none' }}>
          <div style={{ fontSize: 14, color: 'var(--ink-1)', fontWeight: 500, marginBottom: 4 }}>{q}</div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>{a}</div>
        </div>
      ))}
    </>,
  },
  {
    id: 'whatsnew', title: "What's new", blurb: 'Changes, newest first',
    body: () => <>
      {[
        ['11 Oct 2026', [
          'Career profile: import your resumes and LinkedIn profile into one knowledge base, review every change before it\u2019s applied, and see what needs refreshing.',
        ]],
        ['10 Oct 2026', [
          'User guide (this page) added to the sidebar.',
          'Inbox fills in live during a LinkedIn sync, with a running count.',
          'Google connection renews itself while you work; “Continue as …” after a break.',
          'LinkedIn jobs are queued safely: nothing is lost if a window closes or a second page arrives mid-sync. Only one Level Up window is active at a time.',
          'Company profiles: automatic web research on every employer.',
          'LinkedIn button reads real job pages, captures “People you can reach out to” including the full “Show all” list, and pauses when its tab isn’t in front. Re-drag the button.',
          'Claude retries automatically when busy; failed job details show why.',
          'Themes: Dark, Light, Neutral. Explicit Sign out button.',
        ]],
        ['8 Oct 2026', [
          'LinkedIn saved jobs button: one click on your Saved list brings jobs into the Inbox with job details and people you know.',
        ]],
        ['7 Oct 2026', [
          'Level Up moved to GitHub + Google sign-in; your data now lives in your Google Drive.',
          'Dashboard shows real dates and activity; sample data can be removed in Settings.',
        ]],
      ].map(([date, items]) => (
        <div key={date} style={{ marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{date}</div>
          <GList items={items}/>
        </div>
      ))}
    </>,
  },
];

// ── Screen ────────────────────────────────────────────────────────────────
function GuideView() {
  const [chapter, setChapter] = React.useState(() => {
    try { return localStorage.getItem('lu_guide_chapter') || 'start'; } catch (e) { return 'start'; }
  });
  const scrollRef = React.useRef(null);
  const idx = Math.max(0, GUIDE_CHAPTERS.findIndex(c => c.id === chapter));
  const ch = GUIDE_CHAPTERS[idx];
  const go = (id) => {
    setChapter(id);
    try { localStorage.setItem('lu_guide_chapter', id); } catch (e) { /* storage blocked */ }
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };
  const navBtn = (c, dir) => c && (
    <button onClick={() => go(c.id)} style={{
      appearance: 'none', flex: 1, textAlign: dir === 'prev' ? 'left' : 'right', cursor: 'pointer',
      padding: '12px 14px', borderRadius: 3, background: 'transparent', border: '1px solid var(--line-2)', color: 'var(--ink-2)',
    }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>{dir === 'prev' ? '← Previous' : 'Next →'}</div>
      <div style={{ fontSize: 13.5, color: 'var(--ink-1)', marginTop: 3 }}>{c.title}</div>
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="hl-b" style={{ padding: '24px 28px 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Help</div>
          <h1 className="serif" style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink-1)' }}>User guide</h1>
        </div>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Updated {GUIDE_UPDATED}</span>
      </div>
      <div className="lu-guide" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)' }}>
        <nav className="lu-guide-toc" style={{ overflow: 'auto', padding: '18px 12px', borderRight: '1px solid var(--line-1)' }}>
          {GUIDE_CHAPTERS.map((c, i) => {
            const active = c.id === ch.id;
            return (
              <button key={c.id} onClick={() => go(c.id)} style={{
                appearance: 'none', display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: '8px 10px', marginBottom: 2, borderRadius: 3, border: 'none',
                background: active ? 'var(--bg-3)' : 'transparent', color: active ? 'var(--ink-1)' : 'var(--ink-2)',
              }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: 13.5 }}>{c.title}</span>
              </button>
            );
          })}
        </nav>
        <div ref={scrollRef} className="lu-main-scroll" style={{ overflow: 'auto', padding: '24px 32px 60px' }}>
          <div style={{ maxWidth: 780 }}>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Chapter {String(idx + 1).padStart(2, '0')}</div>
            <h2 className="serif" style={{ fontSize: 30, fontWeight: 400, letterSpacing: '-0.018em', margin: '6px 0 4px', color: 'var(--ink-1)' }}>{ch.title}</h2>
            <div className="serif-italic" style={{ fontSize: 15, color: 'var(--ink-3)', marginBottom: 18 }}>{ch.blurb}</div>
            {ch.body()}
            <div style={{ display: 'flex', gap: 10, marginTop: 34 }}>
              {navBtn(GUIDE_CHAPTERS[idx - 1], 'prev') || <div style={{ flex: 1 }}/>}
              {navBtn(GUIDE_CHAPTERS[idx + 1], 'next') || <div style={{ flex: 1 }}/>}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 820px) {
          .lu-guide { grid-template-columns: 1fr !important; }
          .lu-guide-toc { display: flex; gap: 4px; overflow-x: auto !important; border-right: none !important; border-bottom: 1px solid var(--line-1); padding: 10px 12px !important; }
          .lu-guide-toc button { width: auto !important; white-space: nowrap; }
        }
      `}</style>
    </div>
  );
}

Object.assign(window, { GuideView });
