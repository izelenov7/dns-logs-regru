"use strict";

class LogsConverter {
  constructor() {
    this.elements = this.initializeElements();
    this.allowedTypes = ["A", "AAAA", "TXT", "CNAME", "MX", "NS", "CAA"];
    this.allResults = [];
    this.initializeEventListeners();
    this.updateStats();
  }

  initializeElements() {
    return {
      inputData: document.getElementById("inputData"),
      outputData: document.getElementById("outputData"),
      processBtn: document.getElementById("processBtn"),
      copyBtn: document.getElementById("copyBtn"),
      saveBtn: document.getElementById("saveBtn"),
      clearBtn: document.getElementById("clearBtn"),
      statsText: document.getElementById("statsText"),
      hideDeletedBtn: document.getElementById("hideDeletedBtn"),
      hideAddedBtn: document.getElementById("hideAddedBtn"),
      showAllBtn: document.getElementById("showAllBtn"),
      helpBtn: document.getElementById("helpBtn"),
      helpModal: document.getElementById("helpModal"),
      helpModalClose: document.getElementById("helpModalClose"),
      helpModalOk: document.getElementById("helpModalOk"),
    };
  }

  initializeEventListeners() {
    this.elements.processBtn.addEventListener("click", () =>
      this.processAllData()
    );
    this.elements.copyBtn.addEventListener("click", () =>
      this.copyToClipboard()
    );
    this.elements.saveBtn.addEventListener("click", () => this.saveToFile());
    this.elements.clearBtn.addEventListener("click", () => this.clearAll());
    this.elements.hideDeletedBtn.addEventListener("click", () =>
      this.hideDeleted()
    );
    this.elements.hideAddedBtn.addEventListener("click", () =>
      this.hideAdded()
    );
    this.elements.showAllBtn.addEventListener("click", () => this.showAll());
    this.elements.helpBtn.addEventListener("click", () => this.openHelpModal());
    this.elements.helpModalClose.addEventListener("click", () =>
      this.closeHelpModal()
    );
    this.elements.helpModalOk.addEventListener("click", () =>
      this.closeHelpModal()
    );

    this.elements.helpModal.addEventListener("click", (e) => {
      if (e.target === this.elements.helpModal) this.closeHelpModal();
    });

    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.elements.helpModal.style.display === "flex"
      ) {
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
        console.warn("Не удалось распарсить JSON:", jsonStr.substring(0, 100));
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

    const actionText = action === "ADD" ? "добавлена" : "удалена";
    const shortTime = time.substring(0, 5);

    if (action === "ADD") {
      return this.processAddAction(data, date, shortTime, ip, actionText);
    }

    if (action === "DEL") {
      return this.processDeleteAction(data, date, shortTime, ip, actionText);
    }

    return null;
  }

  processAddAction(data, date, time, ip, actionText) {
    if (!data.type || !this.allowedTypes.includes(data.type)) return null;

    const name = data.name || "";
    let content = data.content || "";
    const { type } = data;

    if (!name || !content) return null;

    content = this.cleanDNSContent(content, type);

    return `${date} в ${time} с IP-адреса ${ip} была ${actionText} ${type}-запись для ${name} со значением ${content}`;
  }

  processDeleteAction(data, date, time, ip, actionText) {
    if (!data.bind || !Array.isArray(data.bind)) return null;

    const query = data.query || "";
    let type, name, content;

    if (query.includes("DELETE FROM records") && data.bind.length >= 5) {
      const possibleType = data.bind[2];
      if (possibleType && this.allowedTypes.includes(possibleType)) {
        type = possibleType;
        name = data.bind[1];
        content = data.bind[4];

        content = this.cleanDNSContent(content, type);
      }
    }

    if (!type || !name || !content) return null;

    return `${date} в ${time} с IP-адреса ${ip} была ${actionText} ${type}-запись для ${name} со значением ${content}`;
  }

  processAllData() {
    const input = this.elements.inputData.value.trim();

    if (!input) {
      this.allResults = [];
      this.elements.outputData.value = "";
      this.updateStats();
      return;
    }

    const lines = input.split("\n");
    const results = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const result = this.processLine(trimmedLine);
      if (result) results.push(result);
    }

    this.allResults = results;
    this.elements.outputData.value = results.join("\n");
    this.updateStats(results.length, lines.length);
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
      (line) => !line.includes("была удалена"),
      "Показано записей"
    );
  }

  hideAdded() {
    this.filterResults(
      (line) => !line.includes("была добавлена"),
      "Показано записей"
    );
  }

  showAll() {
    if (this.allResults.length === 0) return;

    this.elements.outputData.value = this.allResults.join("\n");
    this.elements.statsText.textContent = `Показано записей: ${this.allResults.length} из ${this.allResults.length}`;
  }

  filterResults(filterFn, prefix) {
    if (this.allResults.length === 0) return;

    const filtered = this.allResults.filter(filterFn);
    this.elements.outputData.value = filtered.join("\n");
    this.elements.statsText.textContent = `${prefix}: ${filtered.length} из ${this.allResults.length}`;
  }

  async copyToClipboard() {
    if (!this.elements.outputData.value.trim()) {
      alert("Нет данных для копирования");
      return;
    }

    try {
      await navigator.clipboard.writeText(this.elements.outputData.value);
      this.updateButtonState(this.elements.copyBtn, "fas fa-copy", "#28a745");
    } catch {
      alert("Ошибка при копировании. Пожалуйста, скопируйте текст вручную.");
    }
  }

  updateButtonState(button, iconClass, color) {
    const originalIcon = button.querySelector("i");
    const originalText = button.querySelector(".copy-text");
    const originalIconClass = originalIcon.className;
    const originalTextContent = originalText.textContent;

    originalIcon.className = "fas fa-check";
    originalText.textContent = "Скопировано!";
    button.style.background = color;

    setTimeout(() => {
      originalIcon.className = originalIconClass;
      originalText.textContent = originalTextContent;
      button.style.background = "";
    }, 2000);
  }

  saveToFile() {
    if (!this.elements.outputData.value.trim()) {
      alert("Нет данных для сохранения");
      return;
    }

    const blob = new Blob([this.elements.outputData.value], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `logs_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearAll() {
    this.elements.inputData.value = "";
    this.elements.outputData.value = "";
    this.allResults = [];
    this.updateStats();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new LogsConverter();
});
