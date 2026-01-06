class LogsConverter {
  static ALLOWED_TYPES = new Set([
    "A",
    "AAAA",
    "TXT",
    "CNAME",
    "MX",
    "NS",
    "CAA",
  ]);
  static ACTIONS = { ADD: "добавлена", DEL: "удалена" };

  constructor() {
    this.allResults = [];
    this.elements = this.initializeElements();
    this.bindEvents();
    this.updateStats();
  }

  initializeElements() {
    const elementIds = [
      "inputData",
      "outputData",
      "processBtn",
      "copyBtn",
      "saveBtn",
      "clearBtn",
      "statsText",
      "hideDeletedBtn",
      "hideAddedBtn",
      "showAllBtn",
      "helpBtn",
      "helpModal",
      "helpModalClose",
      "helpModalOk",
    ];

    return elementIds.reduce((acc, id) => {
      acc[id] = document.getElementById(id);
      return acc;
    }, {});
  }

  bindEvents() {
    const {
      processBtn,
      copyBtn,
      saveBtn,
      clearBtn,
      hideDeletedBtn,
      hideAddedBtn,
      showAllBtn,
      helpBtn,
      helpModalClose,
      helpModalOk,
      helpModal,
    } = this.elements;

    processBtn.addEventListener("click", () => this.processAllData());
    copyBtn.addEventListener("click", () => this.copyToClipboard());
    saveBtn.addEventListener("click", () => this.saveToFile());
    clearBtn.addEventListener("click", () => this.clearAll());
    hideDeletedBtn.addEventListener("click", () => this.hideDeleted());
    hideAddedBtn.addEventListener("click", () => this.hideAdded());
    showAllBtn.addEventListener("click", () => this.showAll());
    helpBtn.addEventListener("click", () => this.openHelpModal());
    helpModalClose.addEventListener("click", () => this.closeHelpModal());
    helpModalOk.addEventListener("click", () => this.closeHelpModal());

    helpModal.addEventListener(
      "click",
      (e) => e.target === helpModal && this.closeHelpModal()
    );

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && helpModal.style.display === "flex") {
        this.closeHelpModal();
      }
    });
  }

  openHelpModal() {
    this.elements.helpModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  closeHelpModal() {
    this.elements.helpModal.style.display = "none";
    document.body.style.overflow = "auto";
  }

  cleanDNSContent(content, type) {
    if (typeof content !== "string") return content;

    let cleaned = content.trim();

    if (type === "TXT" && cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }

    if (type === "CAA") {
      cleaned = cleaned.replace(/"/g, "");
    }

    return cleaned;
  }

  parseJSON(jsonStr) {
    try {
      return JSON.parse(jsonStr);
    } catch {
      try {
        const fixedStr = jsonStr.replace(/(\w+):/g, '"$1":');
        return JSON.parse(fixedStr);
      } catch {
        return null;
      }
    }
  }

  processLine(line) {
    const parts = line.split("\t");
    if (parts.length < 8) return null;

    const [date, time] = parts[0].split(" ");
    const action = parts[2];
    const ip = parts[4];
    const jsonData = parts[parts.length - 1];
    const data = this.parseJSON(jsonData);

    if (!data) return null;

    const actionText = LogsConverter.ACTIONS[action];
    const shortTime = time.substring(0, 5);

    return action === "ADD"
      ? this.processAddAction(data, date, shortTime, ip, actionText)
      : this.processDeleteAction(data, date, shortTime, ip, actionText);
  }

  processAddAction(data, date, time, ip, actionText) {
    const { type, name = "", content = "" } = data;

    if (!type || !LogsConverter.ALLOWED_TYPES.has(type) || !name || !content) {
      return null;
    }

    const cleanedContent = this.cleanDNSContent(content, type);
    const actionClass = actionText === "добавлена" ? "added" : "removed";

    return `${date} в ${time} с IP-адреса ${ip} была <span class="action-text ${actionClass}">${actionText}</span> ${type}-запись для ${name} со значением ${cleanedContent}`;
  }

  processDeleteAction(data, date, time, ip, actionText) {
    if (!data.bind || !Array.isArray(data.bind)) return null;

    const query = data.query || "";
    let type, name, content;

    if (query.includes("DELETE FROM records") && data.bind.length >= 5) {
      const possibleType = data.bind[2];
      if (possibleType && LogsConverter.ALLOWED_TYPES.has(possibleType)) {
        type = possibleType;
        name = data.bind[1];
        content = data.bind[4];
      }
    }

    if (!type || !name || !content) return null;

    const cleanedContent = this.cleanDNSContent(content, type);
    const actionClass = actionText === "добавлена" ? "added" : "removed";

    return `${date} в ${time} с IP-адреса ${ip} была <span class="action-text ${actionClass}">${actionText}</span> ${type}-запись для ${name} со значением ${cleanedContent}`;
  }

  processAllData() {
    const input = this.elements.inputData.value.trim();

    if (!input) {
      this.allResults = [];
      this.elements.outputData.innerHTML = "";
      this.updateStats();
      if (window.activityChart) window.activityChart.clear();
      return;
    }

    const lines = input.split("\n");
    const results = lines.reduce((acc, line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return acc;

      const result = this.processLine(trimmedLine);
      if (result) acc.push(result);
      return acc;
    }, []);

    this.allResults = results;
    this.elements.outputData.innerHTML = results.join("\n");
    this.updateStats(results.length, lines.length);

    if (window.activityChart && results.length > 0) {
      window.activityChart.parseLogs(results);
    }
  }

  updateStats(processed = 0, total = 0) {
    const statText =
      processed === 0 && total === 0
        ? "Обработано записей: 0"
        : `Обработано записей: ${processed} из ${total}`;

    this.elements.statsText.textContent = statText;
  }

  hideDeleted() {
    this.filterResults(
      (line) => !line.includes('class="action-text removed"'),
      "Показано записей"
    );
  }

  hideAdded() {
    this.filterResults(
      (line) => !line.includes('class="action-text added"'),
      "Показано записей"
    );
  }

  showAll() {
    if (this.allResults.length === 0) return;

    this.elements.outputData.innerHTML = this.allResults.join("\n");
    this.elements.statsText.textContent = `Показано записей: ${this.allResults.length} из ${this.allResults.length}`;
  }

  filterResults(filterFn, prefix) {
    if (this.allResults.length === 0) return;

    const filtered = this.allResults.filter(filterFn);
    this.elements.outputData.innerHTML = filtered.join("\n");
    this.elements.statsText.textContent = `${prefix}: ${filtered.length} из ${this.allResults.length}`;
  }

  async copyToClipboard() {
    const textContent = this.elements.outputData.textContent;

    if (!textContent.trim()) {
      alert("Нет данных для копирования");
      return;
    }

    try {
      await navigator.clipboard.writeText(textContent);
      this.updateButtonState(this.elements.copyBtn, "Скопировано!", "#28a745");
    } catch {
      alert("Ошибка при копировании. Пожалуйста, скопируйте текст вручную.");
    }
  }

  updateButtonState(button, text, color) {
    const originalText = button.querySelector("span");
    const originalContent = originalText.textContent;
    const originalBackground = button.style.background;

    originalText.textContent = text;
    button.style.background = color;

    setTimeout(() => {
      originalText.textContent = originalContent;
      button.style.background = originalBackground;
    }, 2000);
  }

  saveToFile() {
    const textContent = this.elements.outputData.textContent;

    if (!textContent.trim()) {
      alert("Нет данных для сохранения");
      return;
    }

    const domain = this.extractDomainFromLogs();
    const date = new Date().toISOString().slice(0, 10);
    const filename = domain ? `logs_${domain}_${date}.txt` : `logs_${date}.txt`;

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  extractDomainFromLogs() {
    if (this.allResults.length === 0) return null;

    const firstRecord = this.allResults[0];
    const cleanText = firstRecord.replace(/<[^>]*>/g, "");
    const domainMatch = cleanText.match(/для\s+([^\s]+)/);

    if (domainMatch && domainMatch[1]) {
      const fullDomain = domainMatch[1];
      const parts = fullDomain.split(".");

      if (parts.length >= 2) {
        return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
      }
      return fullDomain;
    }

    return null;
  }

  clearAll() {
    this.elements.inputData.value = "";
    this.elements.outputData.innerHTML = "";
    this.allResults = [];
    this.updateStats();
    if (window.activityChart) window.activityChart.clear();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.logsConverter = new LogsConverter();
});
