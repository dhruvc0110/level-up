// Level Up — the "Sync to Level Up" bookmark (runs on linkedin.com).
//
// Settings turns this function into a javascript: bookmark with toString(), so
// it must stay self-contained: no outside variables, plain JS (this file is not
// run through Babel).
//
//   - On a single job page: reads that job → opens Level Up with "lijob=".
//   - On the Saved jobs list: collects the cards, then reads each job's page in
//     an invisible frame, PACE_MS apart (Dhruv chose 45s), with a progress box.
//     When done, "Open in Level Up" sends everything as "lijobs=". The part
//     after "#" stays in the browser.
//   - Jobs already read are remembered in LinkedIn's own storage on this
//     browser, so the next run only reads new saves.
window.LU_LINKEDIN_BOOKMARKLET = function (APP, PACE_MS) {
  if (!/(^|\.)linkedin\.com$|^localhost$/.test(location.hostname)) { alert('Level Up: open LinkedIn first — your Saved jobs list, or a single job.'); return; }
  if (window.__luSyncRunning) { alert('Level Up: a sync is already running in this tab.'); return; }
  var RX = /\/jobs\/view\/(\d+)/;
  var BOX = '.jobs-search__job-details--wrapper,.jobs-search__job-details--container,.jobs-details,.job-view-layout';
  var DONE_KEY = 'levelup_enriched_jobs_v2'; // v2: v1 marked jobs Level Up never received (open-window bug)
  var MAX_PER_RUN = 30;
  var idOf = function (a) { return (String(a.href).match(RX) || [])[1]; };
  var go = function (u) { if (!window.open(u, 'levelup')) alert('Level Up: allow pop-ups for linkedin.com, then click again.'); };
  var send = function (key, data) { go(APP + key + '=' + encodeURIComponent(JSON.stringify(data))); };

  function readJob(doc, id) {
    var box = doc.querySelector(BOX) || doc.querySelector('main') || doc.body;
    var people = [], seenP = {};
    box.querySelectorAll('a[href*="/in/"]').forEach(function (a) {
      var u = String(a.href).split('?')[0];
      if (!/linkedin\.com\/in\//.test(u) || seenP[u]) return;
      seenP[u] = 1;
      var c = a;
      for (var i = 0; i < 4 && c.parentElement && (c.innerText || '').length < 60; i++) c = c.parentElement;
      people.push({ url: u, text: (c.innerText || '').slice(0, 200) });
    });
    var co = box.querySelector('a[href*="/company/"]');
    return { id: id, text: (box.innerText || '').slice(0, 9000), people: people.slice(0, 15), companyUrl: co ? co.href : null };
  }

  // "People you can reach out to" → "Show all" opens an "In your network" list
  // (connections and alumni at the company, with names and degree).
  function findShowAll(doc) {
    var links = doc.querySelectorAll('a, button');
    for (var k = 0; k < links.length; k++) {
      if (!/^\s*show all\s*$/i.test(links[k].textContent || '')) continue;
      var c = links[k];
      for (var n = 0; n < 6 && c.parentElement; n++) { c = c.parentElement; if (/people you can reach out to/i.test(c.textContent || '')) return links[k]; }
    }
    return null;
  }
  function readNetwork(doc) {
    var heads = [].filter.call(doc.querySelectorAll('h1,h2,h3,span,div,p'), function (e) { return /^\s*in your network\s*$/i.test(e.textContent || ''); });
    if (!heads.length) return null;
    var cont = heads[heads.length - 1];
    for (var n = 0; n < 8 && cont.parentElement && !cont.querySelector('a[href*="/in/"]'); n++) cont = cont.parentElement;
    if (!cont.querySelector('a[href*="/in/"]')) return null;
    var people = [], seenN = {};
    cont.querySelectorAll('a[href*="/in/"]').forEach(function (a) {
      var u = String(a.href).split('?')[0];
      if (!/linkedin\.com\/in\//.test(u) || seenN[u]) return;
      seenN[u] = 1;
      var c = a;
      for (var i = 0; i < 6 && c.parentElement && (c.textContent || '').trim().length < 50; i++) c = c.parentElement;
      people.push({ url: u, text: (c.innerText || c.textContent || '').slice(0, 200) });
    });
    return { text: (cont.innerText || cont.textContent || '').slice(0, 3000), people: people.slice(0, 20) };
  }
  function withNetwork(detail, net) {
    if (!net) return detail;
    detail.text += '\n\nIN YOUR NETWORK (LinkedIn "Show all"):\n' + net.text;
    var have = {};
    detail.people.forEach(function (p) { have[p.url] = 1; });
    detail.people = net.people.filter(function (p) { return !have[p.url]; }).concat(detail.people).slice(0, 25);
    return detail;
  }

  var cur = (location.pathname.match(RX) || [])[1] || new URLSearchParams(location.search).get('currentJobId');
  if (cur) {
    if (!/about the job/i.test((document.querySelector('main') || document.body).innerText || '')) { alert('Level Up: scroll down this job page once so LinkedIn loads the description, then click again.'); return; }
    send('lijob', withNetwork(readJob(document, cur), readNetwork(document))); return;
  }

  var seen = {}, jobs = [];
  (document.querySelector('main') || document).querySelectorAll('a[href*="/jobs/view/"]').forEach(function (a) {
    var id = idOf(a);
    if (!id || seen[id]) return;
    seen[id] = 1;
    var c = a;
    for (var i = 0; i < 12 && c.parentElement && c.parentElement !== document.body; i++) {
      var p = c.parentElement, ids = {};
      p.querySelectorAll('a[href*="/jobs/view/"]').forEach(function (x) { ids[idOf(x)] = 1; });
      if (Object.keys(ids).length > 1 || (p.innerText || '').length > 1500) break;
      c = p;
    }
    jobs.push({ id: id, text: (c.innerText || a.innerText || '').slice(0, 700) });
  });
  if (!jobs.length) { alert('Level Up: no jobs found on this page. Open My Jobs → Saved (or a single job) and wait for it to load.'); return; }

  // LinkedIn shows the Saved list 10 per page; note when more exist.
  var savedTotal = +((((document.querySelector('main') || document.body).innerText || '').match(/Saved\s*·\s*(\d+)/) || [])[1] || 0);
  var moreNote = savedTotal > jobs.length ? ' LinkedIn shows ' + savedTotal + ' saved jobs but only ' + jobs.length + ' are on this page — open the next page and click the bookmark again.' : '';

  var done = {};
  try { done = JSON.parse(localStorage.getItem(DONE_KEY) || '{}') || {}; } catch (e) { done = {}; }
  var todo = jobs.filter(function (j) { return !done[j.id]; }).slice(0, MAX_PER_RUN);
  if (!todo.length) { if (moreNote) alert('Level Up:' + moreNote); send('lijobs', jobs); return; }

  window.__luSyncRunning = true;
  var ui = document.createElement('div');
  ui.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;width:320px;padding:16px 18px;border-radius:6px;'
    + 'background:#141414;color:#eee;font:14px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.5)';
  ui.innerHTML = '<div style="font-weight:600;margin-bottom:6px">Level Up</div><div data-msg></div>'
    + '<div data-bar style="height:3px;background:#333;margin:10px 0;border-radius:2px"><div data-fill style="height:3px;width:0;background:#eee;border-radius:2px"></div></div>'
    + '<button data-stop style="all:unset;cursor:pointer;color:#aaa;font-size:12.5px;text-decoration:underline">Stop and send what\'s read</button>';
  document.body.appendChild(ui);
  var msg = ui.querySelector('[data-msg]'), fill = ui.querySelector('[data-fill]');
  var frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;top:0;left:0;width:1200px;height:900px;opacity:0;pointer-events:none;z-index:-1;border:0';
  document.body.appendChild(frame);

  var i = 0, stopped = false, timer = null, poll = null;
  function finish() {
    stopped = true; clearTimeout(timer); clearInterval(poll);
    frame.remove(); window.__luSyncRunning = false;
    var read = jobs.filter(function (j) { return j.detail; }).length;
    msg.textContent = 'Read ' + read + ' job page' + (read === 1 ? '' : 's') + '. ' + jobs.length + ' saved job' + (jobs.length === 1 ? '' : 's') + ' ready to send.' + moreNote;
    fill.style.width = '100%';
    ui.querySelector('[data-stop]').remove();
    var b = document.createElement('button');
    b.textContent = 'Open in Level Up';
    b.style.cssText = 'all:unset;cursor:pointer;background:#eee;color:#111;padding:8px 14px;border-radius:4px;font-weight:600;margin-top:4px';
    b.onclick = function () {
      send('lijobs', jobs);
      jobs.forEach(function (j) { if (j.detail) done[j.id] = Date.now(); });
      try { localStorage.setItem(DONE_KEY, JSON.stringify(done)); } catch (e) { /* storage full or blocked */ }
      ui.remove();
    };
    ui.appendChild(b);
  }
  ui.querySelector('[data-stop]').onclick = finish;

  function next() {
    if (stopped) return;
    if (i >= todo.length) { finish(); return; }
    var j = todo[i], tries = 0, phase = 'load', netTries = 0;
    msg.textContent = 'Reading job ' + (i + 1) + ' of ' + todo.length + '… keep this tab in front.';
    frame.src = location.origin + '/jobs/view/' + j.id + '/';
    poll = setInterval(function () {
      if (stopped) { clearInterval(poll); return; }
      // LinkedIn only loads the job details while this tab is on screen, so
      // wait (without using up tries) whenever Dhruv switches away.
      if (document.hidden) { msg.textContent = 'Paused — bring this LinkedIn tab back to the front to continue (job ' + (i + 1) + ' of ' + todo.length + ').'; return; }
      msg.textContent = 'Reading job ' + (i + 1) + ' of ' + todo.length + '… keep this tab in front.';
      tries++;
      var d = null;
      try { d = frame.contentDocument; } catch (e) { d = null; }
      var box = d && (d.querySelector(BOX) || d.querySelector('main'));
      // LinkedIn loads the description and "People you can reach out to" only as
      // its inner panel scrolls, so scroll it a step each second until the end.
      var sc = d && (d.querySelector('main#workspace') || d.querySelector('main'));
      var atEnd = true;
      var txt = box ? (box.innerText || '') : '';
      var ready = /about the job/i.test(txt);
      if (sc) {
        // At the bottom but not loaded yet: jump back to the top and come down again.
        if (!ready && sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 10) sc.scrollTop = 0;
        else sc.scrollTop = sc.scrollTop + 500;
        atEnd = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 10;
        try { sc.dispatchEvent(new Event('scroll')); d.defaultView.scrollBy(0, 500); } catch (e) { /* not scrollable */ }
      }
      if (phase === 'load' && ready && (atEnd || tries >= 12) && tries >= 4) {
        var show = findShowAll(d);
        if (show) { try { show.click(); } catch (e) { /* ignore */ } phase = 'network'; return; }
        phase = 'done';
      }
      if (phase === 'network') {
        netTries++;
        var net = readNetwork(d);
        if (!net && netTries < 6) return;
        j.detail = withNetwork(readJob(d, j.id), net);
        phase = 'done';
      }
      if (phase === 'done' || tries >= 30) {
        clearInterval(poll);
        if (ready && !j.detail) j.detail = readJob(d, j.id);
        i++;
        fill.style.width = Math.round((i / todo.length) * 100) + '%';
        if (i >= todo.length) { finish(); return; }
        var end = Date.now() + PACE_MS;
        (function tick() {
          if (stopped) return;
          var s = Math.ceil((end - Date.now()) / 1000);
          if (s <= 0) { next(); return; }
          msg.textContent = 'Read ' + i + ' of ' + todo.length + '. Next job in ' + s + 's — keep this tab in front.';
          timer = setTimeout(tick, 1000);
        })();
      }
    }, 1000);
  }
  next();
};
