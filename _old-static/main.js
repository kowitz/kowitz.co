// Navigation hide/show

window.addEventListener("load", () => {
  const nav = document.querySelector("nav");
  const name = document.querySelector(".intro__name");
  let isNavShown = false;
  const handleScroll = () => {
    const namePosition = name.getBoundingClientRect().bottom;
    if (namePosition < 0 && !isNavShown) {
      nav.style.opacity = 1;
      isNavShown = true;
    } else if (namePosition > 0 && isNavShown) {
      nav.style.opacity = 0;
      isNavShown = false;
    }
  };
  window.addEventListener("scroll", handleScroll);
});

// Email: Prevent most scraping by requiring an interaction and a bit of computation
const EMAIL_HINT = "*ow**z@gmail.com";
const EMAIL_HASH =
  "d6495b96fe68b9e8a0eee26167f4ff6999933591f0467fa22a921dbebe2366ec";
async function hash(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function isCorrectEmail(email) {
  const hashEmail = await hash(email);
  return hashEmail === EMAIL_HASH;
}
async function findEmail(hint) {
  if (hint.includes("*")) {
    const possibleCharacters = "abcdefghijklmnopqrstuvwxyz0123456789-_";
    for (const char of possibleCharacters) {
      const newHint = hint.replace("*", char);
      const match = await findEmail(newHint);
      if (match) return match;
    }
    return null;
  } else if (await isCorrectEmail(hint)) {
    return hint;
  } else {
    return null;
  }
}
async function handleContactMe() {
  const action = document.querySelector(".footer__contactAction");
  const button = document.querySelector(".footer__contactButton");
  const emailLink = document.querySelector("#emailLink");
  const email = await findEmail(EMAIL_HINT);
  button.blur();
  if (!email) {
    alert("Sorry, something went wrong. Try reaching me via LinkedIn.");
    return;
  }
  emailLink.href = `mailto:${email}`;
  emailLink.innerHTML = email;
  action.classList.add("footer__contactAction--revealed");
  button.classList.add("footer__contactButton--revealed");
  // Select the link for easy copying
  var emailRange = document.createRange();
  emailRange.selectNodeContents(emailLink);
  var selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(emailRange);
}

// Google Analytics

(function (i, s, o, g, r, a, m) {
  i["GoogleAnalyticsObject"] = r;
  (i[r] =
    i[r] ||
    function () {
      (i[r].q = i[r].q || []).push(arguments);
    }),
    (i[r].l = 1 * new Date());
  (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]);
  a.async = 1;
  a.src = g;
  m.parentNode.insertBefore(a, m);
})(
  window,
  document,
  "script",
  "https://www.google-analytics.com/analytics.js",
  "ga"
);

ga("create", "UA-89922305-1", "auto");
ga("send", "pageview");
