

const colorButton = document.querySelector("#color-button");
const colorInput = document.querySelector("#color-selector");



colorButton.addEventListener("click", () => colorInput.click());
colorInput.addEventListener("change", function() {
    colorButton.style.backgroundColor = this.value;
});