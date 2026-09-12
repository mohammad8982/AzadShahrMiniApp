/*
  آزادشهر - GitHub Mini App
  این فایل مستقل است و بدون بک‌اند هم قابل تست است.
  برای اتصال به هاست واقعی فقط API_BASE را تغییر بده.
*/

const API_BASE = ""; // مثال: https://api.example.com
const tg = window.Telegram?.WebApp;

const DEFAULT_STATE = {
  coins: 2500,
  level: 7,
  xp: 1420,
  energy: 100,
  name: "مهمان",
  username: "guest",
  animal: "🦊",
  inventory: ["روباه"],
  missionProgress: {},
  lastEnergy: Date.now()
};

let state = loadState();
let apiOnline = false;
let gameTimer = null;
let gameRunning = false;
let gameTime = 15;
let gameScore = 0;

const missions = [
  {
    id: "earn",
    icon: "🪙",
    title: "جمع‌آوری سکه",
    desc: "حداقل ۱۰۰۰ سکه درآمد کسب کن",
    target: 1000,
    reward: 600
  },
  {
    id: "job",
    icon: "💼",
    title: "یک شیفت کاری",
    desc: "یک شغل را کامل کن",
    target: 1,
    reward: 900
  },
  {
    id: "game",
    icon: "🎮",
    title: "شکار سکه",
    desc: "۲۰ امتیاز در مینی‌گیم بگیر",
    target: 20,
    reward: 1200
  },
  {
    id: "city",
    icon: "🗺️",
    title: "گردش در شهر",
    desc: "از شهر بازدید کن",
    target: 1,
    reward: 500
  }
];

const jobs = [
  {
    icon: "🌾",
    title: "کشاورز",
    desc: "شیفت ۶۰ ثانیه‌ای",
    pay: 750,
    xp: 120,
    level: 1
  },
  {
    icon: "🚕",
    title: "راننده تاکسی",
    desc: "مسافرهای شهر را جابه‌جا کن",
    pay: 1100,
    xp: 170,
    level: 2
  },
  {
    icon: "🍔",
    title: "آشپز",
    desc: "سفارش‌های رستوران",
    pay: 1450,
    xp: 220,
    level: 3
  },
  {
    icon: "🏗️",
    title: "کارگر ساختمان",
    desc: "پروژه‌های سنگین شهر",
    pay: 2200,
    xp: 300,
    level: 5
  },
  {
    icon: "💻",
    title: "برنامه‌نویس",
    desc: "کار تخصصی و پردرآمد",
    pay: 3600,
    xp: 450,
    level: 8
  }
];

const shop = [
  {
    icon: "🦁",
    title: "شیر طلایی",
    desc: "پوست کمیاب",
    price: 4500
  },
  {
    icon: "🐯",
    title: "ببر نئون",
    desc: "پوست ویژه",
    price: 7500
  },
  {
    icon: "🛵",
    title: "موتور شهری",
    desc: "وسیله شخصی",
    price: 12000
  },
  {
    icon: "🏠",
    title: "خانه مدرن",
    desc: "ملک شخصی",
    price: 25000
  },
  {
    icon: "🎒",
    title: "کوله حرفه‌ای",
    desc: "ظرفیت بیشتر",
    price: 8000
  },
  {
    icon: "👑",
    title: "تاج قهرمان",
    desc: "آیتم افسانه‌ای",
    price: 18000
  }
];

const leaders = [
  ["1", "🦁", "KingLeo", 97120],
  ["2", "🐼", "Aria", 82450],
  ["3", "🐯", "Nika", 76880],
  ["4", "🐺", "Rayan", 69430],
  ["5", "🦊", "Mahan", 61900],
  ["6", "🐰", "Saba", 58210],
  ["7", "🐻", "Dani", 53420]
];

let chats = [
  ["Aria", "امروز کسی برای مینی‌گیم هست؟", "🐼"],
  ["KingLeo", "رکورد جدید زدم 😎", "🦁"],
  ["Nika", "شغل تاکسی خیلی خوبه!", "🐯"],
  ["Mahan", "آزادشهر 🔥", "🦊"]
];

function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return [...document.querySelectorAll(selector)];
}

function fmt(number) {
  return Number(number || 0).toLocaleString("fa-IR");
}

function loadState() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("azadshahr_state") || "null"
    );

    return {
      ...DEFAULT_STATE,
      ...(saved || {})
    };
  } catch {
    return {
      ...DEFAULT_STATE
    };
  }
}

function saveState() {
  localStorage.setItem(
    "azadshahr_state",
    JSON.stringify(state)
  );
}

function toast(text) {
  const element = $("#toast");

  if (!element) return;

  element.textContent = text;
  element.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    element.classList.remove("show");
  }, 1800);
}

/* =========================
   TELEGRAM
========================= */

function telegramInit() {
  try {
    if (!tg) return;

    tg.ready();
    tg.expand();

    try {
      tg.setHeaderColor("#050c15");
      tg.setBackgroundColor("#050c15");
    } catch {}

    const user = tg.initDataUnsafe?.user;

    if (user) {
      state.name =
        user.first_name ||
        state.name;

      state.username =
        user.username
          ? "@" + user.username
          : state.username;

      saveState();
    }
  } catch (error) {
    console.warn(
      "Telegram initialization error:",
      error
    );
  }
}

/* =========================
   API
========================= */

async function api(path, options = {}) {
  if (!API_BASE) {
    throw new Error(
      "API_BASE not configured"
    );
  }

  const response = await fetch(
    API_BASE + path,
    {
      ...options,

      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      "API " + response.status
    );
  }

  return response.json();
}

/*
  وقتی بک‌اند آماده شد،
  این تابع برای اتصال کاربر تلگرام
  به سرور استفاده می‌شود.
*/

async function syncBackend() {
  if (!API_BASE || !tg?.initData) {
    return;
  }

  try {
    await api(
      "/api/auth/telegram",
      {
        method: "POST",

        body: JSON.stringify({
          init_data: tg.initData
        })
      }
    );

    apiOnline = true;
  } catch (error) {
    apiOnline = false;

    console.warn(
      "Backend unavailable:",
      error
    );
  }
}

/* =========================
   ECONOMY / XP
========================= */

function addCoins(amount, xp = 0) {
  state.coins = Math.max(
    0,
    state.coins + amount
  );

  state.xp += xp;

  while (
    state.xp >= state.level * 300
  ) {
    const required =
      state.level * 300;

    state.xp -= required;
    state.level++;

    toast(
      "🎉 تبریک! سطح " +
      fmt(state.level) +
      " شد"
    );
  }

  saveState();
  render();
}

function progressMission(
  id,
  amount
) {
  const mission =
    missions.find(
      item => item.id === id
    );

  if (!mission) return;

  state.missionProgress[id] =
    Math.min(
      mission.target,
      (state.missionProgress[id] || 0) +
        amount
    );

  saveState();
}

/* =========================
   MISSIONS
========================= */

function missionHTML(mission) {
  const value =
    state.missionProgress[
      mission.id
    ] || 0;

  const percent = Math.min(
    100,
    (value / mission.target) * 100
  );

  return `
    <div class="mission">
      <div class="ico">
        ${mission.icon}
      </div>

      <div class="grow">
        <b>${mission.title}</b>

        <small>
          ${mission.desc}
        </small>

        <div class="bar">
          <i
            style="width:${percent}%"
          ></i>
        </div>
      </div>

      <div class="reward">
        +${fmt(mission.reward)} 🪙
      </div>
    </div>
  `;
}

function renderMissions() {
  const home =
    $("#homeMissions");

  const list =
    $("#missionsList");

  if (home) {
    home.innerHTML =
      missions
        .slice(0, 3)
        .map(missionHTML)
        .join("");
  }

  if (list) {
    list.innerHTML =
      missions
        .map(missionHTML)
        .join("");
  }
}

/* =========================
   JOBS
========================= */

function renderJobs() {
  const container =
    $("#jobsList");

  if (!container) return;

  container.innerHTML =
    jobs
      .map((job, index) => {
        const locked =
          state.level < job.level;

        return `
          <div
            class="job ${
              locked ? "locked" : ""
            }"
          >

            <div class="ico">
              ${job.icon}
            </div>

            <div class="grow">

              <b>
                ${job.title}
              </b>

              <small>
                ${job.desc}
                • سطح ${job.level}
              </small>

            </div>

            <span class="salary">
              +${fmt(job.pay)}
            </span>

            <button
              data-job="${index}"
            >
              ${
                locked
                  ? "🔒"
                  : "شروع"
              }
            </button>

          </div>
        `;
      })
      .join("");

  $$("[data-job]").forEach(
    button => {
      button.onclick = () => {
        const job =
          jobs[
            Number(
              button.dataset.job
            )
          ];

        if (
          state.level < job.level
        ) {
          toast(
            "🔒 این شغل از سطح " +
              job.level +
              " باز می‌شود"
          );

          return;
        }

        if (state.energy < 10) {
          toast(
            "⚡ انرژی کافی نداری"
          );

          return;
        }

        state.energy -= 10;

        addCoins(
          job.pay,
          job.xp
        );

        progressMission(
          "job",
          1
        );

        progressMission(
          "earn",
          job.pay
        );

        toast(
          "💼 شیفت کامل شد • +" +
            fmt(job.pay) +
            " سکه"
        );
      };
    }
  );
}

/* =========================
   SHOP
========================= */

function renderShop() {
  const container =
    $("#shopList");

  if (!container) return;

  container.innerHTML =
    shop
      .map(
        (item, index) => `
          <div class="shop">

            <div class="shopico">
              ${item.icon}
            </div>

            <b>
              ${item.title}
            </b>

            <small>
              ${item.desc}
            </small>

            <button
              data-buy="${index}"
            >
              ${fmt(item.price)} 🪙
            </button>

          </div>
        `
      )
      .join("");

  $$("[data-buy]").forEach(
    button => {
      button.onclick = () => {
        const item =
          shop[
            Number(
              button.dataset.buy
            )
          ];

        if (
          state.coins <
          item.price
        ) {
          toast(
            "❌ سکه کافی نیست"
          );

          return;
        }

        state.coins -=
          item.price;

        state.inventory.push(
          item.title
        );

        saveState();

        render();

        toast(
          "✅ " +
            item.title +
            " خریداری شد"
        );
      };
    }
  );
}

/* =========================
   INVENTORY
========================= */

function renderInventory() {
  const container =
    $("#inventoryList");

  if (!container) return;

  const items = [
    [
      "🦊",
      "روباه",
      "فعال"
    ],

    [
      "🎒",
      "کوله سفر",
      "سطح ۲"
    ],

    [
      "🪙",
      "سکه",
      fmt(state.coins)
    ],

    ...state.inventory
      .slice(1)
      .map(item => [
        "🎁",
        item,
        "دارایی"
      ])
  ];

  container.innerHTML =
    items
      .map(
        item => `
          <div class="shop">

            <div class="shopico">
              ${item[0]}
            </div>

            <b>
              ${item[1]}
            </b>

            <small>
              ${item[2]}
            </small>

          </div>
        `
      )
      .join("");
}

/* =========================
   LEADERBOARD
========================= */

function leaderHTML(player) {
  return `
    <div class="leader">

      <span class="rank">
        ${player[0]}
      </span>

      <span class="pet">
        ${player[1]}
      </span>

      <div class="grow">

        <b>
          ${player[2]}
        </b>

        <small>
          شهروند فعال
        </small>

      </div>

      <strong>
        ${fmt(player[3])}
      </strong>

    </div>
  `;
}

function renderLeaders() {
  const podium =
    $("#podium");

  const list =
    $("#leadersList");

  const home =
    $("#homeLeaders");

  const top =
    leaders.slice(0, 3);

  if (
    podium &&
    top.length >= 3
  ) {
    podium.innerHTML = `
      <div>
        🥈 ${top[1][1]}

        <b>
          ${top[1][2]}
        </b>

        <small>
          ${fmt(top[1][3])}
        </small>
      </div>

      <div class="king">

        👑 ${top[0][1]}

        <b>
          ${top[0][2]}
        </b>

        <small>
          ${fmt(top[0][3])}
        </small>

      </div>

      <div>

        🥉 ${top[2][1]}

        <b>
          ${top[2][2]}
        </b>

        <small>
          ${fmt(top[2][3])}
        </small>

      </div>
    `;
  }

  if (list) {
    list.innerHTML =
      leaders
        .map(leaderHTML)
        .join("");
  }

  if (home) {
    home.innerHTML =
      leaders
        .slice(0, 3)
        .map(leaderHTML)
        .join("");
  }
}

/* =========================
   CHAT
========================= */

function renderChat() {
  const container =
    $("#chatList");

  if (!container) return;

  container.innerHTML =
    chats
      .map(message => {
        const isMe =
          message[0] ===
          state.name;

        return `
          <div
            class="msg ${
              isMe ? "me" : ""
            }"
          >

            <b>
              ${message[2]}
              ${escapeHTML(
                message[0]
              )}
            </b>

            <p>
              ${escapeHTML(
                message[1]
              )}
            </p>

          </div>
        `;
      })
      .join("");

  container.scrollTop =
    container.scrollHeight;
}

function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character])
  );
}

/* =========================
   MAIN RENDER
========================= */

function render() {
  const coins =
    $("#coins");

  const level =
    $("#level");

  const xp =
    $("#xp");

  const energy =
    $("#energy");

  const playerLabel =
    $("#playerLabel");

  const profileName =
    $("#profileName");

  const profileUsername =
    $("#profileUsername");

  const avatar =
    $("#avatar");

  if (coins) {
    coins.textContent =
      fmt(state.coins);
  }

  if (level) {
    level.textContent =
      fmt(state.level);
  }

  if (xp) {
    xp.textContent =
      fmt(state.xp);
  }

  if (energy) {
    energy.textContent =
      fmt(state.energy);
  }

  if (playerLabel) {
    playerLabel.textContent =
      state.name;
  }

  if (profileName) {
    profileName.textContent =
      state.name;
  }

  if (profileUsername) {
    profileUsername.textContent =
      state.username;
  }

  if (avatar) {
    avatar.textContent =
      state.animal;
  }

  const xpRequired =
    state.level * 300;

  const xpBar =
    $("#xpbar");

  if (xpBar) {
    xpBar.style.width =
      Math.min(
        100,
        (state.xp /
          xpRequired) *
          100
      ) + "%";
  }

  renderMissions();
  renderJobs();
  renderShop();
  renderInventory();
  renderLeaders();
  renderChat();
}

/* =========================
   SCREEN NAVIGATION
========================= */

function show(screenId) {
  $$(".screen").forEach(
    screen => {
      screen.classList.toggle(
        "active",
        screen.id === screenId
      );
    }
  );

  $$(".nav button").forEach(
    button => {
      button.classList.toggle(
        "active",
        button.dataset.go ===
          screenId
      );
    }
  );

  if (screenId === "city") {
    drawMap();
  }

  if (screenId === "chat") {
    renderChat();
  }

  if (screenId === "game") {
    resetGameVisual();
  }
}

$$("[data-go]").forEach(
  button => {
    button.addEventListener(
      "click",
      () => {
        show(
          button.dataset.go
        );
      }
    );
  }
);

/* =========================
   CITY MAP
========================= */

function drawMap() {
  const canvas =
    $("#map");

  if (!canvas) return;

  const ctx =
    canvas.getContext("2d");

  if (!ctx) return;

  const width =
    canvas.width;

  const height =
    canvas.height;

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  /* Grass */

  ctx.fillStyle =
    "#4a8050";

  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  for (
    let y = 0;
    y < height;
    y += 80
  ) {
    ctx.fillStyle =
      y % 160 === 0
        ? "#396d46"
        : "#42774b";

    ctx.fillRect(
      0,
      y,
      width,
      80
    );
  }

  /* Road */

  ctx.fillStyle =
    "#2a343d";

  ctx.fillRect(
    0,
    230,
    width,
    210
  );

  ctx.fillStyle =
    "#202a32";

  ctx.fillRect(
    0,
    255,
    width,
    160
  );

  /* Road markings */

  for (
    let x = 0;
    x < width;
    x += 130
  ) {
    ctx.fillStyle =
      "#d2b74e";

    ctx.fillRect(
      x,
      331,
      75,
      6
    );
  }

  const buildings = [
    [
      "🏛️",
      "شهرداری",
      60,
      55
    ],
    [
      "🏪",
      "فروشگاه",
      310,
      50
    ],
    [
      "🍔",
      "رستوران",
      570,
      55
    ],
    [
      "🎮",
      "آرکید",
      70,
      485
    ],
    [
      "🏠",
      "خانه",
      410,
      485
    ],
    [
      "💼",
      "اداره کار",
      735,
      475
    ]
  ];

  buildings.forEach(
    building => {
      const icon =
        building[0];

      const name =
        building[1];

      const x =
        building[2];

      const y =
        building[3];

      /* Building */

      ctx.fillStyle =
        "#654f3f";

      ctx.beginPath();

      ctx.roundRect(
        x,
        y,
        150,
        105,
        17
      );

      ctx.fill();

      /* Window */

      ctx.fillStyle =
        "#17212a";

      ctx.fillRect(
        x + 14,
        y + 14,
        122,
        58
      );

      /* Icon */

      ctx.font =
        "40px sans-serif";

      ctx.textAlign =
        "center";

      ctx.fillText(
        icon,
        x + 75,
        y + 57
      );

      /* Name */

      ctx.font =
        "bold 13px Vazirmatn";

      ctx.fillStyle =
        "#ffffff";

      ctx.fillText(
        name,
        x + 75,
        y + 91
      );
    }
  );

  /* Player */

  ctx.font =
    "62px sans-serif";

  ctx.textAlign =
    "center";

  ctx.fillText(
    state.animal,
    500,
    325
  );

  ctx.font =
    "bold 12px Vazirmatn";

  ctx.fillStyle =
    "#ffffff";

  ctx.fillText(
    state.name,
    500,
    360
  );
}

/* =========================
   MINI GAME
========================= */

function resetGameVisual() {
  if (gameRunning) {
    return;
  }

  const timer =
    $("#timer");

  const score =
    $("#score");

  if (timer) {
    timer.textContent = "15";
  }

  if (score) {
    score.textContent = "0";
  }
}

const startGameButton =
  $("#startGame");

if (startGameButton) {
  startGameButton.onclick = () => {
    if (gameRunning) {
      return;
    }

    gameRunning = true;
    gameTime = 15;
    gameScore = 0;

    const timer =
      $("#timer");

    const score =
      $("#score");

    if (timer) {
      timer.textContent =
        gameTime;
    }

    if (score) {
      score.textContent =
        gameScore;
    }

    clearInterval(
      gameTimer
    );

    gameTimer =
      setInterval(() => {
        gameTime--;

        if (timer) {
          timer.textContent =
            gameTime;
        }

        if (
          gameTime <= 0
        ) {
          clearInterval(
            gameTimer
          );

          gameRunning =
            false;

          const reward =
            gameScore * 35;

          addCoins(
            reward,
            gameScore * 8
          );

          progressMission(
            "game",
            gameScore
          );

          progressMission(
            "earn",
            reward
          );

          toast(
            "🎁 بازی تمام شد • +" +
              fmt(reward) +
              " سکه"
          );
        }
      }, 1000);
  };
}

const target =
  $("#target");

if (target) {
  target.onclick = () => {
    if (!gameRunning) {
      return;
    }

    gameScore++;

    const score =
      $("#score");

    if (score) {
      score.textContent =
        gameScore;
    }
  };
}

/* =========================
   CHAT SEND
========================= */

const chatSend =
  $("#chatSend");

if (chatSend) {
  chatSend.onclick =
    sendChat;
}

const chatInput =
  $("#chatInput");

if (chatInput) {
  chatInput.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter"
      ) {
        sendChat();
      }
    }
  );
}

function sendChat() {
  const input =
    $("#chatInput");

  if (!input) return;

  const text =
    input.value.trim();

  if (!text) {
    return;
  }

  chats.push([
    state.name,
    text,
    state.animal
  ]);

  input.value = "";

  renderChat();

  toast(
    "💬 پیام ثبت شد"
  );

  /*
    نسخه آنلاین:

    POST /api/chat/messages

    در این قسمت باید پیام
    به سرور ارسال شود.
  */
}

/* =========================
   RESET LOCAL DATA
========================= */

const resetButton =
  $("#resetLocal");

if (resetButton) {
  resetButton.onclick = () => {
    if (
      confirm(
        "اطلاعات تست این دستگاه پاک شود؟"
      )
    ) {
      localStorage.removeItem(
        "azadshahr_state"
      );

      location.reload();
    }
  };
}

/* =========================
   ENERGY REGENERATION
========================= */

setInterval(() => {
  if (state.energy < 100) {
    state.energy =
      Math.min(
        100,
        state.energy + 1
      );

    saveState();
    render();
  }
}, 60000);

/* =========================
   START APPLICATION
========================= */

(async function start() {
  telegramInit();

  render();

  const loading =
    $("#loading");

  const app =
    $("#app");

  if (loading) {
    loading.style.display =
      "none";
  }

  if (app) {
    app.hidden = false;
  }

  /*
    بازدید از شهر
  */

  progressMission(
    "city",
    1
  );

  /*
    اتصال اختیاری به بک‌اند
  */

  await syncBackend();

  /*
    رسم نقشه
  */

  drawMap();
})();
