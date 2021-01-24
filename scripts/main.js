
const COLORBAR_LENGTH = 400;
const COLORBAR_WIDTH = 5;
const COLORBAR_EXTENSION = 70;
const COLORBAR_RADIUS = 10;
const COLORBAR_FILL = "#222222"
const COLORBAR_CIRCLE_STROKE = 3;
const COLORBAR_INITIAL_DIRECTION = 45;
const COLORBAR_PADDING = 2;
const DEFAULT_COLORS = [{position: 0, color: "#ff95f3"}, {position: 100, color: "#008080"}];

const colorButton = document.querySelector("#color-button");
const colorInput = document.querySelector("#color-selector");
const previewWindow = document.querySelector("#preview-window");
const colorBarContainer = document.querySelector("#colorbar-container");
const hideButton = document.querySelector("#hide-colorbar");

let numberOfLayers = 0;

function interpolatePosition(startPoint, endPoint, weight) {
    const x = startPoint.x + 
        (endPoint.x - startPoint.x) * parseFloat(weight)/100;
    const y = startPoint.y + 
        (endPoint.y - startPoint.y) * parseFloat(weight)/100;
    return({x: x, y: y});
}

class Colorbar {
    constructor(layerId, initialColors = DEFAULT_COLORS) {
        this.colors = initialColors;
        this.layerId = layerId;
        this.svgObject = new ColorbarSVG(this);
    }
    addColor(color, position) {
        this.colors.push({color: color, position: position});
        this.svgObject.addColor(color, this.colors.length);
        this.svgObject.updatePositions();
    }
    updateColorbar() {

    }
}

class ColorbarSVG {
    constructor(colorbar) {
        this.cbo = colorbar;
        console.log(colorbar);
        this.elements = {};
        this.svgContainer = null;

        this.lineStartX = previewWindow.offsetWidth / 2 -
            COLORBAR_LENGTH / 2 * Math.cos(COLORBAR_INITIAL_DIRECTION * Math.PI / 180);
        this.lineStartY = previewWindow.offsetHeight / 2 - 
            COLORBAR_LENGTH / 2 * Math.sin(COLORBAR_INITIAL_DIRECTION * Math.PI / 180);
        this.lineEndX = previewWindow.offsetWidth / 2 +
            COLORBAR_LENGTH / 2 * Math.cos(COLORBAR_INITIAL_DIRECTION * Math.PI / 180);
        this.lineEndY = previewWindow.offsetHeight / 2 + 
            COLORBAR_LENGTH / 2 * Math.sin(COLORBAR_INITIAL_DIRECTION * Math.PI / 180);
        this.setupSVGStructure();
        /*this.storeElementReferences();*/
        this.updatePositions();
        this.addInitialListeners();
    }

    get direction() {
        const direction = 180 / Math.PI * 
            Math.atan2(this.lineEndY - this.lineStartY, this.lineEndX - this.lineStartX);
        return(direction);
    }

    updateLineStart(x, y) {
        this.lineStartX = x;
        this.lineStartY = y;
        this.updatePositions();
    }

    updateLineEnd(x, y) {
        this.lineEndX = x;
        this.lineEndY = y;
        this.updatePositions();
    }

    setupSVGStructure() {
        const elements = {};
        const svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        svgContainer.setAttribute("layer-id", this.cbo.layerId);
        
        // Contains the main part of the colorbar, except the color circles
        const structureContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        structureContainer.setAttribute("layer-id", this.cbo.layerId);

        // Main line, on which the colors are placed
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("linecap", "round");
        line.setAttribute("stroke", COLORBAR_FILL);
        line.setAttribute("stroke-width", COLORBAR_WIDTH);

        line.setAttribute("layer-id", this.cbo.layerId);
        line.classList.add("svg-colorline")
        
        elements.line = line;
        structureContainer.append(line);

        // Extender which connects line to rotation button
        const extender = document.createElementNS("http://www.w3.org/2000/svg", "line");
        
        extender.setAttribute("linecap", "round");
        extender.setAttribute("stroke-dasharray", "2, 2");
        extender.setAttribute("stroke", COLORBAR_FILL);
        extender.setAttribute("stroke-width", COLORBAR_WIDTH / 3);

        extender.setAttribute("layer-id", this.cbo.layerId);
        elements.extender = extender;
        extender.classList.add("svg-extender");
        structureContainer.append(extender);

        // Button used for changing direction of gradient
        const rotationButton = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        
        rotationButton.setAttribute("r", COLORBAR_RADIUS);
        rotationButton.setAttribute("stroke", COLORBAR_FILL);
        rotationButton.setAttribute("stroke-width", COLORBAR_CIRCLE_STROKE);
        rotationButton.setAttribute("fill", "transparent");
        
        rotationButton.setAttribute("layer-id", this.cbo.layerId);
        elements.rotationButton = rotationButton;
        rotationButton.classList.add("svg-rotation");
        structureContainer.append(rotationButton);

        svgContainer.append(structureContainer);

        // Contains the color circles
        const colors = this.cbo.colors;

        const colorContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        colorContainer.classList.add("svg-color-container");
        colorContainer.setAttribute("layer-id", this.cbo.layerId);
        elements.colors = [];
        for (let i = 0; i < colors.length; i++) {
            const colorElement = this.generateColorElement(colors[i].color, i);
            elements.colors.push(colorElement);
            colorContainer.append(colorElement);
        }

        svgContainer.append(colorContainer);
        this.svgContainer = svgContainer;
        colorBarContainer.append(svgContainer);
        this.elements = elements;
    }

    computePositions() {
        const p = {
            lineStartX: this.lineStartX,                         
            lineStartY: this.lineStartY,
            lineEndX: this.lineEndX,
            lineEndY: this.lineEndY
        };
        const direction = this.direction;
        p.extenderEndX = p.lineEndX + (COLORBAR_EXTENSION) *
                            Math.cos(direction * Math.PI / 180);
        p.extenderEndY = p.lineEndY + (COLORBAR_EXTENSION) * 
                            Math.sin(direction * Math.PI / 180);
        p.rotationX = p.extenderEndX + (COLORBAR_RADIUS + COLORBAR_PADDING) *
                            Math.cos(direction * Math.PI / 180);
        p.rotationY = p.extenderEndY + (COLORBAR_RADIUS + COLORBAR_PADDING) * 
                            Math.sin(direction * Math.PI / 180);
                            
        const colors = this.cbo.colors;
        p.colors = [];
        for (let i = 0; i < colors.length; i++) {
            p.colors[i] = interpolatePosition(
                {x: p.lineStartX, y: p.lineStartY},
                {x: p.lineEndX, y: p.lineEndY}, colors[i].position);
        }
        return(p);
    }

    updatePositions() {
        const p = this.computePositions();

        this.elements.line.setAttribute("x1", p.lineStartX);
        this.elements.line.setAttribute("y1", p.lineStartY);
        this.elements.line.setAttribute("x2", p.lineEndX);
        this.elements.line.setAttribute("y2", p.lineEndY);

        this.elements.extender.setAttribute("x1", p.lineEndX);
        this.elements.extender.setAttribute("y1", p.lineEndY);
        this.elements.extender.setAttribute("x2", p.extenderEndX);
        this.elements.extender.setAttribute("y2", p.extenderEndY);

        this.elements.rotationButton.setAttribute("cx", p.rotationX);
        this.elements.rotationButton.setAttribute("cy", p.rotationY);
        
        const colors = this.cbo.colors;
        for (let i = 0; i < colors.length; i++) {
            this.elements.colors[i].setAttribute("cx", p.colors[i].x);
            this.elements.colors[i].setAttribute("cy", p.colors[i].y);
        }
    }

    generateColorElement(color, colorId) {
        const colorElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        colorElement.setAttribute("r", COLORBAR_RADIUS);
        colorElement.setAttribute("stroke", COLORBAR_FILL);
        colorElement.setAttribute("stroke-width", COLORBAR_CIRCLE_STROKE);
        colorElement.setAttribute("fill", color);
        colorElement.setAttribute("layer-id", this.cbo.layerId);
        colorElement.setAttribute("color-id", colorId);
        colorElement.classList.add("svg-color-element");
        return(colorElement);
    }

    addColor(color, colorId) {
        const colorElement = this.generateColorElement(color, colorId);
        const colorContainer = document.querySelector(`.svg-color-container[layer-id="${this.cbo.layerId}"]`)
        colorContainer.append(colorElement);
        this.elements.colors.push(colorElement);
        this.updatePositions();
    }

    addInitialListeners() {
        const numColors = this.elements.colors.length;
        this.elements.colors[0].addEventListener("mousedown", handleStartColorMouseDown);
        this.elements.colors[numColors - 1].addEventListener("mousedown", handleEndColorMouseDown);
        console.log(this.elements.colors[numColors-1]);
    }
}

class Gradient {
    constructor(colors = DEFAULT_COLORS) {
        this.layerId = numberOfLayers;
        this.colors = colors;
        numberOfLayers++;
        this.colorbar = new Colorbar(this.layerId, this.colors);
    }
    updateGradient() {
        const direction = this.colorbar.svgObject.direction + 90;
        const colorString = this.colors.map(obj => `${obj.color} ${obj.position}%`).join(", ");
        const gradientString = `linear-gradient(${direction}deg, ${colorString})`;
        previewWindow.style.backgroundImage = gradientString;
        /*previewWindow.style.backgroundImage = `linear-gradient(45.3464363463463643deg, red, blue)`;*/
    }
    addColor(color, position) {
        this.colors.push({position: position, color: color});
        this.colorbar.addColor(color, position);
    }
}

function hideColorbar() {

}

function handleRotation() {

}

function rotateColorbar() {

}

function handleStartColorMouseDown(startOrEndFlag) {
    const parentGradientObject = gradientArray[this.getAttribute("layer-id")];
    function currentHandler(event) {
        handleStartColorMove(event, parentGradientObject);
    } 
    previewWindow.addEventListener("mousemove", currentHandler);
    const eventRemove = () => previewWindow.removeEventListener("mousemove", currentHandler);
    previewWindow.addEventListener("mouseup", eventRemove);
    previewWindow.addEventListener("mouseleave", eventRemove);
}

function handleStartColorMove(e, gradientObject) {
    gradientObject.colorbar.svgObject.updateLineStart(e.offsetX, e.offsetY);
    gradientObject.updateGradient();
}

function handleEndColorMouseDown(startOrEndFlag) {
    console.log("test");
    const parentGradientObject = gradientArray[this.getAttribute("layer-id")];
    function currentHandler(event) {
        handleEndColorMove(event, parentGradientObject);
    } 
    previewWindow.addEventListener("mousemove", currentHandler);
    const eventRemove = () => previewWindow.removeEventListener("mousemove", currentHandler);
    previewWindow.addEventListener("mouseup", eventRemove);
    previewWindow.addEventListener("mouseleave", eventRemove);
}

function handleEndColorMove(e, gradientObject) {
    gradientObject.colorbar.svgObject.updateLineEnd(e.offsetX, e.offsetY);
    gradientObject.updateGradient();
}




// Listen for clicks on color circle, trigger color input
colorButton.addEventListener("click", () => colorInput.click());
// Update after giving input
colorInput.addEventListener("change", function() {
    colorButton.style.backgroundColor = this.value;
});

const gradientArray = [];


const gradient = new Gradient();

gradientArray.push(gradient);


/*svgElem.children[0].children[2].addEventListener("mousedown", () => console.log("y"));*/