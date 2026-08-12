const app = document.querySelector('#app');
const toast = document.querySelector('#toast');

const OTHER_OPTION_ID = '__other__';
const THEME_STORAGE_KEY = 'grill-with-docs-ui-theme';
const sessionId = decodeURIComponent(location.pathname.split('/').filter(Boolean).at(-1) || '');
const token = new URLSearchParams(location.search).get('token') || '';

let bundle = null;
let activeRoundNumber = null;
let draftAnswers = [];
let draftTimer = null;
let saveStatusElement = null;
let answeredCountElement = null;
let lastUpdatedAt = null;
let submitting = false;

function element(tag, className = '', text = '') {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text !== '') value.textContent = text;
  return value;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `请求失败：${response.status}`);
  return data;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function currentRound() {
  return bundle.rounds.find((round) => round.roundNumber === activeRoundNumber);
}

function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The visual theme still works when browser storage is unavailable.
  }
  if (bundle) render();
}

function defaultAnswer(question) {
  if (question.type === 'text') {
    return {
      questionId: question.id,
      selectedOptionIds: [],
      customText: question.recommendedDraft || '',
    };
  }
  return {
    questionId: question.id,
    selectedOptionIds: [...(question.recommendedOptionIds || [])],
    customText: '',
  };
}

function normalizeLegacyOther(answer, question) {
  const normalized = structuredClone(answer);
  normalized.selectedOptionIds ||= [];
  normalized.customText ||= '';
  if (
    question.type !== 'text'
    && question.allowOther
    && normalized.customText.trim()
    && !normalized.selectedOptionIds.includes(OTHER_OPTION_ID)
  ) {
    normalized.selectedOptionIds.push(OTHER_OPTION_ID);
  }
  return normalized;
}

function answersForRound(round) {
  const source = round.answers?.answers
    || round.draft?.answers
    || round.questions.questions.map(defaultAnswer);
  const byId = new Map(source.map((answer) => [answer.questionId, answer]));
  return round.questions.questions.map((question) => normalizeLegacyOther(
    byId.get(question.id) || defaultAnswer(question),
    question,
  ));
}

function answerFor(questionId) {
  let answer = draftAnswers.find((item) => item.questionId === questionId);
  if (!answer) {
    answer = { questionId, selectedOptionIds: [], customText: '' };
    draftAnswers.push(answer);
  }
  return answer;
}

function optionLabel(question, optionId) {
  if (optionId === OTHER_OPTION_ID) return '其他';
  return question.options?.find((option) => option.id === optionId)?.label || optionId;
}

function displayAnswer(question, answer) {
  if (!answer) return '未填写';
  const selected = answer.selectedOptionIds || [];
  const parts = selected.map((id) => {
    if (id === OTHER_OPTION_ID) {
      return answer.customText?.trim() ? `其他：${answer.customText.trim()}` : '其他';
    }
    return optionLabel(question, id);
  });
  if (answer.customText?.trim() && !selected.includes(OTHER_OPTION_ID)) {
    parts.push(question.type === 'text' ? answer.customText.trim() : `其他：${answer.customText.trim()}`);
  }
  return parts.length ? parts.join('、') : '未填写';
}

function selectionCount(question, answer) {
  if (question.type === 'text') return answer.customText.trim() ? 1 : 0;
  const selected = answer.selectedOptionIds || [];
  const legacyOther = answer.customText.trim() && !selected.includes(OTHER_OPTION_ID) ? 1 : 0;
  return selected.length + legacyOther;
}

function answeredQuestionCount(round) {
  return round.questions.questions.reduce((count, question) => (
    count + (selectionCount(question, answerFor(question.id)) > 0 ? 1 : 0)
  ), 0);
}

function refreshProgress() {
  const round = currentRound();
  if (!round || !answeredCountElement) return;
  answeredCountElement.textContent = `已回答 ${answeredQuestionCount(round)} / ${round.questionCount} 题`;
}

function badge(text, active = false) {
  return element('span', `badge${active ? ' active' : ''}`, text);
}

function recommendBadge() {
  return element('span', 'badge recommended', '推荐');
}

function makeThemeButton(theme, label) {
  const button = element('button', 'theme-button', label);
  button.type = 'button';
  button.setAttribute('aria-pressed', String(currentTheme() === theme));
  button.addEventListener('click', () => setTheme(theme));
  return button;
}

function renderHeader(container) {
  const header = element('header', 'session-header');
  const copy = element('div', 'header-copy');
  copy.append(element('h1', 'session-title', `本次主题：${bundle.session.title}`));
  if (bundle.session.summary) {
    copy.append(element('p', 'session-summary', bundle.session.summary));
  }

  const tools = element('div', 'header-tools');
  const stats = element('div', 'session-stats');
  const statusText = bundle.session.status === 'active'
    ? '进行中'
    : bundle.session.status === 'completed' ? '已完成' : '已取消';
  stats.append(badge(statusText, bundle.session.status === 'active'));
  stats.append(badge(`${bundle.session.roundCount} 轮`));
  stats.append(badge(`${bundle.session.totalQuestionCount} 题`));
  const themes = element('div', 'theme-toggle');
  themes.setAttribute('aria-label', '页面主题');
  themes.append(makeThemeButton('light', '浅色主题'));
  themes.append(makeThemeButton('dark', '深色主题'));
  tools.append(stats, themes);
  header.append(copy, tools);
  container.append(header);
}

function renderTabs(container) {
  const tabs = element('nav', 'round-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', '问题轮次');
  for (const round of bundle.rounds) {
    const completed = ['submitted', 'processed'].includes(round.status);
    const button = element(
      'button',
      'round-tab',
      `第 ${round.roundNumber} 轮 · ${round.questionCount} 题${completed ? ' ✓' : ''}`,
    );
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(round.roundNumber === activeRoundNumber));
    button.addEventListener('click', () => {
      activeRoundNumber = round.roundNumber;
      draftAnswers = answersForRound(round);
      render();
    });
    tabs.append(button);
  }
  container.append(tabs);
}

function scheduleDraftSave() {
  if (draftTimer) clearTimeout(draftTimer);
  refreshProgress();
  if (saveStatusElement) saveStatusElement.textContent = '正在保存草稿…';
  draftTimer = setTimeout(async () => {
    const round = currentRound();
    if (!round || round.status !== 'waiting_for_user') return;
    try {
      await api(
        `/api/sessions/${encodeURIComponent(sessionId)}/rounds/${round.roundNumber}/draft`,
        { method: 'POST', body: JSON.stringify({ answers: draftAnswers }) },
      );
      if (saveStatusElement) saveStatusElement.textContent = '草稿已保存';
    } catch (error) {
      if (saveStatusElement) saveStatusElement.textContent = `保存失败：${error.message}`;
    }
  }, 500);
}

function recommendedText(question) {
  return question.recommendationReason ? `推荐理由：${question.recommendationReason}` : '';
}

function renderChoiceQuestion(card, question, answer, editable) {
  const list = element('div', 'option-list');
  for (const option of question.options) {
    const optionCard = element('label', 'option-card');
    const input = document.createElement('input');
    input.className = 'option-selector';
    input.type = question.type === 'single' ? 'radio' : 'checkbox';
    input.name = `question-${question.id}`;
    input.value = option.id;
    input.checked = answer.selectedOptionIds.includes(option.id);
    input.disabled = !editable;
    input.addEventListener('change', () => {
      if (question.type === 'single') {
        answer.selectedOptionIds = [option.id];
        answer.customText = '';
        const otherSelector = list.querySelector(`input[value="${OTHER_OPTION_ID}"]`);
        const otherText = list.querySelector('.other-input');
        if (otherSelector) otherSelector.checked = false;
        if (otherText) otherText.value = '';
      } else if (input.checked) {
        answer.selectedOptionIds = [...new Set([...answer.selectedOptionIds, option.id])];
      } else {
        answer.selectedOptionIds = answer.selectedOptionIds.filter((id) => id !== option.id);
      }
      scheduleDraftSave();
    });
    const content = element('span', 'option-content');
    const title = element('span', 'option-label', option.label);
    if (question.recommendedOptionIds?.includes(option.id)) {
      title.append(' ');
      title.append(recommendBadge());
    }
    content.append(title);
    if (option.description) {
      content.append(element('span', 'option-description', option.description));
    }
    optionCard.append(input, content);
    list.append(optionCard);
  }

  if (question.allowOther) {
    const otherCard = element('div', 'option-card option-other');
    const heading = element('label', 'other-heading');
    const selector = document.createElement('input');
    selector.className = 'option-selector';
    selector.type = question.type === 'single' ? 'radio' : 'checkbox';
    selector.name = `question-${question.id}`;
    selector.value = OTHER_OPTION_ID;
    selector.checked = answer.selectedOptionIds.includes(OTHER_OPTION_ID);
    selector.disabled = !editable;
    const content = element('span', 'option-content');
    content.append(element('span', 'option-label', '其他'));
    content.append(element('span', 'option-description', '可直接选择，也可以补充具体说明。'));
    heading.append(selector, content);

    const input = document.createElement('input');
    input.className = 'other-input';
    input.type = 'text';
    input.placeholder = '请输入补充说明（选填）';
    input.maxLength = 500;
    input.value = answer.customText || '';
    input.disabled = !editable;

    const setOtherSelected = (selected) => {
      if (selected) {
        answer.selectedOptionIds = question.type === 'single'
          ? [OTHER_OPTION_ID]
          : [...new Set([...answer.selectedOptionIds, OTHER_OPTION_ID])];
      } else {
        answer.selectedOptionIds = answer.selectedOptionIds.filter((id) => id !== OTHER_OPTION_ID);
        answer.customText = '';
        input.value = '';
      }
      selector.checked = selected;
    };

    selector.addEventListener('change', () => {
      setOtherSelected(selector.checked);
      scheduleDraftSave();
    });
    input.addEventListener('focus', () => {
      if (!selector.checked) {
        setOtherSelected(true);
        scheduleDraftSave();
      }
    });
    input.addEventListener('input', () => {
      setOtherSelected(true);
      answer.customText = input.value;
      scheduleDraftSave();
    });
    otherCard.append(heading, input);
    list.append(otherCard);
  }
  card.append(list);
}

function renderTextQuestion(card, question, answer, editable) {
  const input = document.createElement(question.multiline === false ? 'input' : 'textarea');
  const counter = element('span', 'text-counter');
  input.className = 'text-input';
  if (input.tagName === 'TEXTAREA') input.rows = 3;
  input.maxLength = question.maxLength || 4000;
  input.value = answer.customText || '';
  input.disabled = !editable;
  const updateCounter = () => {
    counter.textContent = `${input.value.length}/${input.maxLength}`;
  };
  input.addEventListener('input', () => {
    answer.customText = input.value;
    updateCounter();
    scheduleDraftSave();
  });
  updateCounter();
  card.append(input, counter);
}

function questionNumberOffset(roundNumber) {
  if (!bundle?.rounds?.length) return 0;
  return bundle.rounds
    .filter((round) => round.roundNumber < roundNumber)
    .reduce((sum, round) => sum + (round.questionCount || round.questions?.questions?.length || 0), 0);
}

function renderQuestion(question, editable, submittedAnswers, displayNumber) {
  const card = element('section', 'question-card');
  const number = element('span', 'question-number', `Q${displayNumber}`);
  const body = element('div', 'question-body');
  const header = element('div', 'question-header');
  const copy = element('div', 'question-copy');
  copy.append(element('h3', 'question-title', question.title));
  if (question.description) {
    copy.append(element('p', 'question-description', question.description));
  }
  header.append(copy);
  body.append(header);

  const answer = editable
    ? answerFor(question.id)
    : submittedAnswers?.find((item) => item.questionId === question.id);
  if (editable) {
    if (question.type === 'text') renderTextQuestion(body, question, answer, true);
    else renderChoiceQuestion(body, question, answer, true);
  } else {
    body.append(element('div', 'history-answer', displayAnswer(question, answer)));
  }
  if (recommendedText(question)) {
    body.append(element('p', 'recommendation', recommendedText(question)));
  }
  card.append(number, body);
  return card;
}

function clientValidation(round) {
  const errors = [];
  for (const question of round.questions.questions) {
    const answer = answerFor(question.id);
    const count = selectionCount(question, answer);
    if (question.required && count === 0) errors.push(`请回答“${question.title}”`);
    if (question.type === 'single' && count > 1) errors.push(`“${question.title}”只能选择一项`);
    if (question.type === 'multiple') {
      if (count < question.minSelections) {
        errors.push(`“${question.title}”至少选择 ${question.minSelections} 项`);
      }
      if (count > question.maxSelections) {
        errors.push(`“${question.title}”最多选择 ${question.maxSelections} 项`);
      }
    }
  }
  return errors;
}

async function submitRound(round, submitButton) {
  const errors = clientValidation(round);
  if (errors.length) {
    showToast(errors[0]);
    return;
  }
  if (submitting) return;
  submitting = true;
  submitButton.disabled = true;
  submitButton.textContent = '正在提交…';
  try {
    await api(
      `/api/sessions/${encodeURIComponent(sessionId)}/rounds/${round.roundNumber}/answers`,
      {
        method: 'POST',
        body: JSON.stringify({
          submissionId: `submit-${crypto.randomUUID()}`,
          answers: draftAnswers,
        }),
      },
    );
    showToast('本轮答案已提交');
    await loadBundle(true);
  } catch (error) {
    showToast(error.message);
  } finally {
    submitting = false;
    submitButton.disabled = false;
    submitButton.textContent = '提交本轮答案';
  }
}

function renderRound(container) {
  const round = currentRound();
  if (!round) return;
  const scroll = element('div', 'question-scroll');
  const panel = element('main', 'round-panel');
  panel.setAttribute('role', 'tabpanel');

  const editable = round.status === 'waiting_for_user' && bundle.session.status === 'active';
  const list = element('div', 'question-list');
  const numberOffset = questionNumberOffset(round.roundNumber);
  round.questions.questions.forEach((question, index) => {
    list.append(renderQuestion(
      question,
      editable,
      round.answers?.answers,
      numberOffset + index + 1,
    ));
  });
  panel.append(list);
  scroll.append(panel);
  container.append(scroll);
}

function renderSubmitDock(container) {
  const round = currentRound();
  if (!round) return;
  const dock = element('footer', 'submit-dock');
  const editable = round.status === 'waiting_for_user' && bundle.session.status === 'active';

  if (editable) {
    dock.append(element(
      'div',
      'submit-readme',
      '提交必读：提交后本轮变为只读，答案返回 Agent 后仅继续澄清需求；此路径不会执行任何实现任务。',
    ));
    const status = element('div', 'dock-status');
    answeredCountElement = element('span', 'answered-count');
    saveStatusElement = element(
      'span',
      'save-status',
      round.draft ? '已恢复草稿' : '推荐答案已预选',
    );
    status.append(answeredCountElement, saveStatusElement);
    const submit = element('button', 'btn-primary', '提交本轮答案');
    submit.type = 'button';
    submit.addEventListener('click', () => submitRound(round, submit));
    dock.append(status, submit);
    refreshProgress();
  } else {
    const message = round.status === 'submitted'
      ? (round.deliveryMode === 'direct'
          ? '答案已返回 Agent，可继续澄清需求；此路径不会执行实现任务。'
          : '本轮已提交。若 Agent 未自动继续，请在会话回复「已提交」（仍只澄清、不执行任务）。')
      : '本轮已处理，以上内容作为后续轮次的只读依据。';
    dock.append(element('div', 'submit-readme', message));
    const status = element('div', 'dock-status');
    status.append(element('span', 'answered-count', `共 ${round.questionCount} 题`));
    status.append(element('span', 'save-status', '只读状态'));
    dock.append(status);
  }
  container.append(dock);
}

function renderError(error) {
  app.replaceChildren();
  const panel = element('div', 'error-panel');
  panel.append(element('strong', '', 'Grill with docs UI 无法加载'));
  panel.append(element('p', '', error.message));
  app.append(panel);
}

function render() {
  saveStatusElement = null;
  answeredCountElement = null;
  app.replaceChildren();
  renderHeader(app);
  renderTabs(app);
  renderRound(app);
  renderSubmitDock(app);
}

async function loadBundle(force = false) {
  const next = await api(`/api/sessions/${encodeURIComponent(sessionId)}`);
  const changed = force || next.session.updatedAt !== lastUpdatedAt;
  const previousMaxRound = bundle?.rounds?.length
    ? Math.max(...bundle.rounds.map((round) => round.roundNumber))
    : 0;
  bundle = next;
  lastUpdatedAt = next.session.updatedAt;
  const waiting = [...bundle.rounds].reverse().find((round) => round.status === 'waiting_for_user');
  const activeStillExists = bundle.rounds.some((round) => round.roundNumber === activeRoundNumber);
  const hasNewWaitingRound = waiting && waiting.roundNumber > previousMaxRound;
  if (!activeStillExists || force || hasNewWaitingRound) {
    activeRoundNumber = waiting?.roundNumber || bundle.rounds.at(-1)?.roundNumber || null;
    const round = currentRound();
    draftAnswers = round ? answersForRound(round) : [];
  }
  if (changed) render();
}

if (!sessionId || !token) {
  renderError(new Error('页面链接缺少 Session 或访问令牌。请使用 Agent 返回的完整链接。'));
} else {
  loadBundle(true)
    .then(() => {
      setInterval(() => loadBundle(false).catch(() => {}), 3000);
    })
    .catch(renderError);
}
