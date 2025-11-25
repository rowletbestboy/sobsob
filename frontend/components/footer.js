document.addEventListener("DOMContentLoaded", () => {
  fetch("/frontend/components/footer.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("footer").innerHTML = html;
    })
    .catch(err => console.error("Footer load error:", err));
});
