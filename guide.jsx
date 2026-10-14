// Level Up — User guide (sidebar → Guide).
//
// PROCESS: every change to how Level Up works, and every bug fix a user could
// notice, updates this guide in the same release: the chapter text, any
// screenshot that no longer matches (site/guide/*.jpg, taken with fictitious
// demo data only), GUIDE_UPDATED, and a "What's new" entry.

const GUIDE_UPDATED = '13 Oct 2026';

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
      <GP>The Pipeline is one page: a list of your opportunities on the left and the one you pick on the right. Stage is one of its details: <B>Discovered → Evaluating → Applied → In Conversations → Decision</B>.</GP>
      <GShot src="pipeline.jpg" caption="Pipeline: search and filter the list; the selected opportunity opens beside it."/>
      <GH>Find an opportunity</GH>
      <GList items={[
        <><B>Search</B> looks through company, role, notes, next action, contacts, the people on the LinkedIn job, location and pay.</>,
        <><B>Filters</B>: Stage (or <B>Active</B> for stages 01–04), Persona, Fit, Location, Work mode, Source and Due (overdue, within 7 days, no date). They combine, and the list says how many match; <B>Clear filters</B> resets them. Level Up remembers your filters next time.</>,
        <>The <B>stage counts</B> at the top show your pipeline's shape; click one to show only that stage, and again to undo.</>,
        <><B>Sort</B> by next due, best fit, newest, furthest stage or company.</>,
      ]}/>
      <GH>Add an opportunity</GH>
      <GList items={[
        <><B>From the Inbox</B> (most common): accept an email or LinkedIn job. See <i>Inbox</i>.</>,
        <><B>By hand</B>: <B>New opportunity</B> (top right of Dashboard or Pipeline). Use this for leads from calls, dinners or referrals.</>,
      ]}/>
      <GH>Open an opportunity</GH>
      <GP>Click a row. Its <B>Overview</B> tab shows everything about the role:</GP>
      <GShot src="opportunity.jpg" caption="Overview: key facts, company profile, job details and the people you can reach out to."/>
      <GList items={[
        <><B>Stage</B> (the coloured button under the title, or in Key facts) changes the stage.</>,
        <><B>Key facts</B>: Stage, Persona, Fit, Location, Work mode, Compensation, Industry, Company size, Source, Next action with its due date, and the date it was <B>Added</B>. All editable; these are what the list filters on. LinkedIn jobs fill location, work mode, industry and size for you, and pay when the posting shows it.</>,
        <><B>Company</B>: a web-researched profile (see <i>Company profiles</i>).</>,
        <><B>Job details</B>: hiring manager and <B>People you can reach out to</B> on LinkedIn.</>,
        <><B>People you know at …</B>, <B>Key contact</B> and <B>Notes</B>.</>,
        <><B>Wider view</B> hides the list for more room (useful on the Resume tab); <B>Show list</B> brings it back. On a narrow window you see the list or the opportunity, with <B>Back to list</B>.</>,
        <><B>Archive</B> (top right) removes it from the pipeline.</>,
      ]}/>
      <GH>Outreach notes</GH>
      <GP>The <B>Outreach</B> tab drafts notes for this role. Claude writes from the job, the company profile, the person, your persona's angle and the Career profile proof linked to that persona. It never invents anything and never sends: you copy the note and send it yourself.</GP>
      <GShot src="outreach.jpg" caption="Outreach: a hiring-manager note with what to check before sending and the proof it is based on." width={760}/>
      <GSteps items={[
        <>In the bar at the bottom, pick <B>who it's for</B> (the key contact, the hiring manager, people you can reach out to, or your own contacts there). Level Up suggests the kind of note.</>,
        <>Pick the <B>kind of note</B>: <B>Recruiter reply</B>, <B>Hiring-manager note</B>, <B>Warm-intro request</B> (with a <B>forwardable blurb</B> your contact can paste), <B>Follow-up</B>, or <B>LinkedIn connection note</B> (kept under 300 characters, with a live count).</>,
        <>Click <B>Draft</B> (about 1–2¢). To change it, type an instruction such as "shorter" or "lead with the M&A work" and click <B>Revise</B>, or click <B>Edit</B> to change the words yourself.</>,
        <>Read <B>Check before sending</B>: anything Claude couldn't confirm from your profile, or figures you may not want to share. <B>Based on</B> lists the achievements the note uses.</>,
        <>Copy it, send it from your own email or LinkedIn, then click <B>Mark as sent</B>. That sets the next action to "Follow up with …" due in 7 days, and records the achievements you used (for tailoring resumes later). Next time, Level Up suggests a <B>Follow-up</B> that adds something new.</>,
      ]}/>
      <GH>Resume and cover letter</GH>
      <GP>Next to Overview, each opportunity has <B>Outreach</B>, <B>Resume</B> and <B>Cover letter</B> tabs. Everything you make for a job stays with that job.</GP>
      <GShot src="resume.jpg" caption="Resume tab: format and content on the left, the pages as they'll print on the right, with a fit check." width={760}/>
      <GSteps items={[
        <>Open the <B>Resume</B> tab, choose 1 or 2 pages and click <B>Tailor with Claude</B> (about 3–5¢, under a minute). Claude reads the job, the company profile, your persona and your whole Career profile.</>,
        <>It proposes a <B>headline</B>, a <B>summary</B>, and which achievements to show under each role, most relevant first, with wording tightened for this job (facts never change; hover a line or click <B>Original</B> to see your own words). Older roles can be <B>Title line only</B> or <B>Leave out</B>.</>,
        <>Tick or untick lines and edit any of them. You can also work straight on the page: point at a bullet in the preview for <B>Edit</B> (type, then Enter to save or Esc to cancel), <B>→ Sub-bullet</B> (nests it under the bullet above; <B>← Bullet</B> undoes it), <B>↑ ↓</B> to reorder, <B>Hide</B>, <B>+ Below</B> and <B>New page</B>. The list on the left has the same buttons under each line. Sub-bullets come through as nested bullets in the Google Doc. <B>Job match</B> shows what the role asks for (✓ covered, ◐ partly, ▲ gap) and <B>Check before sending</B> lists what to verify.</>,
        <><B>Add your own bullet</B>: <B>+ Add a bullet</B> under a role in the list, <B>+ Bullet</B> when you point at a role title on the page, or <B>+ Below</B> on a bullet. Type it and press Enter (Esc or leaving it empty removes it). Your bullets belong to this resume only, are marked <B>Your bullet</B> with a <B>Delete</B> link, and are not added to your Career profile. <B>Tailor again</B> replaces them along with your other edits.</>,
        <>Choose the look from eight templates: <B>Classic</B>, <B>Executive</B> (centred header), <B>Modern</B>, <B>Minimal</B>, <B>Banner</B> (coloured name block), <B>Sidebar</B> (two columns), <B>Compact</B> (dense one-pager) and <B>Board bio</B> (profile, selected achievements, short career history). A dot marks the two that suit emailing better than online applications. Then set fonts (pairs that Google Docs also has), text size, margins and colour. The preview updates as you go and says whether it fits (for example "About 2 lines over 1 page"); <B>Fit to 1 page</B> (or 2) tightens spacing, margins and then text size step by step until it fits.</>,
        <>The preview shows each page separately (<B>Page 1 of 2</B>…). To move a page break, point at a section heading, role or bullet and click <B>Start page here</B>: it and everything after it move to the next page. <B>Remove</B> (above that page) undoes it, and <B>Remove all</B> clears every break you added. The breaks carry into the Google Doc, and headings always stay with the text below them. (Not available in the Sidebar template.)</>,
        <><B>More options</B>: line and section spacing, paper size, dates beside or under the title, title or company first, bullet style, headings in capitals, which contact details to show, and the sections: reorder them (↑ ↓), rename a heading (for example "Selected achievements") or hide one.</>,
        <><B>Save as P-01's look</B> (your persona's code) stores the format with the persona, so every new resume for that persona starts with it.</>,
        <>Click <B>Create Google Doc</B>. Level Up builds the document and saves it in <B>Level Up / Documents</B> in your Drive, then opens it. Edit it there, or use File → Download for Word or PDF. Each one is listed under <B>Versions</B>; click <B>Mark as sent</B> when it goes out.</>,
      ]}/>
      <GShot src="resume-pages.jpg" caption="The pages as they'll print: a sub-bullet (–), your own bullet with its toolbar showing, and page 2 starting where you added a break." width={520}/>
      <GP><B>Cover letter</B> works the same way: <B>Draft with Claude</B> (about 2¢) writes 250–350 words from the job, the company and your strongest proof, in your persona's voice. Edit the paragraphs, revise with an instruction ("shorter", "warmer"), then <B>Create Google Doc</B>. It uses the same header as your resume.</GP>
      <GTip><B>Send PDFs.</B> In the Google Doc use File → Download → PDF: the fonts stay exact. A Word download can look different on a computer without those fonts.</GTip>
      <GTip>School-level education is left off resumes automatically. The page count in the preview is a close estimate; the Google Doc may differ by a line or two.</GTip>
      <GTip>Notes follow one house style: professional and precise but not curt, warm but not flowery, articulate and to the point. Your persona adds the angle and any words to use or avoid (set in <i>Personas</i>).</GTip>
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
    id: 'personas', title: 'Personas', blurb: 'The versions of you, and how they drive everything',
    body: () => <>
      <GP>You're running several searches at once, one per persona. Each opportunity is tagged with the persona it fits, and your personas drive everything else: Claude uses your current list when reading emails, LinkedIn jobs and resumes, and your Career profile links its proof to each one.</GP>
      <GShot src="personas.jpg" caption="Personas: positioning, skills, targets, and how each is doing in the pipeline."/>
      <GList items={[
        <>Each card shows positioning, skills, company size, sectors, tone, and its strongest active opportunities.</>,
        <><B>Edit</B> (pencil) or <B>New persona</B> opens the curator: identity, positioning, voice and targeting. New personas get the next code (P-07, P-08…).</>,
        <><B>Proof follows automatically.</B> When you create a persona, or change its name, positioning, skills, company size or sectors, Claude re-checks your whole Career profile and links the achievements and expertise that support it. The corner shows "Linked 9 achievements and 23 expertise items to P-07". Changing only the voice or tone doesn't trigger this.</>,
        <><B>Retire</B> (on each card) takes a persona out of new job matching and your Career profile. Past jobs keep their label. It moves to <B>Retired personas</B> at the bottom, where <B>Bring back</B> restores it.</>,
      ]}/>
      <GTip>Keep each persona's <B>positioning</B>, <B>skills</B> and <B>sectors</B> true to you: Claude matches jobs and links your proof against exactly those words.</GTip>
      <GH>Voice check: hear the persona before you save</GH>
      <GP>The curator's <B>Voice check</B> (right side) shows how this persona sounds on a real job. Choose one of the persona's opportunities (or <B>A typical role</B>), pick a scenario (recruiter reply, cold email, LinkedIn post opener, short bio) and click <B>Preview</B> (about 1¢). Change tone, rhythm, words or writing samples and it says <B>Settings changed</B>: click <B>Regenerate</B> to hear the difference. Nothing is kept: real notes, and later resumes and cover letters, are written inside each opportunity.</GP>
      <GTip>Every voice setting, including rhythm and your writing samples, is also used for real outreach notes. Writing samples have the biggest effect: paste one to three paragraphs you've actually written in this voice.</GTip>
    </>,
  },
  {
    id: 'career', title: 'Career profile', blurb: 'Your career knowledge base: the source for every resume and note',
    body: () => <>
      <GP>The Career profile holds every fact about your career in one place: roles, scope, achievements with their numbers, expertise (capabilities, industries, processes, platforms, offerings), boards, education and certifications. Resumes and outreach notes will draw from it, so it's worth keeping accurate. It grows each time you add a source, and tells you what needs refreshing.</GP>
      <GH>Career map</GH>
      <GP>The <B>Map</B> tab (the first one) pictures your career as a flow: your <B>roles</B> on the left (newest at the top), the <B>themes of proof</B> they produced in the middle, and your <B>personas</B> on the right. The wider a band, the more evidence behind it: outcomes count most, work in flight a little less, responsibilities least.</GP>
      <GShot src="career-map.jpg" caption="Career map: roles → themes of proof → personas. Band width is evidence."/>
      <GList items={[
        <><B>Hover or click</B> a role, theme or persona to light up only its share of every band. A panel below lists the achievements and expertise behind it.</>,
        <>The map shows your top 12 themes; the rest are grouped as <B>Other themes</B>. <B>Show all themes</B> expands them.</>,
        <><B>Link expertise</B> (first time, about 1¢): Claude connects your expertise to themes and personas so the panels can show it. <B>Re-link expertise</B> after adding a lot of new expertise.</>,
        <>In any panel, the small <B>P-01…P-06</B> codes on each achievement add or remove its link to a persona with one click.</>,
      ]}/>
      <GH>Persona lens</GH>
      <GP>Pick a persona at the top of the map (or click it on the right). Its share of your career lights up in its colour, and the <B>Persona lens</B> opens below.</GP>
      <GShot src="career-lens.jpg" caption="Persona lens: strength, verdict, gaps to close, what the persona asks for, and your best proof." width={760}/>
      <GList items={[
        <><B>Assess strength and gaps</B> (about 2¢): Claude reads the proof linked to the persona, like a search partner would, and gives a strength from 1 to 5, a short verdict, <B>gaps to close</B> with a next step for each, and how well you cover each skill, sector and company size the persona asks for.</>,
        <><B>Best proof</B>: the achievements that make the strongest case. <B>Supporting expertise</B> lists the expertise linked to the persona.</>,
        <>The result is saved. When the persona or your profile changes, the lens says so; click <B>Refresh</B> to re-assess. It never re-runs on its own.</>,
        <>The lens measures you against the persona's own words, so keep its positioning, skills and sectors true (see <i>Personas</i>).</>,
      ]}/>
      <GShot src="career.jpg" caption="Experience: roles with scope, and each achievement with its numbers, themes, personas and sources."/>
      <GH>Add a source (resume or LinkedIn)</GH>
      <GSteps items={[
        <>Open <B>Career profile</B> in the sidebar.</>,
        <>Pick the type (<B>Resume</B>, <B>LinkedIn profile</B> or <B>Bio or other document</B>), then <B>Choose files</B> (PDF or Word .docx). You can select several at once: each is read and reviewed in turn ("file 3 of 12"). Start with your LinkedIn profile, then your newest resumes.</>,
        <>Claude reads it, usually in under a minute.</>,
        <><B>Review changes</B> shows everything it found, compared with your profile. <B>New</B> items are ticked; untick anything you don't want. <B>Known</B> items already exist and just gain this file as an extra source. <B>Similar</B> items look like an achievement you already have in different words. Claude checks them and suggests <B>Same achievement (merge)</B> or <B>Add as separate</B>; a merge keeps the new wording as an alternative. <B>Conflicts</B> (e.g. a different team size or job title): <B>Keep yours</B>, <B>Use this file's</B> or <B>Decide later</B>. Formatting differences (phone format, "UK" vs "United Kingdom", a month's difference in dates) aren't treated as conflicts, and each resume's own headline is kept as a version rather than a clash.</>,
        <>Click <B>Apply to my profile</B>. Nothing changes until you do.</>,
      ]}/>
      <GTip><B>Adding expertise by hand:</B> the expertise form also has <B>Supports these personas</B>, so a new item can join the map straight away.</GTip>
      <GTip><B>Adding by hand:</B> anything you add or edit yourself is marked "Added by you" and confirmed today. A later resume import matches it like any other fact, so you won't get duplicates.</GTip>
      <GTip><B>Your LinkedIn profile as a PDF:</B> on LinkedIn, open your profile → <B>More</B> (or <B>Resources</B>) → <B>Save to PDF</B>. Old .doc files can't be read: save them as .docx or PDF first.</GTip>
      <GH>What's in each tab</GH>
      <GList items={[
        <><B>Map</B>: your career map and persona lens (above).</>,
        <><B>Experience</B>: roles newest first, each with its scope (P&L, budget, team, geography). Under each role: <B>outcomes</B> first, then work <B>in flight</B>, then <B>responsibilities</B>. Edit anything, change an item's kind, add an achievement under a role, or click <B>Add a role</B> for one no resume covers.</>,
        <><B>Expertise & themes</B>: your capabilities, industries, business processes, platforms and market offerings (with your 1–5 ratings where your resume gives them), plus the themes your achievements show. Click a theme to see the evidence behind it. <B>+ Add expertise</B> adds one by hand; click any item to rename it or change its level. Themes and skills come from your achievements, so add them by editing an achievement.</>,
        <><B>Education & boards</B>: degrees, board seats, publications and talks, certifications and awards. Each section has <B>+ Add</B>, and every entry has <B>Edit</B> and <B>Remove</B>.</>,
        <><B>Sources</B>: every file you imported, with how many facts it contributed. The originals are kept in your Drive under <B>Level Up / Sources</B>. <B>Paste a note</B> takes text that isn't in a file (a project write-up, a performance review, a bio): Claude reads it like a resume and you review the changes as usual.</>,
        <><B>Needs review</B>: what to fix or confirm (below).</>,
      ]}/>
      <GShot src="career-themes.jpg" caption="Expertise & themes: click a theme to see the evidence behind it."/>
      <GH>Keeping it fresh</GH>
      <GP>Each fact remembers when you last confirmed it (the small dot: green = recent, amber = over 12 months). <B>Needs review</B> lists:</GP>
      <GList items={[
        <><B>Conflicting values</B> you chose to decide later: <B>Keep yours</B> or <B>Use new</B>.</>,
        <><B>No number yet</B>: an outcome with no figure. Senior readers look for scale; add one if you have it.</>,
        <><B>Add the scope</B>: a role with no P&L, budget or team size.</>,
        <><B>Not confirmed in 12 months</B>: click <B>Still true</B>, or edit it.</>,
        <><B>Possible duplicates</B>: click <B>Check for duplicates</B> to scan the whole profile for achievements written more than once. Pick the wording to lead with and <B>Merge</B> (the others stay as alternative wordings, and numbers and sources are combined), or <B>Keep separate</B> (it won't ask again).</>,
      ]}/>
      <GTip><B>Alternative wordings:</B> an achievement merged from several resumes shows “3 wordings”. Click <B>Edit</B> to see them all and choose <B>Use this wording</B>. Tailored resumes will be able to pick the best phrasing for each role.</GTip>
      <GShot src="career-review.jpg" caption="Needs review: conflicts, missing numbers or scope, and facts due for a check." width={760}/>
      <GTip>Coming next: tailored resumes and outreach notes will draw on this profile, and any wording you improve there will be offered back into it, so the profile keeps getting better.</GTip>
    </>,
  },
  {
    id: 'brand', title: 'Brand', blurb: 'A steady stream of LinkedIn posts from three sources',
    body: () => <>
      <GP>Brand helps you post 2–3 times a week so you show up when recruiters, hiring managers and executives search or scroll. Everything starts from one of three sources, and your personas are lenses you can apply to any post.</GP>
      <GShot src="brand.jpg" caption="Brand: this week's rhythm, ideas from your experience and your job pipeline, your own idea, and a draft with a persona lens applied."/>
      <GSteps items={[
        <><B>Check your rhythm.</B> The top shows posts marked posted this week against your target (2, 3 or 4 a week) and the last six weeks.</>,
        <><B>Pick a starting point.</B> <B>From your experience</B>: click <B>Suggest ideas</B> (about 1–2¢) for post ideas drawn from your Career profile. <B>From your job pipeline</B>: ideas on the themes the roles you saved or applied to in the last 60 days care about; posts never name those companies or hint that you're applying. <B>Your idea</B>: type a prompt or paste a rough draft, choose Post or Article / newsletter, and click <B>Work on it with Claude</B>.</>,
        <><B>Draft.</B> Click <B>Draft</B> on an idea (about 2–3¢). Claude writes in your voice from facts in your record only, with a hook that works before LinkedIn's “see more”, and up to three hashtags. <B>Based on</B> shows the achievements it used; <B>Not this one</B> clears an idea.</>,
        <><B>Refine together.</B> Edit the text directly, or type an instruction (“shorter”, “lead with the number”, “end with a question”) and click <B>Refine</B>. To view the same topic through one or more personas, click their buttons and then <B>Apply lens</B>; ✓ marks lenses already applied. <B>Undo last change</B> steps back a version.</>,
        <><B>Check, copy and post.</B> Read <B>Check before posting</B> (it always flags a company from your pipeline if one slips into the text). Click <B>Copy for LinkedIn</B>, post it on LinkedIn yourself, then <B>Mark as posted</B>. The rhythm updates.</>,
      ]}/>
      <GTip>Drafts and posted items are listed under the sources. Nothing is ever posted for you.</GTip>
    </>,
  },
  {
    id: 'settings', title: 'Settings', blurb: 'Theme, Claude key and costs, Google, LinkedIn, backups',
    body: () => <>
      <GH>Appearance</GH>
      <GP>Choose <B>Dark</B> (default), <B>Light</B> or <B>Neutral</B>. It's saved with your data, so every device follows.</GP>
      <GShot src="settings-appearance.jpg" caption="Settings → Appearance." width={720}/>
      <GH>Claude API key</GH>
      <GP>Level Up uses Claude to read emails and jobs and to research companies. Create a key at <B>console.anthropic.com → API keys</B>, paste it into <B>Settings → Claude API key</B>, click <B>Save key</B>, then <B>Test connection</B>. It's stored in your own Drive file and used only from your browser.</GP>
      <GH>Claude models & usage (cost)</GH>
      <GShot src="settings-claude-usage.jpg" caption="Settings → Claude models & usage: this month's spend and a model per job." width={720}/>
      <GList items={[
        <><B>Pick a model per job</B>: Gmail emails, LinkedIn jobs, company profiles, resumes, duplicate checks. <B>Haiku</B> is about 20× cheaper than <B>Sonnet</B>; <B>Opus</B> is the most capable and costs twice Sonnet.</>,
        <>Each option shows a rough cost per item, based on your real usage once there is some.</>,
        <><B>Try before you commit</B>: switch one job to Haiku, check the next few results (e.g. a LinkedIn job's fit and hiring manager), and switch back if they're not good enough.</>,
        <>The cards show this month's spend, last month, and what <B>caching</B> saved. Caching re-uses Level Up's instructions within 5 minutes, so it pays off in batches (a Gmail sync, a LinkedIn page, a resume import).</>,
        <>For a hard ceiling, set a monthly limit at <B>console.anthropic.com → Settings → Limits</B>.</>,
      ]}/>
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
        ["Claude costs more than expected", <>Open <B>Settings → Claude models & usage</B> to see which job spends the most, then switch it to <B>Haiku</B>. Company profiles also pay 1¢ per web search.</>],
        ["An opportunity is missing from the Pipeline list", <>A filter or search is probably hiding it: the list says how many are shown. Click <B>Clear filters</B>.</>],
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
        ['13 Oct 2026', [
          'Brand redesigned around your content rhythm: ideas from your experience, from the roles in your pipeline (never named), or your own prompt; Claude drafts, you refine with instructions and persona lenses, copy to LinkedIn and mark posted. The per-persona Foundation kits from yesterday are retired (anything drafted there is kept in your data).',
        ]],
        ['12 Oct 2026', [
          'Brand › Foundation: a brand kit for each persona. Claude proposes content pillars (with your proof and post ideas), three LinkedIn headline options and an About section; you edit, copy them to LinkedIn and mark which persona is live.',
          'Resumes: add your own bullets to any role (in the list, or on the page with + Bullet / + Below). The list now puts each line\u2019s buttons underneath it, so the wording gets the full width.',
          'Resumes: edit bullets right on the page preview, nest a bullet as a sub-bullet under the one above, and reorder bullets with ↑ ↓ (also in the list on the left). Sub-bullets carry into the Google Doc.',
          'Resume preview now shows separate pages, and you can move page breaks: point at a section, role or bullet and click Start page here. The breaks carry into the Google Doc.',
          'Pipeline is now a searchable list with the selected opportunity beside it, instead of stage columns. Stage is a detail you change on the opportunity. New key facts (location, work mode, compensation, industry, company size, date added) can be filtered, alongside stage, persona, fit, source and due date. Existing opportunities got their date added from the Inbox where it was known.',
          'Fixed: due dates showed one day early (an item due today said "1d overdue"). Adding an opportunity by hand now opens it straight away.',
          'Resume formatting: eight templates (Classic, Executive, Modern, Minimal, Banner, Sidebar, Compact, Board bio), font pairings, text size, colour, margins and spacing, Fit to pages, section order and headings, date and bullet styles, and a saved look per persona. Cover letters share the resume\u2019s look and tailored headline.',
          'Resumes and cover letters: every opportunity now has Resume and Cover letter tabs next to Outreach. Claude tailors a resume from your Career profile, you choose and edit, pick a template, check the fit, and create a Google Doc in your Drive.',
          'Personas: the voice preview is now written by Claude in each persona\u2019s voice (click Preview; about 1¢), so you can hear what your settings change. Outreach notes now also use the sentence rhythm and your writing samples.',
          'Personas: the preview is now a Voice check you run against one of the persona\u2019s real opportunities. Job documents stay in the opportunity; resumes and cover letters will join Outreach there.',
        ]],
        ['11 Oct 2026', [
          'Outreach notes are real now: in any opportunity, pick the person and the kind of note (recruiter reply, hiring-manager note, warm-intro request with a forwardable blurb, follow-up, LinkedIn note) and Claude drafts it from your Career profile. Mark as sent sets a 7-day follow-up.',
          'Fixes: linking an achievement to a persona on the map no longer counts as confirming it, and the persona lens now notices when expertise or proof has been re-linked.',
          'Career map: a new Map tab shows your roles flowing into themes of proof and on to your personas. Pick a persona to see its share light up, and get a strength score, gaps to close and your best proof. First time: click Link expertise.',
          'Personas drive everything: new or edited personas are used straight away for Gmail, LinkedIn and resume reading, and Claude links your Career profile proof to them automatically. Personas can be retired and brought back.',
          'Career profile: add to every tab by hand: a role, expertise (and change its name or level), degrees, board seats, publications and certifications (with Edit on each), or paste a note for Claude to read. Each tab now opens at the top.',
          'Claude costs under your control: Settings \u2192 Claude models & usage lets you pick the model for each job (Haiku is about 20\u00d7 cheaper than Sonnet) and shows this month\u2019s spend per job. Level Up now also caches its instructions, so batches cost less.',
          'Career profile: import your resumes and LinkedIn profile into one knowledge base, review every change before it\u2019s applied, and see what needs refreshing.',
          'Career profile captures your expertise (capabilities, industries, processes, platforms, offerings, with your 1\u20135 ratings), separates outcomes from responsibilities, merges the same achievement written different ways (keeping every wording), and can check the whole profile for duplicates.',
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
