const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirm-password");
const errorText = document.getElementById("password-error");

function checkPasswordMatch() {
  if (password.value === "" || confirmPassword.value === "") {
    errorText.style.display = "none";
    confirmPassword.classList.remove("input-error");
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorText.style.display = "block";
    confirmPassword.classList.add("input-error");
  } else {
    errorText.style.display = "none";
    confirmPassword.classList.remove("input-error");
  }
}
password.addEventListener("input", checkPasswordMatch);
confirmPassword.addEventListener("input", checkPasswordMatch);
