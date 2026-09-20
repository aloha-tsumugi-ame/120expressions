/* English Expressions 120 - vanilla JS, no build step, no dependencies. */
(function () {
  "use strict";

  var DATA_URL = "./data/expressions.json";
  var WORD_BANK_URL = "./data/word-bank.json";

  var state = {
    items: [],
    category: "all",
    query: "",
    rate: 1
  };

  var els = {
    list: document.getElementById("list"),
    count: document.getElementById("count"),
    empty: document.getElementById("empty"),
    loading: document.getElementById("loading"),
    search: document.getElementById("search"),
    filters: document.getElementById("filters"),
    speed: document.getElementById("speed"),
    speechWarning: document.getElementById("speech-warning"),
    wordBank: document.getElementById("word-bank"),
    wordBankTabs: document.getElementById("word-bank-tabs"),
    wordBankBody: document.getElementById("word-bank-body"),
    wordBankToggle: document.getElementById("word-bank-toggle"),
    wordBankClose: document.getElementById("word-bank-close"),
    wordBankBackdrop: document.getElementById("word-bank-backdrop")
  };

  /* ------------------------------------------------------------------ *
   * Speech (Web Speech API)
   * ------------------------------------------------------------------ */

  var speechSupported =
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined";

  var englishVoice = null;
  var activeButton = null;

  // Well-known natural-sounding voices, in order of preference.
  var PREFERRED_VOICES = [
    "Google US English",
    "Samantha",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Microsoft Jenny Online (Natural) - English (United States)",
    "Microsoft Zira - English (United States)",
    "Ava",
    "Allison"
  ];

  // macOS ships many novelty voices that report en-US; they are unusable for
  // listening practice, so they are only used if nothing else is available.
  var NOVELTY_VOICES = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Bruce|Junior|Ralph|Fred|Kathy|Princess|Grandma|Grandpa|Rocko|Sandy|Shelley|Eddy|Flo|Reed|Rishi|Nicky|Aaron)\b/i;

  function langOf(voice) {
    return (voice.lang || "").replace("_", "-").toLowerCase();
  }

  function pickEnglishVoice() {
    if (!speechSupported) return;

    var voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return; // may be empty on first call

    function findBy(test) {
      for (var i = 0; i < voices.length; i++) {
        if (test(voices[i])) return voices[i];
      }
      return null;
    }

    function findPreferred() {
      // Outer loop over the preference list so its order wins, not the
      // browser's voice order.
      for (var i = 0; i < PREFERRED_VOICES.length; i++) {
        var match = findBy(function (v) {
          return v.name === PREFERRED_VOICES[i] && langOf(v).indexOf("en") === 0;
        });
        if (match) return match;
      }
      return null;
    }

    englishVoice =
      findPreferred() ||
      findBy(function (v) {
        return langOf(v).indexOf("en-us") === 0 && !NOVELTY_VOICES.test(v.name);
      }) ||
      findBy(function (v) {
        return langOf(v).indexOf("en") === 0 && !NOVELTY_VOICES.test(v.name);
      }) ||
      findBy(function (v) {
        return langOf(v).indexOf("en") === 0;
      });
  }

  if (speechSupported) {
    pickEnglishVoice();
    // getVoices() is empty until the voice list loads in some browsers.
    if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
      window.speechSynthesis.onvoiceschanged = pickEnglishVoice;
    }
    // Leaving the page mid-utterance can leave speech queued in some browsers.
    window.addEventListener("beforeunload", function () {
      window.speechSynthesis.cancel();
    });
  } else if (els.speechWarning) {
    els.speechWarning.hidden = false;
  }

  function clearActiveButton() {
    if (activeButton) {
      activeButton.classList.remove("is-speaking");
      activeButton.setAttribute("aria-label", activeButton.dataset.labelIdle);
      activeButton = null;
    }
  }

  function speak(text, button) {
    if (!speechSupported || !text) return;

    var wasActive = activeButton === button;

    window.speechSynthesis.cancel();
    clearActiveButton();

    // Pressing the button of the sentence currently being read just stops it.
    if (wasActive) return;

    var utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = state.rate;

    if (!englishVoice) pickEnglishVoice();
    if (englishVoice) utterance.voice = englishVoice;

    // A cancelled utterance fires "error: interrupted" *after* the next one
    // has started, so only clear the highlight if this utterance still owns it.
    function clearIfCurrent() {
      if (activeButton === button) clearActiveButton();
    }
    utterance.onend = clearIfCurrent;
    utterance.onerror = clearIfCurrent;

    if (button) {
      activeButton = button;
      button.classList.add("is-speaking");
      button.setAttribute("aria-label", "読み上げを停止");
    }

    window.speechSynthesis.speak(utterance);
  }

  /* ------------------------------------------------------------------ *
   * Search index
   * ------------------------------------------------------------------ */

  function compact(text) {
    return text.replace(/\s+/g, "");
  }

  function buildSearchText(item) {
    var parts = [item.expression, item.meaning, item.explanation];
    for (var i = 0; i < item.examples.length; i++) {
      parts.push(item.examples[i].english, item.examples[i].japanese);
    }
    return parts.join(" ").toLowerCase();
  }

  function matches(item, query) {
    if (!query) return true;
    if (item.searchText.indexOf(query) !== -1) return true;
    // Japanese from OCR contains stray spaces ("大体 40 分"), so also match
    // with all whitespace removed on both sides.
    return item.searchCompact.indexOf(compact(query)) !== -1;
  }

  /* ------------------------------------------------------------------ *
   * Rendering
   * ------------------------------------------------------------------ */

  var SPEAKER_SVG =
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 7.5h2.5L10.5 4v12L6.5 12.5H4z" />' +
    '<path d="M13.5 7.5a3.6 3.6 0 0 1 0 5" />' +
    '<path d="M15.8 5.2a6.8 6.8 0 0 1 0 9.6" />' +
    "</svg>";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Placeholder words used throughout the expression headings (e.g. "It's
  // 形容詞 to do") plus the single-letter variables X / Y. Longer/more
  // specific entries come first so e.g. "動名詞" isn't split into "動" + "名詞".
  var EXPR_VAR_REGEX = /否定文|動名詞|形容詞|主語|時間|状態|名詞|動詞|文|人|\bX\b|\bY\b/g;

  function buildExpressionFragment(text) {
    var fragment = document.createDocumentFragment();
    var lastIndex = 0;
    var match;

    EXPR_VAR_REGEX.lastIndex = 0;
    while ((match = EXPR_VAR_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      fragment.appendChild(el("span", "expr-var", match[0]));
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    return fragment;
  }

  function createExample(example) {
    var li = el("li", "example");

    if (speechSupported && example.english) {
      var button = el("button", "speak-btn");
      button.type = "button";
      button.innerHTML = SPEAKER_SVG;
      var label = "英文を読み上げる: " + example.english;
      button.dataset.labelIdle = label;
      button.setAttribute("aria-label", label);
      button.addEventListener("click", function () {
        speak(example.english, button);
      });
      li.appendChild(button);
    }

    var body = el("div", "example-body");
    if (example.english) {
      var en = el("p", "example-en", example.english);
      en.lang = "en";
      body.appendChild(en);
    }
    if (example.japanese) {
      body.appendChild(el("p", "example-jp", example.japanese));
    }
    li.appendChild(body);

    return li;
  }

  function createCard(item) {
    var card = el("article", item.missing ? "card is-missing" : "card");
    card.id = item.id;

    var head = el("div", "card-head");
    head.appendChild(el("span", "card-number", String(item.number)));
    head.appendChild(el("span", "card-category", item.categoryLabel));
    card.appendChild(head);

    var expression = el("h2", "expression");
    if (item.expression) {
      expression.lang = "en";
      expression.appendChild(buildExpressionFragment(item.expression));
    } else {
      expression.textContent = "（この表現はOCRで取得できませんでした）";
    }
    card.appendChild(expression);

    if (item.meaning) {
      card.appendChild(el("p", "meaning", item.meaning));
    }

    if (item.examples.length) {
      card.appendChild(el("p", "examples-label", "Examples"));
      var ul = el("ul", "examples");
      for (var i = 0; i < item.examples.length; i++) {
        ul.appendChild(createExample(item.examples[i]));
      }
      card.appendChild(ul);
    }

    if (item.explanation) {
      card.appendChild(el("p", "explanation", item.explanation));
    }

    if (item.note) {
      card.appendChild(el("p", "card-note", item.note));
    }

    return card;
  }

  function render() {
    var query = state.query.trim().toLowerCase();
    var fragment = document.createDocumentFragment();
    var shown = 0;

    for (var i = 0; i < state.items.length; i++) {
      var item = state.items[i];
      if (state.category !== "all" && item.category !== state.category) continue;
      if (!matches(item, query)) continue;
      fragment.appendChild(createCard(item));
      shown++;
    }

    if (speechSupported) window.speechSynthesis.cancel();
    clearActiveButton();

    els.list.innerHTML = "";
    els.list.appendChild(fragment);
    els.count.textContent = shown + (shown === 1 ? " expression" : " expressions");
    els.empty.hidden = shown !== 0;
  }

  /* ------------------------------------------------------------------ *
   * Events
   * ------------------------------------------------------------------ */

  els.search.addEventListener("input", function (event) {
    state.query = event.target.value;
    render();
  });

  els.filters.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-category]");
    if (!button) return;

    state.category = button.dataset.category;

    var buttons = els.filters.querySelectorAll("button[data-category]");
    for (var i = 0; i < buttons.length; i++) {
      var isActive = buttons[i] === button;
      buttons[i].classList.toggle("is-active", isActive);
      buttons[i].setAttribute("aria-pressed", isActive ? "true" : "false");
    }

    render();
  });

  els.speed.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-rate]");
    if (!button) return;

    state.rate = parseFloat(button.dataset.rate);

    var buttons = els.speed.querySelectorAll("button[data-rate]");
    for (var i = 0; i < buttons.length; i++) {
      var isActive = buttons[i] === button;
      buttons[i].classList.toggle("is-active", isActive);
      buttons[i].setAttribute("aria-pressed", isActive ? "true" : "false");
    }

    if (speechSupported) {
      window.speechSynthesis.cancel();
      clearActiveButton();
    }
  });

  /* ------------------------------------------------------------------ *
   * Word Bank
   *
   * Reference-only vocabulary list (adjectives / nouns / verbs / gerunds /
   * time expressions) for filling in the blanks of a construction while
   * practicing speaking. It never touches the expression data or search —
   * words are not inserted anywhere, just displayed for reference.
   * ------------------------------------------------------------------ */

  var wordBankOpen = false;

  function setWordBankOpen(open) {
    wordBankOpen = open;
    els.wordBank.classList.toggle("is-open", open);
    els.wordBankBackdrop.classList.toggle("is-open", open);
    els.wordBankToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  els.wordBankToggle.addEventListener("click", function () {
    setWordBankOpen(!wordBankOpen);
  });
  els.wordBankClose.addEventListener("click", function () {
    setWordBankOpen(false);
  });
  els.wordBankBackdrop.addEventListener("click", function () {
    setWordBankOpen(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && wordBankOpen) setWordBankOpen(false);
  });

  function createWordBankPanel(tab) {
    var panel = el("div", "wb-panel");
    panel.id = "wb-panel-" + tab.id;
    panel.hidden = true;
    panel.setAttribute("role", "tabpanel");

    for (var i = 0; i < tab.groups.length; i++) {
      var group = tab.groups[i];
      if (group.label) panel.appendChild(el("p", "wb-group-label", group.label));

      var chips = el("div", "wb-chips");
      for (var j = 0; j < group.words.length; j++) {
        chips.appendChild(el("span", "wb-chip", group.words[j]));
      }
      panel.appendChild(chips);
    }

    return panel;
  }

  function selectWordBankTab(tabId) {
    var tabButtons = els.wordBankTabs.querySelectorAll("button[data-wb-tab]");
    for (var i = 0; i < tabButtons.length; i++) {
      var isActive = tabButtons[i].dataset.wbTab === tabId;
      tabButtons[i].classList.toggle("is-active", isActive);
      tabButtons[i].setAttribute("aria-selected", isActive ? "true" : "false");
    }

    var panels = els.wordBankBody.querySelectorAll(".wb-panel");
    for (var j = 0; j < panels.length; j++) {
      panels[j].hidden = panels[j].id !== "wb-panel-" + tabId;
    }

    els.wordBankBody.scrollTop = 0;
  }

  function initWordBank(tabs) {
    els.wordBankTabs.setAttribute("role", "tablist");

    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];

      var button = el("button", "pill pill-sm" + (i === 0 ? " is-active" : ""), tab.label);
      button.type = "button";
      button.dataset.wbTab = tab.id;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", i === 0 ? "true" : "false");
      button.addEventListener("click", function () {
        selectWordBankTab(this.dataset.wbTab);
      });
      els.wordBankTabs.appendChild(button);

      els.wordBankBody.appendChild(createWordBankPanel(tab));
    }

    selectWordBankTab(tabs[0].id);
  }

  fetch(WORD_BANK_URL)
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(initWordBank)
    .catch(function () {
      // Word Bank is a reference-only convenience; if it fails to load the
      // rest of the site (search, cards, speech) must keep working normally.
      els.wordBankToggle.hidden = true;
      els.wordBank.hidden = true;
    });

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  fetch(DATA_URL)
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (items) {
      state.items = items.map(function (item) {
        item.examples = item.examples || [];
        item.searchText = buildSearchText(item);
        item.searchCompact = compact(item.searchText);
        return item;
      });
      els.loading.hidden = true;
      render();
    })
    .catch(function (error) {
      els.loading.textContent =
        "データを読み込めませんでした（" +
        error.message +
        "）。ローカルでは python3 -m http.server 8000 を起動し、http://localhost:8000 から開いてください。";
    });
})();
