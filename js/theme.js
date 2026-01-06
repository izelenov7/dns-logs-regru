class ThemeSwitcher {
  constructor() {
    this.theme = this.getSavedTheme() || this.getSystemPreference();
    this.elements = this.initializeElements();
    this.initialize();
  }

  initializeElements() {
    return {
      themeToggle: document.getElementById("themeToggle"),
      themeIcon: document.querySelector("#themeToggle i"),
      themeText: document.querySelector(".theme-text"),
    };
  }

  getSavedTheme() {
    return localStorage.getItem("theme");
  }

  getSystemPreference() {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  initialize() {
    this.applyTheme();
    this.setupEventListeners();
  }

  applyTheme() {
    if (this.theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      this.elements.themeIcon.className = "fas fa-sun";
      this.elements.themeText.textContent = "Светлая тема";
    } else {
      document.documentElement.removeAttribute("data-theme");
      this.elements.themeIcon.className = "fas fa-moon";
      this.elements.themeText.textContent = "Тёмная тема";
    }

    localStorage.setItem("theme", this.theme);
  }

  toggleTheme() {
    this.theme = this.theme === "light" ? "dark" : "light";
    this.applyTheme();
  }

  setupEventListeners() {
    this.elements.themeToggle.addEventListener("click", () =>
      this.toggleTheme()
    );
  }
}

document.addEventListener("DOMContentLoaded", () => new ThemeSwitcher());
