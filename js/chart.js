"use strict";

class ActivityChart {
  constructor() {
    this.chart = null;
    this.currentPeriod = "hour";
    this.data = {
      hours: new Array(24).fill(0),
      days: {},
    };
    this.initialize();
  }

  initialize() {
    this.setupElements();
    this.setupEventListeners();
    this.initializeChart();
  }

  setupElements() {
    this.canvas = document.getElementById("activityChart");
    if (!this.canvas) {
      console.error("Canvas element not found!");
      return;
    }

    this.ctx = this.canvas.getContext("2d");
    this.totalChangesEl = document.getElementById("totalChanges");
    this.peakActivityEl = document.getElementById("peakActivity");
    this.periodButtons = document.querySelectorAll(".chart-btn");
  }

  setupEventListeners() {
    if (this.periodButtons) {
      this.periodButtons.forEach((btn) => {
        btn.addEventListener("click", () =>
          this.switchPeriod(btn.dataset.period)
        );
      });
    }
  }

  initializeChart() {
    if (!this.canvas) return;

    const isDark = document.documentElement.hasAttribute("data-theme");
    const gridColor = isDark
      ? "rgba(160, 174, 192, 0.1)"
      : "rgba(203, 205, 214, 0.3)";
    const textColor = isDark ? "#a0aec0" : "#707a8a";
    const primaryColor = isDark ? "#4c6ef5" : "#3755fa";

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(this.ctx, {
      type: "bar",
      data: {
        labels: Array.from(
          { length: 24 },
          (_, i) => `${i.toString().padStart(2, "0")}:00`
        ),
        datasets: [
          {
            label: "Изменений",
            data: this.data.hours,
            backgroundColor: primaryColor,
            borderColor: primaryColor,
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: "index",
            intersect: false,
            backgroundColor: isDark ? "#2d3748" : "#ffffff",
            titleColor: isDark ? "#e2e8f0" : "#2b2f33",
            bodyColor: isDark ? "#a0aec0" : "#707a8a",
            borderColor: isDark ? "#4a5568" : "#dfe3e8",
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              title: function (context) {
                if (context.length > 0) {
                  const dataIndex = context[0].dataIndex;
                  if (
                    window.activityChart &&
                    window.activityChart.currentPeriod === "day"
                  ) {
                    const fullDate =
                      window.activityChart.getFullDateByIndex(dataIndex);
                    return `Дата: ${fullDate}`;
                  } else {
                    return `Время: ${context[0].label}`;
                  }
                }
                return "";
              },
              label: function (context) {
                return `Изменений: ${context.raw}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: gridColor,
              drawBorder: false,
            },
            ticks: {
              color: textColor,
              font: {
                size: 11,
              },
              maxRotation: 45,
              minRotation: 45,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor,
              drawBorder: false,
            },
            ticks: {
              color: textColor,
              font: {
                size: 11,
              },
              precision: 0,
              stepSize: 1,
            },
          },
        },
        interaction: {
          intersect: false,
          mode: "index",
        },
      },
    });
  }

  getFullDateByIndex(index) {
    if (this.currentPeriod === "day") {
      const sortedDays = Object.keys(this.data.days).sort();
      if (sortedDays[index]) {
        const [year, month, day] = sortedDays[index].split("-");
        return `${day}.${month}.${year}`;
      }
    }
    return "";
  }

  switchPeriod(period) {
    if (this.currentPeriod === period) return;

    this.currentPeriod = period;

    this.periodButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.period === period);
    });

    this.updateChart();
  }

  parseLogs(logsArray) {
    this.data.hours = new Array(24).fill(0);
    this.data.days = {};

    logsArray.forEach((log) => {
      const timeMatch = log.match(/\d{2}:\d{2}/);
      if (timeMatch) {
        const hour = parseInt(timeMatch[0].split(":")[0]);
        if (hour >= 0 && hour < 24) {
          this.data.hours[hour]++;
        }
      }

      const dateMatch = log.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const date = dateMatch[0];
        this.data.days[date] = (this.data.days[date] || 0) + 1;
      }
    });

    this.updateChart();
    this.updateStats();
  }

  updateChart() {
    if (!this.chart) return;

    let labels, data;

    if (this.currentPeriod === "hour") {
      labels = Array.from(
        { length: 24 },
        (_, i) => `${i.toString().padStart(2, "0")}:00`
      );
      data = this.data.hours;
    } else {
      const sortedDays = Object.keys(this.data.days).sort();
      labels = sortedDays.map((date) => {
        const [year, month, day] = date.split("-");
        const shortYear = year.slice(-2);
        return `${day}.${month}.${shortYear}`;
      });
      data = sortedDays.map((date) => this.data.days[date]);
    }

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = data;

    if (this.currentPeriod === "day") {
      this.chart.options.scales.x.ticks.maxRotation = 45;
      this.chart.options.scales.x.ticks.minRotation = 45;
    } else {
      this.chart.options.scales.x.ticks.maxRotation = 0;
      this.chart.options.scales.x.ticks.minRotation = 0;
    }

    this.chart.update();
  }

  updateStats() {
    const total = this.data.hours.reduce((a, b) => a + b, 0);

    if (this.totalChangesEl) {
      this.totalChangesEl.textContent = total;
    }

    if (total > 0) {
      const maxChanges = Math.max(...this.data.hours);
      const peakHour = this.data.hours.indexOf(maxChanges);

      if (this.peakActivityEl) {
        this.peakActivityEl.textContent = `${peakHour
          .toString()
          .padStart(2, "0")}:00`;
      }
    } else {
      if (this.peakActivityEl) {
        this.peakActivityEl.textContent = "-";
      }
    }
  }

  updateTheme() {
    const isDark = document.documentElement.hasAttribute("data-theme");
    const gridColor = isDark
      ? "rgba(160, 174, 192, 0.1)"
      : "rgba(203, 205, 214, 0.3)";
    const textColor = isDark ? "#a0aec0" : "#707a8a";
    const primaryColor = isDark ? "#4c6ef5" : "#3755fa";

    if (this.chart) {
      this.chart.options.scales.x.grid.color = gridColor;
      this.chart.options.scales.y.grid.color = gridColor;
      this.chart.options.scales.x.ticks.color = textColor;
      this.chart.options.scales.y.ticks.color = textColor;

      this.chart.data.datasets[0].backgroundColor = primaryColor;
      this.chart.data.datasets[0].borderColor = primaryColor;

      this.chart.options.plugins.tooltip.backgroundColor = isDark
        ? "#2d3748"
        : "#ffffff";
      this.chart.options.plugins.tooltip.titleColor = isDark
        ? "#e2e8f0"
        : "#2b2f33";
      this.chart.options.plugins.tooltip.bodyColor = isDark
        ? "#a0aec0"
        : "#707a8a";
      this.chart.options.plugins.tooltip.borderColor = isDark
        ? "#4a5568"
        : "#dfe3e8";

      this.chart.update();
    }
  }

  clear() {
    this.data.hours = new Array(24).fill(0);
    this.data.days = {};
    this.updateChart();
    this.updateStats();
  }
}

let activityChart = null;

document.addEventListener("DOMContentLoaded", () => {
  if (typeof Chart === "undefined") {
    console.error("Chart.js library not loaded!");
    return;
  }

  activityChart = new ActivityChart();
  window.activityChart = activityChart;

  const themeObserver = new MutationObserver(() => {
    if (activityChart) {
      activityChart.updateTheme();
    }
  });

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
});
