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
