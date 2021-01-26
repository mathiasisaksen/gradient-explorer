
const COLORBAR_LENGTH = 400;
const COLORBAR_WIDTH = 7;
const COLORBAR_EXTENSION = 70;
const COLORBAR_RADIUS = 10;
const COLORBAR_FILL = "#222222"
const COLORBAR_CIRCLE_STROKE = 3;
const COLORBAR_INITIAL_DIRECTION = 45;
const COLORBAR_PADDING = 2;
const DEFAULT_COLORS = [{position: 0, color: "#ff95f3"}, {position: 100, color: "#008080"}];
const DEFAULT_NEW_COLOR = "red";

const colorButton = document.querySelector("#color-button");
const colorInput = document.querySelector("#color-selector");
const previewWindow = document.querySelector("#preview-window");
const colorBarContainer = document.querySelector("#colorbar-container");
const hideButton = document.querySelector("#hide-colorbar");

let numberOfLayers = 0;

function interpolatePosition(startPoint, endPoint, weight) {
    const x = startPoint.x + 
        (endPoint.x - startPoint.x) * parseFloat(weight) / 100;
    const y = startPoint.y + 
        (endPoint.y - startPoint.y) * parseFloat(weight) / 100;
    return({x: x, y: y});
}

function computeWeightOfNearestPointOnLine(point, lineStart, lineEnd) {
    const u = {x: lineEnd.x - lineStart.x, y: lineEnd.y - lineStart.y};
    const v = {x: point.x - lineStart.x, y: point.y - lineStart.y};
    const uLength2 = u.x**2 + u.y**2;
    const uvProd = u.x * v.x + u.y * v.y;
    const weight = uvProd/uLength2;
    if (weight >= 1) {
        return 1;
    } else if (weight <= 0) {
        return 0;
    }
    return(weight);
}

function computeNearestPointOnLine(point, lineStart, lineEnd) {
    const weight = computeWeightOfNearestPointOnLine(point, lineStart, lineEnd);
    return(interpolatePosition(lineStart, lineEnd, 100 * weight));
}

class Colorbar {
    constructor(gradient) {
        this.gradient = gradient;
        this.svgElements = {};
        this.initialSVGSetup();
    }

    initialSVGSetup() {
        this.lineStartX = previewWindow.offsetWidth / 2 -
            COLORBAR_LENGTH / 2 * Math.cos(COLORBAR_INITIAL_DIRECTION * Math.PI / 180);
        this.lineStartY = previewWindow.offsetHeight / 2 - 
            COLORBAR_LENGTH / 2 * Math.sin(COLORBAR_INITIAL_DIRECTION * Math.PI / 180);
        this.lineEndX = previewWindow.offsetWidth / 2 +
            COLORBAR_LENGTH / 2 * Math.cos(COLORBAR_INITIAL_DIRECTION * Math.PI / 180);
        this.lineEndY = previewWindow.offsetHeight / 2 + 
            COLORBAR_LENGTH / 2 * Math.sin(COLORBAR_INITIAL_DIRECTION * Math.PI / 180);
        this.setupSVGStructure();
        this.updatePositions();
        this.addInitialListeners();
    }

    generateColorElement(color, colorId) {
        const colorElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        colorElement.setAttribute("r", COLORBAR_RADIUS);
        colorElement.setAttribute("stroke", COLORBAR_FILL);
        colorElement.setAttribute("stroke-width", COLORBAR_CIRCLE_STROKE);
        colorElement.setAttribute("fill", color);
        colorElement.setAttribute("layer-id", this.gradient.layerId);
        colorElement.setAttribute("color-id", colorId);
        colorElement.classList.add("svg-color-element");
        return(colorElement);
    }

    addColor(color, colorId) {
        console.log(`${colorId} ${color}`)
        const colorElement = this.generateColorElement(color, colorId);
        const colorContainer = document.querySelector(`.svg-color-container[layer-id="${this.gradient.layerId}"]`)
        colorContainer.append(colorElement);
        this.svgElements.colors[colorId] = colorElement;
        this.updatePositions();
    }

    updateColor(color, colorId) {
        this.svgElements.colors[colorId].setAttribute("fill", color);
    }

    setupSVGStructure() {
        const elements = {};
        const svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        svgContainer.setAttribute("layer-id", this.gradient.layerId);
        
        // Contains the main part of the colorbar, except the color circles
        const structureContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        structureContainer.setAttribute("layer-id", this.gradient.layerId);

        // Main line, on which the colors are placed
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("linecap", "round");
        line.setAttribute("stroke", COLORBAR_FILL);
        line.setAttribute("stroke-width", COLORBAR_WIDTH);

        line.setAttribute("layer-id", this.gradient.layerId);
        line.classList.add("svg-colorline")
        
        elements.line = line;
        structureContainer.append(line);

        // Extender which connects line to rotation button
        const extender = document.createElementNS("http://www.w3.org/2000/svg", "line");
        
        extender.setAttribute("linecap", "round");
        extender.setAttribute("stroke-dasharray", "2, 2");
        extender.setAttribute("stroke", COLORBAR_FILL);
        extender.setAttribute("stroke-width", COLORBAR_WIDTH / 3);

        extender.setAttribute("layer-id", this.gradient.layerId);
        elements.extender = extender;
        extender.classList.add("svg-extender");
        structureContainer.append(extender);

        // Button used for changing direction of gradient
        const rotationButton = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        
        rotationButton.setAttribute("r", COLORBAR_RADIUS);
        rotationButton.setAttribute("stroke", COLORBAR_FILL);
        rotationButton.setAttribute("stroke-width", COLORBAR_CIRCLE_STROKE);
        rotationButton.setAttribute("fill", "transparent");
        
        rotationButton.setAttribute("layer-id", this.gradient.layerId);
        elements.rotationButton = rotationButton;
        rotationButton.classList.add("svg-rotation");
        structureContainer.append(rotationButton);

        svgContainer.append(structureContainer);

        // Contains the color circles
        const colorContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        colorContainer.classList.add("svg-color-container");
        const colors = this.gradient.colors;
        colorContainer.setAttribute("layer-id", this.gradient.layerId);
        elements.colors = {};
        for (const colorId in this.gradient.colors) {
            const colorElement = this.generateColorElement(colors[colorId].color, colorId);
            elements.colors[colorId] = colorElement;
            colorContainer.append(colorElement);
        }
        svgContainer.append(colorContainer);
        
        colorBarContainer.append(svgContainer);

        this.svgContainer = svgContainer;
        this.svgElements = elements;
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
                            
        const colors = this.gradient.colors;
        p.colors = {};
        for (const colorId in colors) {
            p.colors[colorId] = interpolatePosition(
                {x: p.lineStartX, y: p.lineStartY},
                {x: p.lineEndX, y: p.lineEndY}, colors[colorId].position);
        }
        return(p);
    }

    setLinePositions(lineStartX, lineStartY, lineEndX, lineEndY) {
        line.setAttribute("x1", lineStartX);
        line.setAttribute("y1", lineStartY);
        line.setAttribute("x2", lineEndX);
        line.setAttribute("y2", lineEndY);
    }

    setLineAttributes(line, widthFactor, strokeDash) {
        line.setAttribute("linecap", "round");
        line.setAttribute("stroke-dasharray", strokeDash);
        line.setAttribute("stroke", COLORBAR_FILL);
        line.setAttribute("stroke-width", COLORBAR_WIDTH*widthFactor);
        line.setAttribute("layer-id", this.gradient.layerId);
    }

    updatePositions() {
        const p = this.computePositions();

        this.svgElements.line.setAttribute("x1", p.lineStartX);
        this.svgElements.line.setAttribute("y1", p.lineStartY);
        this.svgElements.line.setAttribute("x2", p.lineEndX);
        this.svgElements.line.setAttribute("y2", p.lineEndY);

        this.svgElements.extender.setAttribute("x1", p.lineEndX);
        this.svgElements.extender.setAttribute("y1", p.lineEndY);
        this.svgElements.extender.setAttribute("x2", p.extenderEndX);
        this.svgElements.extender.setAttribute("y2", p.extenderEndY);

        this.svgElements.rotationButton.setAttribute("cx", p.rotationX);
        this.svgElements.rotationButton.setAttribute("cy", p.rotationY);
        
        const colors = this.gradient.colors;
        for (const colorId in colors) {
            this.svgElements.colors[colorId].setAttribute("cx", p.colors[colorId].x);
            this.svgElements.colors[colorId].setAttribute("cy", p.colors[colorId].y);
        }
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

    addInitialListeners() {
        const colors = this.gradient.colors;
        let startId = Object.keys(colors)[0];
        let endId = startId;
        for (const colorId in colors) {
            startId = colors[colorId].position < colors[startId].position ? colorId : startId;
            endId = colors[colorId].position > colors[endId].position ? colorId : endId;
        }
        this.svgElements.colors[startId].addEventListener("mousedown", handleStartColorMouseDown);
        this.svgElements.colors[endId].addEventListener("mousedown", handleEndColorMouseDown);
        this.svgElements.line.addEventListener("click", handleColorbarClick);
    }
}

class Gradient {
    constructor(colors = DEFAULT_COLORS) {
        this.layerId = numberOfLayers;
        numberOfLayers++;
        this.colors = Object.assign({}, DEFAULT_COLORS);
        this.totalNumberOfColors = DEFAULT_COLORS.length;
        this.sortColors();
        this.colorbar = new Colorbar(this);
        this.gradientString;
    }

    updateGradient() {
        this.sortColors();
        const direction = this.colorbar.direction + 90;
        const colorString = this.sortedColors.map(obj => `${obj.color} ${obj.position}%`).join(", ");
        this.gradientString = `linear-gradient(${direction}deg, ${colorString})`;
        previewWindow.style.backgroundImage = this.gradientString;
        console.log(this.gradientString);
    }

    // Creates an array of objects containing colors and associated positions on the gradient.
    // The array is sorted by position, so that the order becomes correct in the CSS gradient.
    sortColors() {
        this.sortedColors = Object.values(this.colors);
        this.sortedColors.sort((a, b) => a.position > b.position ? 1 : -1);
    }

    addColor(color, position) {
        this.totalNumberOfColors++;
        this.colors[this.totalNumberOfColors] = {position: position, color: color};
        this.colorbar.addColor(color, this.totalNumberOfColors);
        this.updateGradient();
    }

    updateColor(color, colorId) {
        this.colors[colorId].color = color;
        this.colorbar.updateColor(color, colorId);
        this.updateGradient();
    }
}

function hideColorbar() {

}

function handleRotation() {

}

function rotateColorbar() {

}

function handleStartColorMouseDown() {
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
    gradientObject.colorbar.updateLineStart(e.offsetX, e.offsetY);
    gradientObject.updateGradient();
}

function handleEndColorMouseDown() {
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
    gradientObject.colorbar.updateLineEnd(e.offsetX, e.offsetY);
    gradientObject.updateGradient();
}

function handleColorbarClick(e) {
    const parentGradientObject = gradientArray[this.getAttribute("layer-id")];
    const lineStart = {x: this.getAttribute("x1"), y: this.getAttribute("y1")};
    const lineEnd = {x: this.getAttribute("x2"), y: this.getAttribute("y2")};
    const clickPosition = {x: e.offsetX, y: e.offsetY};
    const colorPosition = 100 * computeWeightOfNearestPointOnLine(clickPosition, lineStart, lineEnd);
    parentGradientObject.addColor(DEFAULT_NEW_COLOR, colorPosition);
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