// No analytics, no trackers. Just the lens demo, the light switch and the feedback mailto builder.
(function () {
  // Light switch
  document.querySelectorAll("[data-lights]").forEach(function (b) {
    b.addEventListener("click", function () {
      var dark = document.body.classList.toggle("dark");
      document.querySelectorAll("[data-lights]").forEach(function (x) {
        x.textContent = dark ? "Turn the lights on" : "Kill the lights";
      });
    });
  });

  // Lens demo
  var box = document.getElementById("lensbox");
  if (box) {
    var base = box.querySelector(".fineprint");
    var lens = document.createElement("div");
    lens.className = "lens";
    var inner = document.createElement("div");
    inner.className = "inner";
    var copy = base.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    inner.appendChild(copy);
    lens.appendChild(inner);
    box.appendChild(lens);
    var S = 3.4;
    function place(x, y) {
      var r = lens.offsetWidth / 2;
      var w = box.clientWidth;
      x = Math.max(0, Math.min(w, x));
      y = Math.max(0, Math.min(box.clientHeight, y));
      lens.style.transform = "translate(" + (x - r) + "px," + (y - r) + "px)";
      inner.style.width = w + "px";
      inner.style.transform = "translate(" + (r - x * S) + "px," + (r - y * S) + "px) scale(" + S + ")";
    }
    function move(e) {
      var b = box.getBoundingClientRect();
      place(e.clientX - b.left, e.clientY - b.top);
      e.preventDefault();
    }
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerdown", move);
    window.addEventListener("resize", function () { place(box.clientWidth / 2, 90); });
    place(box.clientWidth / 2, 90);
  }

  // Feedback form -> opens the person's own email app. Nothing is sent to us by the website.
  var f = document.getElementById("fb");
  if (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(f);
      var lines = [
        "Could you read the small print? " + (d.get("read") || "-"),
        "What did you point it at? " + (d.get("target") || "-"),
        "How fast was it readable after tapping the icon? " + (d.get("speed") || "-"),
        "Phone: " + (d.get("phone") || "-"),
        "Would you pay $1.99 once to keep it? " + (d.get("pay") || "-"),
        "What annoyed you: " + (d.get("annoy") || "-")
      ];
      var to = f.getAttribute("data-to");
      location.href = "mailto:" + to + "?subject=" + encodeURIComponent("See It Yo beta feedback") +
        "&body=" + encodeURIComponent(lines.join("\n"));
    });
  }
})();
