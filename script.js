// ── 기부증서 팝업 ──
const certificateOpen = document.querySelector("#certificate-open");
const certificateClose = document.querySelector("#certificate-close");
const certificateDialog = document.querySelector("#certificate-dialog");

// 팝업을 열었던 버튼을 기억합니다.
let certificateReturnFocus = null;

// 첫 화면의 미리보기와 성장 본문의 버튼을 모두 찾습니다.
const certificateTriggers = document.querySelectorAll(
  "#certificate-open, [data-certificate-open]"
);

certificateTriggers.forEach((button) => {
  button.addEventListener("click", () => {
    if (certificateDialog.open) return;

    certificateReturnFocus = button;
    certificateDialog.showModal();
    document.body.classList.add("modal-open");
  });
});

// 닫기 버튼으로 팝업을 닫습니다.
// Esc 키는 dialog의 기본 동작으로 처리됩니다.
certificateClose.addEventListener("click", () => {
  certificateDialog.close();
});

// 어느 위치에서 열었든 그 버튼으로 돌아갑니다.
certificateDialog.addEventListener("close", () => {
  document.body.classList.remove("modal-open");

  if (certificateReturnFocus?.isConnected) {
    certificateReturnFocus.focus({ preventScroll: true });
  }
});

// ── 목차와 처음으로 돌아가기 ──
const intro = document.querySelector(".intro");
const homeButton = document.querySelector("#home-button");
const menuButtons = [...document.querySelectorAll(".menu-button")];
const motionButton = document.querySelector("#motion-button");

// 현재 선택된 목차. null이면 초기 화면입니다.
let selectedSection = null;
let runningAnimations = [];

// ── 모션 설정 ──
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

let savedMotion = null;

// 브라우저가 저장을 차단해도 나머지 기능은 작동하게 합니다.
try {
  savedMotion = localStorage.getItem("intro-motion");
} catch {
  savedMotion = null;
}

let motionEnabled =
  savedMotion === "on" ||
  (savedMotion !== "off" && !reducedMotion.matches);

function updateMotionButton() {
  motionButton.textContent = motionEnabled ? "모션 ON" : "모션 OFF";
  motionButton.setAttribute("aria-pressed", String(motionEnabled));
  document.body.classList.toggle("motion-off", !motionEnabled);
}

function stopAnimations() {
  runningAnimations.forEach((animation) => animation.cancel());
  runningAnimations = [];
  intro.classList.remove("is-moving");
}

motionButton.addEventListener("click", () => {
  motionEnabled = !motionEnabled;

  if (!motionEnabled) {
    stopAnimations();
  }

  updateMotionButton();

  savedMotion = motionEnabled ? "on" : "off";

  try {
    localStorage.setItem("intro-motion", savedMotion);
  } catch {
    // 저장이 불가능한 경우에도 현재 화면의 설정은 유지합니다.
  }
});

// 직접 설정한 값이 없을 때만 운영체제 설정 변경을 따라갑니다.
reducedMotion.addEventListener("change", () => {
  if (savedMotion !== null) return;

  motionEnabled = !reducedMotion.matches;

  if (!motionEnabled) {
    stopAnimations();
  }

  updateMotionButton();
});

updateMotionButton();

// ── 선택 상태에 맞춰 최종 위치를 지정합니다. ──
function applyMenuLayout() {
  intro.classList.toggle("is-selected", selectedSection !== null);

  let row = 2;

  menuButtons.forEach((button) => {
    const item = button.parentElement;
    const isCurrent = button.dataset.section === selectedSection;

    item.classList.toggle("is-current", isCurrent);
    item.classList.toggle(
      "is-long",
      button.textContent.trim().length > 5
    );

    button.setAttribute("aria-pressed", String(isCurrent));

    if (!isCurrent) {
      item.style.setProperty("--menu-row", row);
      item.style.setProperty("--mobile-row", row + 1);
      row += 1;
    }
  });
}

// ── 변경 전과 변경 후 위치를 연결합니다. ──
function changeSection(nextSection) {
  if (selectedSection === nextSection) return;

  const elements = [homeButton, ...menuButtons];

  // 이동 중에 다시 눌러도 현재 보이는 위치에서 이어집니다.
  const before = elements.map((element) =>
    element.getBoundingClientRect()
  );

  stopAnimations();

  selectedSection = nextSection;
  applyMenuLayout();
  updateStoryContent();

  if (!motionEnabled) return;

  intro.classList.add("is-moving");

  const after = elements.map((element) =>
    element.getBoundingClientRect()
  );

  const animations = elements.map((element, index) => {
    const first = before[index];
    const last = after[index];

    const moveX = first.left - last.left;
    const moveY = first.top - last.top;
    const scaleX = last.width ? first.width / last.width : 1;
    const scaleY = last.height ? first.height / last.height : 1;

    return element.animate(
      [
        {
          transformOrigin: "top left",
          transform:
            `translate(${moveX}px, ${moveY}px) ` +
            `scale(${scaleX}, ${scaleY})`,
        },
        {
          transformOrigin: "top left",
          transform: "translate(0, 0) scale(1, 1)",
        },
      ],
      {
        duration: 600,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );
  });

  runningAnimations = animations;

  Promise.allSettled(
    animations.map((animation) => animation.finished)
  ).then(() => {
    // 이전 애니메이션이 새 애니메이션 상태를 바꾸지 않게 합니다.
    if (runningAnimations === animations) {
      runningAnimations = [];
      intro.classList.remove("is-moving");
    }
  });
}

// 버튼은 마우스 클릭뿐 아니라 Enter와 Space도 지원합니다.
menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    changeSection(button.dataset.section);
  });
});

homeButton.addEventListener("click", () => {
  changeSection(null);
});

// 화면 크기가 바뀌면 진행 중인 움직임을 정리합니다.
window.addEventListener("resize", stopAnimations);

applyMenuLayout();

// ── 목차별 소제목과 본문 ──

// 왼쪽 이름은 메뉴 버튼의 data-section 값,
// 오른쪽은 해당 본문 section의 id입니다.
const contentSections = {
  story: document.querySelector("#story-content"),
  values: document.querySelector("#values-content"),
  experience: document.querySelector("#experience-content"),
  relationships: document.querySelector("#relationships-content"),
  goals: document.querySelector("#goals-content"),
  privacy: document.querySelector("#privacy-content"),
};

// 두 영역에 있는 소제목 버튼을 모두 모읍니다.
const accordionButtons = Object.values(contentSections).flatMap(
  (section) => [...section.querySelectorAll(".accordion-toggle")]
);

// 소제목 하나의 펼침 상태를 변경합니다.
function setAccordionState(button, isOpen) {
  const panelId = button.getAttribute("aria-controls");
  const panel = document.getElementById(panelId);
  const symbol = button.querySelector(".accordion-symbol");

  button.setAttribute("aria-expanded", String(isOpen));
  panel.setAttribute("aria-hidden", String(!isOpen));

  // 접힌 본문은 키보드와 화면 읽기 프로그램에서 제외합니다.
  panel.inert = !isOpen;
  panel.classList.toggle("is-open", isOpen);

  symbol.textContent = isOpen ? "−" : "+";
}

// 기존 changeSection 함수에서 호출하는 이름을 유지합니다.
// 이제 이야기뿐 아니라 등록된 모든 본문 영역을 관리합니다.
function updateStoryContent() {
  let hasVisibleContent = false;

  Object.entries(contentSections).forEach(([sectionName, section]) => {
    const isSelected = selectedSection === sectionName;

    section.hidden = !isSelected;

    if (isSelected) {
      hasVisibleContent = true;
    }
  });

  // 작은 화면에서 본문 아래로 나머지 목차를 배치합니다.
  intro.classList.toggle("has-story", hasVisibleContent);

  // 메인 목차가 바뀌면 모든 본문을 접습니다.
  accordionButtons.forEach((button) => {
    setAccordionState(button, false);
  });
}

// 소제목을 누르면 해당 본문만 펼칩니다.
accordionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const shouldOpen =
      button.getAttribute("aria-expanded") !== "true";

    accordionButtons.forEach((otherButton) => {
      const isOpen = otherButton === button && shouldOpen;
      setAccordionState(otherButton, isOpen);
    });
  });
});

// 첫 화면에서는 모든 본문 영역을 숨깁니다.
updateStoryContent();