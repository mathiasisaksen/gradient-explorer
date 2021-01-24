
const COLORBAR_LENGTH = 210;
const COLORBAR_WIDTH = 5;
const COLORBAR_EXTENSION = 70;
const COLORBAR_RADIUS = 6;
const COLORBAR_FILL = "#222222"
const COLORBAR_CIRCLE_STROKE = 1;

const colorButton = document.querySelector("#color-button");
const colorInput = document.querySelector("#color-selector");
const previewWindow = document.querySelector("#preview-window");
const colorBarContainer = document.querySelector("#colorbar-container");
const hideButton = document.querySelector("#hide-colorbar");

class Colorbar {
    constructor(initialColors = {0: "red", 100: "blue"}, initialDirection = 45) {
        this.xCenter = previewWindow.offsetWidth/2;
        this.yCenter = previewWindow.offsetHeight/2;
        this.direction = initialDirection;
        this.colors = initialColors;
        this.svgObject = this.generateSVG();
    }
    updateColorbar() {

    }
    generateSVG() {
        const colorBarStart = this.xCenter
        let colorBar = `<line x1="150" y1="150" x2="300" y2="300" stroke-linecap="round" style="stroke:rgb(0,0,0, 1);stroke-width:5"/>`
    }
}

class ColorbarSVG {
    constructor(colorbar) {
        this.cbo = colorbar;
        this.colorContainer = null;
    }

    get lineStart() {
        const x = this.cbo.xCenter - 
                            COLORBAR_LENGTH/2 * Math.cos(Math.PI * this.cbo.direction/180);
        const y = this.cbo.yCenter - 
                            COLORBAR_LENGTH/2 * Math.sin(Math.PI * this.cbo.direction/180);
        return({x: x, y: y});
    }

    get lineEnd() {
        const x = this.cbo.xCenter + 
                            COLORBAR_LENGTH/2 * Math.cos(Math.PI * this.cbo.direction/180);
        const y = this.cbo.yCenter + 
                            COLORBAR_LENGTH/2 * Math.sin(Math.PI * this.cbo.direction/180);
        return({x: x, y: y});
    }

    get extenderEnd() {
        const lineEnd = this.lineEnd;
        const x = lineEnd.x + (COLORBAR_EXTENSION - COLORBAR_RADIUS - 2) *
                            Math.cos(Math.PI * this.cbo.direction/180);
        const y = lineEnd.y + (COLORBAR_EXTENSION - COLORBAR_RADIUS - 2) * 
                            Math.sin(Math.PI * this.cbo.direction/180);
        return({x: x, y: y});
    }

    get rotationLocation() {
        const extenderEnd = this.extenderEnd;
        const x = extenderEnd.x + (COLORBAR_RADIUS + 2) *
                            Math.cos(Math.PI * this.cbo.direction/180);
        const y = extenderEnd.y + (COLORBAR_RADIUS + 2) * 
                            Math.sin(Math.PI * this.cbo.direction/180);
        return({x: x, y: y});
    }

    generateSVGElement() {
        const svgContainer = document.createElement("g");

        const structureContainer = document.createElement("g");

        const line = document.createElement("line");

        const lineStart = this.lineStart;
        const lineEnd = this.lineEnd;
        line.setAttribute("x1", lineStart.x);
        line.setAttribute("y1", lineStart.y);
        line.setAttribute("x2", lineEnd.x);
        line.setAttribute("y2", lineEnd.y);
        line.setAttribute("linecap", "round");
        line.setAttribute("stroke", COLORBAR_FILL);
        line.setAttribute("stroke-width", COLORBAR_WIDTH);
        structureContainer.append(line);

        const extender = document.createElement("line");
        
        const extenderEnd = this.extenderEnd;
        extender.setAttribute("x1", lineEnd.x);
        extender.setAttribute("y1", lineEnd.y);
        extender.setAttribute("x2", extenderEnd.x);
        extender.setAttribute("y2", extenderEnd.y);
        extender.setAttribute("linecap", "round");
        extender.setAttribute("stroke-dasharray", "2, 2");
        extender.setAttribute("stroke", COLORBAR_FILL);
        extender.setAttribute("stroke-width", COLORBAR_WIDTH / 3);
        structureContainer.append(extender);

        const rotationButton = document.createElement("circle");

        const buttonLocation = this.rotationLocation;
        rotationButton.setAttribute("cx", buttonLocation.x);
        rotationButton.setAttribute("cy", buttonLocation.y);
        rotationButton.setAttribute("r", COLORBAR_RADIUS);
        rotationButton.setAttribute("stroke", COLORBAR_FILL);
        rotationButton.setAttribute("stroke-width", COLORBAR_CIRCLE_STROKE);
        rotationButton.setAttribute("fill", "transparent");

        structureContainer.append(rotationButton);
        svgContainer.append(structureContainer);

        const colorContainer = document.createElement("g");
        this.colorContainer = colorContainer;
        const colors = this.cbo.colors;
        for (const position in colors) {
            const colorElement = this.generateColorElement(colors[position], position);
            colorContainer.append(colorElement);
        }
        svgContainer.append(colorContainer);
        return(svgContainer);
    }

    generateColorElement(color, position) {
        const lineStart = this.lineStart;
        const lineEnd = this.lineEnd;

        const colorPositionX = lineStart.x + (
            lineEnd.x - lineStart.x) * parseFloat(position)/100;
        const colorPositionY = lineStart.y + 
        (lineEnd.y - lineStart.y) * parseFloat(position)/100;


        const colorElement = document.createElement("circle");
        colorElement.setAttribute("cx", colorPositionX);
        colorElement.setAttribute("cy", colorPositionY);
        colorElement.setAttribute("r", COLORBAR_RADIUS);
        colorElement.setAttribute("stroke", COLORBAR_FILL);
        colorElement.setAttribute("stroke-width", COLORBAR_CIRCLE_STROKE);
        colorElement.setAttribute("fill", color);
        return(colorElement);
    }

    addColor(color, position) {
        const colorElement = this.generateColorElement(colors, position);
        this.colorContainer.append(this.colorContainer);
    }
}

class Gradient {
    constructor() {
        this.colorbar = new Colorbar();
    }
}

function hideColorbar() {

}

colorButton.addEventListener("click", () => colorInput.click());
colorInput.addEventListener("change", function() {
    colorButton.style.backgroundColor = this.value;
});


const cb = new Colorbar();
const cbSVG = new ColorbarSVG(cb);
const svgElem = cbSVG.generateSVGElement();

colorBarContainer.innerHTML = svgElem.innerHTML;
/*colorBarContainer.innerHTML = "";
colorBarContainer.append(svgElem);*/