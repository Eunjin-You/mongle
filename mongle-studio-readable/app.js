/*
 * 몽글작업실 - 나의 작은 집필실 | working, backend-free MVP
 * Data: localStorage only. Start with index.html in the same folder as style.css and app.js.
 */
(() => {
  'use strict';
  const KEY = 'moeum-studio-v1';
  const MODE = {
    gentle: { name: '조금 버거운 날', time: 15, count: 1, chunk: 10, description: '오늘은 10분짜리 시작 하나면 충분해요.' },
    steady: { name: '평소 같은 날', time: 50, count: 2, chunk: 25, description: '조용히 25분씩 두 번, 무리 없이 이어가요.' },
    bright: { name: '잘 풀릴 것 같은 날', time: 90, count: 3, chunk: 45, description: '조금 길게 몰입해도 좋겠어요. 쉴 틈도 남겨두고요.' }
  };
  const TYPE = {
    writing: { name: '글쓰기', title: '작가님의 집필실이 열렸습니다.', subtitle: '오늘부터 이 공간은 당신의 원고가 자라는 집필실입니다.', role: 'WRITING STUDIO', noun: '원고', verb: '써낸' },
    design: { name: '디자인', title: '당신의 디자인 스튜디오가 열렸습니다.', subtitle: '아직 스케치여도 괜찮아요. 하나의 결과물은 여기서 시작됩니다.', role: 'DESIGN STUDIO', noun: '작업물', verb: '만들어낸' },
    coding: { name: '개발', title: '당신의 메이커 스튜디오가 열렸습니다.', subtitle: '머릿속의 구상이 실제로 움직이는 순간을 기록할게요.', role: 'MAKER STUDIO', noun: '프로덕트', verb: '구현한' },
    other: { name: '다른 프로젝트', title: '당신의 프로젝트가 정식으로 시작됐습니다.', subtitle: '아직 완성되지 않았지만, 이제 분명한 이름이 생겼습니다.', role: 'PERSONAL STUDIO', noun: '결과물', verb: '만든' }
  };
  const FEELINGS = ['차분해요', '조금 불안해요', '자꾸 미루게 돼요', '기운이 없어요', '아이디어가 많아요'];
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const uid = () => (globalThis.crypto && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  const localDate = (date = new Date()) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const prettyDate = (dateString) => { const d = new Date(dateString + 'T12:00:00'); return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(d); };
  const mins = (n) => `${Math.max(0, Math.round(Number(n) || 0))}분`;
  const initial = () => ({ version: 1, projects: [], days: {}, sessions: [], entries: [], activeSession: null });
  let state;
  try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); state = saved && Array.isArray(saved.projects) && saved.days && Array.isArray(saved.entries) ? { ...initial(), ...saved } : initial(); }
  catch { state = initial(); }

  const ui = { screen: state.projects.length ? 'home' : 'welcome', projectId: null, phaseId: null, planId: null, selectedMode: 'steady', selectedFeeling: '', ready: 'yes', focusTarget: 25, checkoutResult: 'completed', rewardEntryId: null };
  const app = document.getElementById('app');
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast('저장 공간이 부족합니다. 브라우저 설정을 확인해주세요.'); } };
  const project = (id = ui.projectId) => state.projects.find(x => x.id === id);
  const phase = (p = project(), id = ui.phaseId) => p?.phases.find(x => x.id === id);
  const day = (date = localDate()) => state.days[date] || null;
  const ensureDay = () => { const key = localDate(); if (!state.days[key]) state.days[key] = { date: key, mode: 'steady', feeling: '', plans: [], createdAt: Date.now() }; return state.days[key]; };
  const theme = (p) => TYPE[p?.type] || TYPE.other;
  const eligible = () => state.projects.flatMap(p => p.phases.filter(ph => !ph.done && ph.nextAction).map(ph => ({ p, ph, key: `${p.id}:${ph.id}` })));
  const allDoneCount = (p) => p.phases.filter(x => x.done).length;
  const renderShell = (html, wider = false) => { app.innerHTML = `<section class="screen ${wider ? 'wide' : ''}">${html}</section>`; document.querySelector('.top-nav').style.visibility = state.projects.length ? 'visible' : 'hidden'; document.title = `${titleForScreen(ui.screen)} · 몽글작업실`; };
  const titleForScreen = (s) => ({ welcome: '시작', 'project-new': '새 프로젝트', ceremony: '프로젝트 시작', 'phase-new': '단계 만들기', 'action-new': '첫 행동 찾기', readiness: '시작 준비', mood: '오늘의 컨디션', plan: '오늘의 작업 배분', home: '내 작업실', library: '프로젝트 목록', 'project-detail': '프로젝트 상세', focus: '집중', checkout: '작업 기록', reward: '오늘의 기록', journal: '작업 일지' }[s] || '작업실');
  const progress = (number, total = 6) => `<div class="progress-top"><span>STEP ${String(number).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span><div class="track"><span style="width:${number / total * 100}%"></span></div><span>프로젝트의 첫걸음</span></div>`;
  const intro = (eyebrow, headline, sub = '') => `<div class="intro"><p class="eyebrow">${eyebrow}</p><h1 class="page-title">${headline}</h1>${sub ? `<p class="subtext">${sub}</p>` : ''}</div>`;
  const button = (action, label, css = 'primary', extra = '') => `<button type="button" class="${css}" data-action="${action}" ${extra}>${label}</button>`;
  const back = (screen, label = '나중에 할게요') => `<button class="quiet bottom-link" type="button" data-action="navigate" data-screen="${screen}">${label}</button>`;
  const projectLabel = (p) => theme(p).name;
  const screen = (s) => { ui.screen = s; render(); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const focusedTask = () => { const d = day(); return d?.plans.find(x => x.id === ui.planId); };
  const sessionElapsed = (s = state.activeSession) => !s ? 0 : Math.max(0, s.accumulatedSeconds + (s.running && s.lastResumeAt ? (Date.now() - s.lastResumeAt) / 1000 : 0));

  function render() {
    switch (ui.screen) {
      case 'welcome': return renderWelcome();
      case 'project-new': return renderProjectNew();
      case 'ceremony': return renderCeremony();
      case 'phase-new': return renderPhaseNew();
      case 'action-new': return renderActionNew();
      case 'readiness': return renderReadiness();
      case 'mood': return renderMood();
      case 'plan': return renderPlan();
      case 'home': return renderHome();
      case 'library': return renderLibrary();
      case 'project-detail': return renderProjectDetail();
      case 'focus': return renderFocus();
      case 'checkout': return renderCheckout();
      case 'reward': return renderReward();
      case 'journal': return renderJournal();
      default: return screen('home');
    }
  }


  // ===== HTML templates =====
  // These screens are written in index.html as <template id="view-...">.
  // JS only fills in data that changes; edits to wording/layout belong in HTML.
  function showHtmlView(name) {
    const source = document.getElementById(`view-${name}`);
    if (!source) throw new Error(`Missing HTML screen template: view-${name}`);
    app.replaceChildren(source.content.cloneNode(true));
    document.querySelector('.top-nav').style.visibility = state.projects.length ? 'visible' : 'hidden';
    document.title = `${titleForScreen(ui.screen)} · 몽글작업실`;
  }
  function putText(selector, value) {
    const target = $(selector, app);
    if (target) target.textContent = String(value ?? '');
  }
  // ===== End HTML templates =====


  function renderWelcome() {
    showHtmlView('welcome');
  }

  function renderProjectNew() {
    showHtmlView('project-new');
    $('#project-new-back').dataset.screen = state.projects.length ? 'library' : 'welcome';
  }

  function renderCeremony() {
    const p = project();
    if (!p) return screen('library');
    showHtmlView('ceremony');
    const t = theme(p);
    putText('#ceremony-role', `${t.role} · PROJECT ${String(state.projects.indexOf(p) + 1).padStart(2, '0')}`);
    putText('#ceremony-title', t.title);
    putText('#ceremony-subtitle', t.subtitle);
    putText('#ceremony-project', p.title);
    putText('#ceremony-definition', `완성의 기준 · ${p.definition}`);
    const next = $('#ceremony-next');
    next.dataset.action = p.phases.length ? 'after-ceremony-ready' : 'after-ceremony';
    next.textContent = p.phases.length ? '오늘의 작업 시작하기 →' : '첫 번째 단계를 정해볼까요? →';
  }

  function renderPhaseNew() {
    const p = project();
    if (!p) return screen('library');
    showHtmlView('phase-new');
    putText('#phase-project-name', p.title);
  }

  function renderActionNew() {
    const p = project(), ph = phase();
    if (!p || !ph) return screen('library');
    showHtmlView('action-new');
    putText('#action-phase-name', `현재 단계 · ${ph.title}`);
    $('#action-title-field').value = ph.nextAction?.title || '';
    const estimate = Number(ph.nextAction?.estimatedMinutes || 25);
    $('#estimate-value').value = estimate;
    document.querySelectorAll('#estimate-pills .pill').forEach(item => {
      item.classList.toggle('selected', Number(item.dataset.value) === estimate);
    });
  }

  function renderReadiness() {
    const ph = phase();
    if (!ph?.nextAction) return screen('project-detail');
    showHtmlView('readiness');
    putText('#readiness-action-title', ph.nextAction.title);
    putText('#readiness-action-minutes', `예상 ${mins(ph.nextAction.estimatedMinutes)}`);
    document.querySelectorAll('#ready-options .choice-card').forEach(item => {
      item.classList.toggle('selected', item.dataset.value === ui.ready);
    });
    $('#readiness-extra').classList.toggle('hidden', ui.ready !== 'no');
  }

  function renderMood() {
    const d = day();
    const selected = ui.selectedMode || d?.mode || 'steady';
    showHtmlView('mood');
    document.querySelectorAll('#mode-options .choice-card').forEach(item => {
      item.classList.toggle('selected', item.dataset.value === selected);
    });
    document.querySelectorAll('#feeling-options .pill').forEach(item => {
      item.classList.toggle('selected', item.dataset.value === ui.selectedFeeling);
    });
  }
  function renderPlan() {
    const d = ensureDay(), m = MODE[d.mode] || MODE.steady, candidates = eligible();
    const previous = d.plans.filter(x => x.status === 'planned').map(x => `${x.projectId}:${x.phaseId}`);
    const initialKey = ui.projectId && ui.phaseId ? `${ui.projectId}:${ui.phaseId}` : candidates[0]?.key;
    const defaultSelected = previous.length ? previous : initialKey ? [initialKey] : [];
    renderShell(`${progress(6)}${intro('SET TODAY’S PACE', '오늘은 여기까지만<br>해보면 어떨까요?', '오늘의 컨디션에 맞춰 추천해봤어요. 실제 작업량은 직접 바꿀 수 있어요.')}<div class="task-preview"><span class="mini-kicker">${esc(m.name)} · 추천 배분</span><strong>${m.count}개 이내의 행동 · 총 ${m.time}분 정도</strong><small>${esc(m.description)}</small></div>${candidates.length ? `<form class="paper" data-form="save-plan"><p class="field-label">오늘 해볼 행동</p>${candidates.map(({ p, ph, key }, i) => { const checked = defaultSelected.includes(key); const old = d.plans.find(x => `${x.projectId}:${x.phaseId}` === key && x.status === 'planned'); const allocated = old?.allocatedMinutes || Math.min(MODE[d.mode].chunk, ph.nextAction.estimatedMinutes); return `<label class="allocation-row"><input type="checkbox" data-plan-check="${esc(key)}" ${checked ? 'checked' : ''} /><span class="allocation-main"><strong>${esc(ph.nextAction.title)}</strong><small>${esc(p.title)} · 전체 예상 ${mins(ph.nextAction.estimatedMinutes)}</small></span><span style="display:flex;align-items:center;gap:3px"><input type="number" min="5" max="240" step="5" data-plan-minutes="${esc(key)}" value="${allocated}" aria-label="${esc(ph.nextAction.title)} 오늘 배정할 시간" /><small style="font-size:11px;color:var(--muted)">분</small></span></label>`; }).join('')}<div class="allocation-total"><span>오늘 배정한 시간</span><strong id="plan-total">계산 중</strong></div><p id="plan-advice" class="small-note" style="margin-top:12px"></p><button class="primary full" type="submit" style="margin-top:17px">이대로 오늘 작업실 열기 →</button></form>` : `<div class="paper"><div class="empty-state"><div class="empty-icon">✳</div><p>먼저 첫 행동 하나가 필요해요.</p></div>${button('add-phase-from-plan', '첫 단계 만들기 →', 'secondary full')}</div>`}<div class="tiny-toolbar">${button('navigate', '컨디션 다시 고르기', 'quiet', 'data-screen="mood"')}${button('navigate', '프로젝트 살펴보기', 'quiet', 'data-screen="library"')}</div>`);
    updatePlanTotals();
  }
  function renderHome() {
    if (!state.projects.length) return screen('welcome');
    const d = day(), plans = d?.plans || [];
    const pending = plans.filter(x => x.status === 'planned' && !!project(x.projectId));
    const finished = plans.filter(x => x.status !== 'planned');
    const next = pending[0];
    const activeP = next ? project(next.projectId) : project(ui.projectId) || state.projects[0];
    ui.projectId = activeP.id;
    const latest = state.entries.find(e => e.projectId === activeP.id);
    const recentHint = activeP.phases.find(x => !x.done && x.nextAction);
    const moodTitle = d ? MODE[d.mode]?.name : '아직 오늘의 속도를 정하지 않았어요';
    let mainContent;
    if (state.activeSession) {
      const ss = state.activeSession; const p = project(ss.projectId);
      mainContent = `<div class="project-sheet"><p class="overline">A SESSION IN PROGRESS</p><h2>${esc(ss.actionTitle)}</h2><p class="subtext">${esc(p?.title || '')} · ${ss.running ? '집중 중' : '잠시 멈춘 상태'}</p><div class="button-row">${button('resume-session', '작업 이어가기 →')}</div></div>`;
    } else if (next) {
      const p = project(next.projectId), ph = phase(p, next.phaseId);
      mainContent = `<div class="project-sheet"><p class="overline">TODAY’S FIRST MOVE</p><h2>${esc(next.title)}</h2><p class="subtext">${esc(p?.title)} / ${esc(ph?.title || '')}</p><div class="sheet-footer"><span>오늘은 ${mins(next.allocatedMinutes)}만 시작하기</span><span>✳ 이어서 만들기</span></div><div class="button-row">${button('start-plan', '이 작업 시작하기 →', 'primary', `data-id="${esc(next.id)}"`)}</div></div>`;
    } else if (recentHint) {
      mainContent = `<div class="project-sheet"><p class="overline">READY WHEN YOU ARE</p><h2>${esc(recentHint.nextAction.title)}</h2><p class="subtext">다음 행동이 준비되어 있어요. 컨디션에 맞는 작업량을 정해볼까요?</p><div class="button-row">${button('plan-today', '오늘의 작업 정하기 →')}</div></div>`;
    } else {
      mainContent = `<div class="project-sheet"><p class="overline">A NEW CHAPTER</p><h2>다음 작업 단계를 정해볼까요?</h2><p class="subtext">지금까지의 작업은 여기에 그대로 남아 있어요.</p><div class="button-row">${button('add-phase-from-home', '다음 단계 만들기 →')}</div></div>`;
    }
    renderShell(`<div class="home-hero"><p class="eyebrow">YOUR PERSONAL STUDIO · ${esc(prettyDate(localDate()))}</p><h1 class="home-heading">${esc(activeP.title)}</h1><p class="subtext">${esc(activeP.definition)}</p><div class="stat-line"><span>완성된 단계 <strong>${allDoneCount(activeP)}</strong> / ${activeP.phases.length}</span><span>쌓인 작업 기록 <strong>${state.entries.filter(e => e.projectId === activeP.id && e.result !== 'not_completed').length}</strong>개</span></div></div>${mainContent}<div class="tiny-toolbar">${button('open-project', '프로젝트 전체 보기 ↗', 'quiet', `data-id="${esc(activeP.id)}"`)}${button('plan-today', `오늘 컨디션 변경 · ${esc(moodTitle)}`, 'quiet')}</div>${finished.length || pending.length > 1 ? `<details class="paper flat" style="margin-top:25px"><summary style="cursor:pointer;font-size:13px;font-weight:700">오늘 작업 기록과 나머지 일정 (${finished.length + Math.max(0, pending.length - 1)})</summary><div class="phase-list">${[...finished, ...pending.slice(1)].map(pl => `<div class="phase-item"><span class="phase-num">${pl.status === 'planned' ? '→' : '✓'}</span><div><h3>${esc(pl.title)}</h3><p>${pl.status === 'planned' ? '예정 · ' + mins(pl.allocatedMinutes) : '기록됨'}</p></div>${pl.status === 'planned' ? button('start-plan', '시작', 'quiet', `data-id="${esc(pl.id)}"`) : ''}</div>`).join('')}</div></details>` : ''}<p class="small-note" style="margin-top:28px">오늘 한 일이 작더라도, 다음에 어디서 이어갈지 알면 충분합니다.</p>`);
  }
  function renderLibrary() {
    renderShell(`${intro('YOUR WORKS', '지금 만들고 있는 것들.', '모든 프로젝트에는 저마다의 속도가 있어요.')}<div class="choice-stack">${state.projects.map((p, i) => `<button type="button" class="choice-card" data-action="open-project" data-id="${esc(p.id)}"><span><span class="mini-kicker">${esc(projectLabel(p))} · PROJECT ${String(i + 1).padStart(2, '0')}</span><span class="choice-title" style="display:block;margin-top:5px">${esc(p.title)}</span><span class="choice-desc">${allDoneCount(p)} / ${p.phases.length} 단계 완료 · 작업 기록 ${state.entries.filter(e => e.projectId === p.id).length}개</span></span><span class="choice-icon">↗</span></button>`).join('')}</div><div class="button-row">${button('new-project', '+ 새 프로젝트 등록', 'secondary')}${button('navigate', '내 작업실로', 'quiet', 'data-screen="home"')}</div>`);
  }
  function renderProjectDetail() {
    const p = project(); if (!p) return screen('library');
    const entries = state.entries.filter(e => e.projectId === p.id && e.result !== 'not_completed');
    renderShell(`${intro(`${esc(theme(p).role)} · PROJECT`, esc(p.title), `완성의 기준 · ${esc(p.definition)}`)}<div class="stat-line"><span>현재 단계 <strong>${p.phases.length - allDoneCount(p)}</strong>개 남음</span><span>완성된 단계 <strong>${allDoneCount(p)}</strong>개</span><span>진전 기록 <strong>${entries.length}</strong>개</span></div><p class="mini-kicker" style="margin:28px 0 15px">프로젝트의 단계들</p>${p.phases.length ? `<div class="phase-list">${p.phases.map((ph, i) => `<div class="phase-item"><span class="phase-num">${ph.done ? '✓' : String(i + 1).padStart(2, '0')}</span><div style="flex:1"><h3>${esc(ph.title)}</h3><p>${ph.done ? '완성한 단계' : ph.nextAction ? '다음 행동 · ' + esc(ph.nextAction.title) : '다음 행동이 아직 없어요'}</p></div><div class="phase-actions">${!ph.done ? button('edit-action', ph.nextAction ? '행동 수정 ↗' : '첫 행동 →', 'quiet', `data-id="${esc(ph.id)}"`) : ''}${!ph.done ? button('finish-phase', '단계 완료', 'quiet', `data-id="${esc(ph.id)}"`) : button('reopen-phase', '다시 열기', 'quiet', `data-id="${esc(ph.id)}"`)}</div></div>`).join('')}</div>` : '<div class="empty-state"><p>첫 번째 단계를 만들어볼까요?</p></div>'}<div class="button-row">${button('add-phase', '+ 새 단계 추가', 'secondary')}${button('plan-today', '오늘 작업 배분하기 →')}</div><div class="tiny-toolbar">${button('navigate', '다른 프로젝트 보기', 'quiet', 'data-screen="library"')}${button('navigate', '작업 일지 보기', 'quiet', 'data-screen="journal"')}</div>`);
  }
  function renderFocus() {
    const pl = focusedTask(); if (!pl) return screen('home');
    const p = project(pl.projectId), ph = phase(p, pl.phaseId), ss = state.activeSession;
    const isThis = ss?.planId === pl.id;
    if (ss && !isThis) return screen('home');
    const target = isThis ? ss.targetMinutes : ui.focusTarget;
    const elapsed = isThis ? sessionElapsed(ss) : 0;
    renderShell(`<div class="focus-shell"><p class="eyebrow">A QUIET MOMENT TO MAKE SOMETHING</p><h1 class="page-title">지금은 이것 하나만.</h1><div class="task-preview" style="text-align:left;margin-top:25px"><span class="mini-kicker">${esc(p?.title || '')} / ${esc(ph?.title || '')}</span><strong>${esc(pl.title)}</strong><small>오늘 배정한 시간 · ${mins(pl.allocatedMinutes)}</small></div><span class="focus-status" id="focus-status">${!isThis ? '시작할 준비가 되었어요' : ss.running ? '집중하고 있어요' : '잠시 쉬는 중'}</span><div class="timer" id="timer-display" aria-label="집중 시간">${formatTimer(target ? Math.max(0, target * 60 - elapsed) : elapsed)}</div><p id="timer-notice" class="timer-notice">${target ? '남은 시간' : '경과한 시간'}${target && elapsed >= target * 60 ? ' · 정해둔 시간을 채웠어요' : ''}</p>${!isThis ? `<div style="margin:22px auto 0;max-width:410px"><p class="field-label">이번 작업의 집중 시간</p><div class="pill-row" style="justify-content:center">${[0, 10, 15, 25, 45, 90].map(v => `<button class="pill ${target === v ? 'selected' : ''}" type="button" data-action="focus-target" data-value="${v}">${v === 0 ? '자유롭게' : v + '분'}</button>`).join('')}</div></div><div class="button-row">${button('begin-focus', '조용히 시작하기 →')}</div>` : `<div class="button-row">${button(ss.running ? 'pause-focus' : 'resume-focus', ss.running ? '잠시 쉬기' : '계속하기', 'secondary')}${button('finish-focus', '작업 기록하기 →')}</div>`}<p class="focus-caption" style="margin-top:25px">시간은 압박이 아니라, 시작을 돕기 위한 작은 기준입니다.</p>${!isThis ? back('home', '아직 시작하지 않을게요') : `<div class="tiny-toolbar" style="justify-content:center">${button('navigate', '작업실로 돌아가기 (타이머 유지)', 'quiet', 'data-screen="home"')}</div>`}</div>`);
    updateTimer();
  }

  function renderCheckout() {
    const ss = state.activeSession;
    if (!ss) return screen('home');
    const p = project(ss.projectId), ph = phase(p, ss.phaseId);
    const total = Math.round(sessionElapsed(ss) / 60);
    const suggestion = ph?.returnAction?.title || '';
    showHtmlView('checkout');
    putText('#checkout-action-title', ss.actionTitle);
    putText('#checkout-actual-minutes', `실제 집중 시간 · 약 ${mins(total)}`);
    $('#checkout-next-action').value = suggestion;
    $('#checkout-result').value = ui.checkoutResult;
    document.querySelectorAll('.result-choices .choice-card').forEach(item => {
      item.classList.toggle('selected', item.dataset.value === ui.checkoutResult);
    });
    const checkbox = $('[name=phaseDone]');
    checkbox.disabled = ui.checkoutResult === 'not_completed';
  }

  function renderReward() {
    const entry = state.entries.find(e => e.id === ui.rewardEntryId) || state.entries[0];
    if (!entry) return screen('home');
    const p = project(entry.projectId), t = theme(p);
    const total = state.entries.filter(x => x.projectId === entry.projectId && x.result !== 'not_completed').length;
    const heading = entry.result === 'completed'
      ? `${t.verb} 것이\n오늘 하나 더 생겼어요.`
      : entry.result === 'partial' ? '아직 쓰는 중이어도,\n분명 앞으로 갔어요.'
      : '시작이 어려웠던 날도\n기록은 남습니다.';
    const sub = entry.result === 'completed'
      ? `${t.noun}은 어느 날 갑자기 완성되는 게 아니라, 이렇게 조금씩 모습을 갖춰요.`
      : entry.result === 'partial' ? '완료 표시가 없어도 오늘 움직인 만큼은 사라지지 않아요.'
      : '못 한 일을 성공으로 바꾸지는 않아요. 대신 다음 시작을 더 쉽게 준비해봐요.';
    showHtmlView('reward');
    putText('#reward-heading', heading);
    putText('#reward-subtext', sub);
    putText('#reward-project', `오늘의 작업 일지 · ${p?.title || '내 프로젝트'}`);
    putText('#reward-proof', entry.proof || '오늘은 작업의 어려움을 확인했어요.');
    putText('#reward-count', `이 프로젝트에 쌓인 작업 기록 ${total}개`);
  }
  function renderJournal() {
    const entries = [...state.entries].sort((a, b) => b.createdAt - a.createdAt);
    renderShell(`${intro('A RECORD OF MAKING', '작업이 쌓인 자리.', '체크한 목록보다, 실제로 만들어낸 것을 기억할게요.')}<div class="paper">${entries.length ? entries.map(e => { const p = project(e.projectId); return `<article class="journal-entry"><span class="journal-date">${esc(new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(e.createdAt)))}</span><h3>${esc(e.actionTitle)}</h3><p>${esc(p?.title || '이전 프로젝트')} · ${e.result === 'completed' ? '완료' : e.result === 'partial' ? '일부 진행' : '다음에 다시 시작'}</p>${e.proof ? `<div class="entry-detail">${esc(e.proof)}</div>` : ''}${e.nextAction ? `<p style="margin-top:12px">다음 행동 → ${esc(e.nextAction)}</p>` : ''}<span class="small-note">집중 약 ${mins(e.actualMinutes)}</span></article>`; }).join('') : `<div class="empty-state"><div class="empty-icon">✧</div><p>첫 번째 작업을 기록하면 여기에 쌓여요.</p></div>`}</div><div class="button-row">${button('navigate', '내 작업실로', 'secondary', 'data-screen="home"')}</div>`);
  }
  function formatTimer(seconds) { seconds = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
  function updateTimer() {
    if (ui.screen !== 'focus') return;
    const s = state.activeSession, target = s ? s.targetMinutes : ui.focusTarget, elapsed = s ? sessionElapsed(s) : 0;
    const clock = $('#timer-display'); if (clock) clock.textContent = formatTimer(target ? Math.max(0, target * 60 - elapsed) : elapsed);
    const notice = $('#timer-notice'); if (notice) notice.textContent = target ? elapsed >= target * 60 && s ? '정해둔 시간을 채웠어요. 계속해도 괜찮아요.' : '남은 시간' : '경과한 시간';
  }
  function updatePlanTotals() {
    const inputs = [...document.querySelectorAll('[data-plan-check]')];
    let total = 0, count = 0;
    inputs.forEach(check => { const row = check.closest('.allocation-row'); const number = row?.querySelector('[data-plan-minutes]'); if (check.checked) { count += 1; total += Math.max(1, Number(number?.value) || 1); } });
    const display = $('#plan-total'); if (display) display.textContent = mins(total);
    const advice = $('#plan-advice'), m = MODE[day()?.mode] || MODE.steady;
    if (advice) advice.textContent = !count ? '오늘은 하나만 골라도 괜찮아요.' : total > m.time || count > m.count ? `추천(${m.count}개 · ${m.time}분)보다 조금 많아요. 부담된다면 하나만 남겨도 좋아요.` : `오늘의 컨디션에 잘 맞는 분량이에요. 이 추천은 언제든 바꿀 수 있어요.`;
  }
  let toastTimer;
  function toast(text) { document.querySelector('.toast')?.remove(); const t = document.createElement('div'); t.className = 'toast'; t.textContent = text; document.body.append(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 3200); }

  function setDemo() {
    const p = { id: uid(), title: '나의 첫 장편소설', type: 'writing', definition: '처음부터 끝까지 읽을 수 있는 초고 한 편이 생겼을 때', createdAt: Date.now(), phases: [{ id: uid(), title: '도입부 초고 쓰기', done: false, completedAt: null, nextAction: { id: uid(), title: '첫 장면의 장소 세 군데 적기', estimatedMinutes: 25 }, returnAction: null }] };
    state.projects.push(p); ui.projectId = p.id; ui.phaseId = p.phases[0].id; save(); screen('ceremony');
  }
  function savePlan(form) {
    const d = ensureDay(); const checks = [...form.querySelectorAll('[data-plan-check]:checked')];
    if (!checks.length) return toast('오늘 해볼 행동을 하나 골라주세요.');
    const current = new Map(eligible().map(x => [x.key, x]));
    const existing = d.plans.filter(pl => pl.status !== 'planned');
    const future = checks.map(check => {
      const c = current.get(check.dataset.planCheck); if (!c) return null;
      const num = form.querySelectorAll('[data-plan-minutes]'); const field = [...num].find(x => x.dataset.planMinutes === check.dataset.planCheck);
      const allocatedMinutes = Math.max(1, Math.min(240, Number(field?.value) || 10));
      const old = d.plans.find(pl => pl.status === 'planned' && pl.projectId === c.p.id && pl.phaseId === c.ph.id);
      return { id: old?.id || uid(), projectId: c.p.id, phaseId: c.ph.id, actionId: c.ph.nextAction.id, title: c.ph.nextAction.title, estimatedMinutes: c.ph.nextAction.estimatedMinutes, allocatedMinutes, status: 'planned' };
    }).filter(Boolean);
    d.plans = [...existing, ...future]; save(); screen('home');
  }
  function openPlan(id) {
    const pl = day()?.plans.find(x => x.id === id); if (!pl) return toast('작업을 찾지 못했어요.');
    if (state.activeSession && state.activeSession.planId !== id) return toast('진행 중인 작업을 먼저 기록해주세요.');
    ui.planId = id; ui.projectId = pl.projectId; ui.phaseId = pl.phaseId; ui.focusTarget = pl.allocatedMinutes;
    screen('focus');
  }
  function finalizeSession(form) {
    const ss = state.activeSession, pl = focusedTask(); if (!ss || !pl) return screen('home');
    const p = project(ss.projectId), ph = phase(p, ss.phaseId); if (!p || !ph) return toast('프로젝트를 찾지 못했어요.');
    const fd = new FormData(form), result = String(fd.get('result'));
    const proof = String(fd.get('proof') || '').trim();
    const nextAction = String(fd.get('nextAction') || '').trim();
    const phaseDone = fd.get('phaseDone') === 'on';
    if (result !== 'not_completed' && !proof) return toast('오늘 실제로 한 일을 한 줄만 적어주세요.');
    const actualMinutes = Math.round(sessionElapsed(ss) / 60);
    if (ss.running) { ss.accumulatedSeconds = sessionElapsed(ss); ss.running = false; ss.lastResumeAt = null; }
    const entry = { id: uid(), projectId: p.id, phaseId: ph.id, actionTitle: ss.actionTitle, proof, result, actualMinutes, nextAction, createdAt: Date.now() };
    state.entries.unshift(entry);
    state.sessions.push({ id: ss.id, planId: pl.id, startTime: ss.startedAt, totalSeconds: ss.accumulatedSeconds, result });
    pl.status = result === 'completed' ? 'done' : result === 'partial' ? 'partial' : 'skipped';
    pl.actualMinutes = actualMinutes;
    if (result === 'completed' && phaseDone) { ph.done = true; ph.completedAt = Date.now(); ph.nextAction = null; ph.returnAction = null; }
    else if (nextAction) { ph.nextAction = { id: uid(), title: nextAction, estimatedMinutes: ph.returnAction?.estimatedMinutes || ph.nextAction?.estimatedMinutes || 25 }; ph.returnAction = null; }
    else if (ph.returnAction) { ph.nextAction = ph.returnAction; ph.returnAction = null; }
    state.activeSession = null; ui.checkoutResult = 'completed'; ui.rewardEntryId = entry.id; save(); screen('reward');
  }

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]'); if (!el) return;
    const a = el.dataset.action, id = el.dataset.id, value = el.dataset.value;
    switch (a) {
      case 'navigate': return screen(el.dataset.screen);
      case 'new-project': return screen('project-new');
      case 'sample-project': return setDemo();
      case 'after-ceremony': return screen('phase-new');
      case 'after-ceremony-ready': ui.selectedMode = 'steady'; return screen('mood');
      case 'add-phase': case 'add-phase-from-home': case 'add-phase-from-plan': {
        if (!project()) ui.projectId = state.projects[0]?.id;
        return screen('phase-new');
      }
      case 'open-project': ui.projectId = id; return screen('project-detail');
      case 'edit-action': ui.phaseId = id; return screen('action-new');
      case 'finish-phase': {
        const ph = phase(project(), id); if (!ph) return;
        if (!confirm(`'${ph.title}' 단계를 완성한 것으로 표시할까요?`)) return;
        ph.done = true; ph.completedAt = Date.now(); save(); return render();
      }
      case 'reopen-phase': { const ph = phase(project(), id); if (!ph) return; ph.done = false; ph.completedAt = null; save(); return render(); }
      case 'set-estimate': { $('#estimate-value').value = value; document.querySelectorAll('#estimate-pills .pill').forEach(x => x.classList.toggle('selected', x.dataset.value === value)); return; }
      case 'set-ready': ui.ready = value; return render();
      case 'confirm-readiness': {
        const ph = phase(); if (!ph) return;
        if (ui.ready === 'no') {
          const title = String($('#prep-title')?.value || '').trim(); if (!title) return toast('필요한 준비 행동을 한 줄만 적어주세요.');
          ph.returnAction = ph.nextAction;
          ph.nextAction = { id: uid(), title, estimatedMinutes: Number($('#prep-minutes')?.value) || 10 };
          save();
        }
        ui.selectedMode = day()?.mode || 'steady'; ui.selectedFeeling = day()?.feeling || '';
        return screen('mood');
      }
      case 'choose-mode': ui.selectedMode = value; return render();
      case 'choose-feeling': ui.selectedFeeling = ui.selectedFeeling === value ? '' : value; return render();
      case 'confirm-mood': { const d = ensureDay(); d.mode = ui.selectedMode; d.feeling = ui.selectedFeeling; save(); return screen('plan'); }
      case 'plan-today': ui.selectedMode = day()?.mode || 'steady'; ui.selectedFeeling = day()?.feeling || ''; return screen('mood');
      case 'start-plan': return openPlan(id);
      case 'resume-session': { const ss = state.activeSession; if (!ss) return; ui.planId = ss.planId; ui.projectId = ss.projectId; ui.phaseId = ss.phaseId; return screen('focus'); }
      case 'focus-target': ui.focusTarget = Number(value); return render();
      case 'begin-focus': {
        const pl = focusedTask(); if (!pl || state.activeSession) return;
        state.activeSession = { id: uid(), planId: pl.id, projectId: pl.projectId, phaseId: pl.phaseId, actionTitle: pl.title, targetMinutes: ui.focusTarget, startedAt: Date.now(), accumulatedSeconds: 0, lastResumeAt: Date.now(), running: true }; save(); return render();
      }
      case 'pause-focus': { const ss = state.activeSession; if (!ss?.running) return; ss.accumulatedSeconds = sessionElapsed(ss); ss.running = false; ss.lastResumeAt = null; save(); return render(); }
      case 'resume-focus': { const ss = state.activeSession; if (!ss || ss.running) return; ss.running = true; ss.lastResumeAt = Date.now(); save(); return render(); }
      case 'finish-focus': { const ss = state.activeSession; if (!ss) return; ss.accumulatedSeconds = sessionElapsed(ss); ss.running = false; ss.lastResumeAt = null; save(); return screen('checkout'); }
      case 'choose-result': { ui.checkoutResult = value; document.querySelectorAll('.result-choices .choice-card').forEach(x => x.classList.toggle('selected', x.dataset.value === value)); $('#checkout-result').value = value; const check = $('[name=phaseDone]'); if (check) { check.disabled = value === 'not_completed'; if (check.disabled) check.checked = false; } return; }
    }
  });
  document.addEventListener('change', (event) => { if (event.target.matches('[data-plan-check], [data-plan-minutes]')) updatePlanTotals(); });
  document.addEventListener('input', (event) => { if (event.target.matches('[data-plan-minutes]')) updatePlanTotals(); });
  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-form]'); if (!form) return;
    event.preventDefault(); const fd = new FormData(form);
    switch (form.dataset.form) {
      case 'project-new': {
        const title = String(fd.get('title') || '').trim(), definition = String(fd.get('definition') || '').trim();
        if (!title || !definition) return toast('프로젝트 이름과 완성 기준을 적어주세요.');
        const p = { id: uid(), title, definition, type: String(fd.get('type') || 'writing'), createdAt: Date.now(), phases: [] };
        state.projects.push(p); ui.projectId = p.id; save(); return screen('ceremony');
      }
      case 'phase-new': {
        const p = project(); if (!p) return;
        const title = String(fd.get('phaseTitle') || '').trim(); if (!title) return;
        const ph = { id: uid(), title, done: false, completedAt: null, nextAction: null, returnAction: null };
        p.phases.push(ph); ui.phaseId = ph.id; save(); return screen('action-new');
      }
      case 'action-new': {
        const ph = phase(); if (!ph) return;
        const title = String(fd.get('actionTitle') || '').trim(), estimate = Number(fd.get('estimate'));
        if (!title) return toast('첫 행동을 한 줄만 적어주세요.');
        ph.nextAction = { id: uid(), title, estimatedMinutes: estimate || 25 };
        ui.ready = 'yes'; save(); return screen('readiness');
      }
      case 'save-plan': return savePlan(form);
      case 'checkout': return finalizeSession(form);
    }
  });
  $('#brand-home').addEventListener('click', () => screen(state.projects.length ? 'home' : 'welcome'));
  $('#nav-projects').addEventListener('click', () => screen('library'));
  $('#nav-journal').addEventListener('click', () => screen('journal'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateTimer(); });
  setInterval(updateTimer, 500);
  render();
})();
