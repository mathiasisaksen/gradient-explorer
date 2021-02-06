
let COLORBAR_LENGTH;
let COLORBAR_WIDTH;
let COLORBAR_RADIUS;
const COLORBAR_FILL = "#222222"
let COLORBAR_CIRCLE_STROKE;
const COLORBAR_INITIAL_DIRECTION = 45;
let COLORBAR_PADDING;
const DEFAULT_COLORS = [{position: 0, color: "#ff95f3"}, {position: 100, color: "#008080"}];
const DEFAULT_NEW_COLOR = "#FFFFFF";
const MAX_RANDOM_COLORS = 10;
const BACKGROUND_COLOR = "#FFFFFF";
const BASELINE_BODY_GRADIENT = "linear-gradient(0deg, #000000aa 0%, #000000aa 100%)";

function setSVGScale() {
    let responsiveScale;
    if (window.innerWidth < 600) {
        responsiveScale = 3;
        COLORBAR_LENGTH = 200;
    } else {
        responsiveScale = 1.5;
        COLORBAR_LENGTH = 100;
    }
    COLORBAR_WIDTH = 2.8*responsiveScale;
    COLORBAR_RADIUS = 4*responsiveScale;
    COLORBAR_CIRCLE_STROKE = 0.6*responsiveScale;
    COLORBAR_PADDING = 0.4*responsiveScale;
}
setSVGScale();

window.addEventListener("resize", setSVGScale);

const body = document.querySelector("body");
const colorButton = document.querySelector("#color-button");
const colorInput = document.querySelector("#color-selector");
const opacityInput = document.querySelector("#opacity-selector");
const previewWindow = document.querySelector("#preview-window");
const colorbarContainer = document.querySelector("#colorbar-container");
const hideButton = document.querySelector("#hide-colorbar");
const layerList = document.querySelector("#layer-list");
const addLayerButton = document.querySelector("#layer-button");
const previewWindowButtonContainer = document.querySelector("#preview-button-container");
const showCurrentButton = document.querySelector("#current-layer-button");
const showAllButton = document.querySelector("#all-layers-button");
const copyTotalCSSButton = document.querySelector("#copy-combined-css");
const removeColorButton = document.querySelector("#remove-color-button");
const addRandomLayerButton = document.querySelector("#random-layer-button");
const showMenuButton = document.querySelector("#menu-button");
const closeMenuButton = document.querySelector("#close-menu-button");
const layerPanel = document.querySelector("#layer-panel");
const showInfoButton = document.querySelector("#info-button");
const closeInfoButton = document.querySelector("#close-info-button");
const infoScreen = document.querySelector("#info-screen");

opacityInput.value = "100";
previewWindow.style.backgroundColor = BACKGROUND_COLOR;
let numberOfLayers = 0;
let currentColorId = null;
let currentLayerId = null;
let showAllLayers = false;
let showAllColorbars = false;
let currentLayerContainer;


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

function setColorOpacity(hexColor, opacity) {
    const hexOpacity = Math.floor(255 * opacity).toString(16).padStart(2, "0");
    const colorWithoutOpacity = stripColorOpacity(hexColor);
    return(colorWithoutOpacity + hexOpacity);
}

function stripColorOpacity(hexColor) {
    if (hexColor.length > 7) {
        return(hexColor.slice(0, 7));
    }
    return(hexColor);
}

function getColorOpacity(hexColor) {
    if (hexColor.length < 9) {
        return(1)
    }
    return(parseInt(hexColor.slice(-2), 16)/255);
}

function getIndexOfElementInParent(element) {
    return([...element.parentNode.childNodes].indexOf(element));
}

function generateRandomColor() {
    const red = Math.floor(256*Math.random()).toString(16).padStart(2, "0");;
    const green = Math.floor(256*Math.random()).toString(16).padStart(2, "0");;
    const blue = Math.floor(256*Math.random()).toString(16).padStart(2, "0");;
    const opacity = Math.random();
    const color = "#" + red + green +  blue;
    return(setColorOpacity(color, opacity));
}

class Colorbar {
    constructor(gradient) {
        this.gradient = gradient;

        this.svgElements = {};
        
        this.startColorId = Object.keys(gradient.colors)[0];
        this.endColorId = this.startColorId;
        const colors = gradient.colors;
        for (const colorId in colors) {
            this.startColorId = colors[colorId].position < colors[this.startColorId].position ? colorId : this.startColorId;
            this.endColorId = colors[colorId].position > colors[this.endColorId].position ? colorId : this.endColorId;
        }
        this.initialSVGSetup();
    }

    initialSVGSetup() {
        this.lineStartX = - COLORBAR_LENGTH / 2 * 
            Math.cos(COLORBAR_INITIAL_DIRECTION * Math.PI / 180);
        this.lineStartY = - COLORBAR_LENGTH / 2 * 
            Math.sin(COLORBAR_INITIAL_DIRECTION * Math.PI / 180);
        this.lineEndX = COLORBAR_LENGTH / 2 * 
            Math.cos(COLORBAR_INITIAL_DIRECTION * Math.PI / 180);
        this.lineEndY = COLORBAR_LENGTH / 2 * 
            Math.sin(COLORBAR_INITIAL_DIRECTION * Math.PI / 180);
        this.setupSVGStructure();
        this.updateSVGPositions();
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
        const colorElement = this.generateColorElement(color, colorId);
        const colorContainer = document.querySelector(`.svg-color-container[layer-id="${this.gradient.layerId}"]`)
        colorContainer.append(colorElement);
        this.svgElements.colors[colorId] = colorElement;
        this.updateSVGPositions();

        colorElement.addEventListener("pointerdown", handleColorMouseDown);
        colorElement.addEventListener("click", handleColorClick);
        handleColorClick.call(colorElement);
    }

    updateColor(color, colorId) {
        this.svgElements.colors[colorId].setAttribute("fill", color);
    }

    removeColor(colorId) {
        if (colorId == this.startColorId || colorId == this.endColorId) {
            return(false);
        }
        const colorToRemove = this.colorContainer.querySelector(`[color-id="${colorId}"]`);
        colorToRemove.remove();
        return(true);
    }

    setupSVGStructure() {
        const elements = {};
        const colorbarElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
        colorbarElement.classList.add("svg-colorbar-container");
        colorbarElement.setAttribute("layer-id", this.gradient.layerId);
        
        // Contains the main part of the colorbar, except the color circles
        const structureContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        structureContainer.setAttribute("layer-id", this.gradient.layerId);

        // Main line, on which the colors are placed
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        this.setLineAttributes(line, 1, "");
        line.classList.add("svg-colorline");
        
        elements.line = line;
        structureContainer.append(line);

        colorbarElement.append(structureContainer);

        // Contains the color circles
        const colorContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        colorContainer.classList.add("svg-color-container");
        const colors = this.gradient.colors;
        colorContainer.setAttribute("layer-id", this.gradient.layerId);
        elements.colors = {};
        for (const colorId in this.gradient.colors) {
            // colors[colorId].color? Future me is going to hate this
            const colorElement = this.generateColorElement(colors[colorId].color, colorId);
            elements.colors[colorId] = colorElement;
            colorContainer.append(colorElement);
        }
        colorbarElement.append(colorContainer);
        
        colorbarContainer.append(colorbarElement);

        this.colorContainer = colorContainer;
        this.colorbarElement = colorbarElement;
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

    updateSVGPositions() {
        const p = this.computePositions();

        this.svgElements.line.setAttribute("x1", p.lineStartX);
        this.svgElements.line.setAttribute("y1", p.lineStartY);
        this.svgElements.line.setAttribute("x2", p.lineEndX);
        this.svgElements.line.setAttribute("y2", p.lineEndY);

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
    }

    getLineStart() {
        const line = this.svgElements.line;
        return({x: line.getAttribute("x1"), y: line.getAttribute("y1")});
    }

    updateLineEnd(x, y) {
        this.lineEndX = x;
        this.lineEndY = y;
    }

    getLineEnd() {
        const line = this.svgElements.line;
        return({x: line.getAttribute("x2"), y: line.getAttribute("y2")});
    }

    addInitialListeners() {
        const colors = this.gradient.colors;

        this.svgElements.colors[this.startColorId].addEventListener("pointerdown", 
            handleStartColorMouseDown);
        this.svgElements.colors[this.endColorId].addEventListener("pointerdown", 
            handleEndColorMouseDown);
        this.svgElements.line.addEventListener("click", handleColorbarClick);
    }
}

class Gradient {
    constructor(layerId, colors = DEFAULT_COLORS) {
        this.layerId = layerId;
        // Ugly fix for removing references to array passed in Object.assign
        const colorNoReference = JSON.parse(JSON.stringify(colors));
        // Creates object on the form {0: {color: #, position: #}, 1: {color: #, position#}}
        this.colors = Object.assign({}, colorNoReference);
        /*this.opacity = color.map(color => 100);*/
        this.totalNumberOfColors = DEFAULT_COLORS.length;
        this.sortColors();
        this.colorbar = new Colorbar(this);
        this.gradientString;
    }

    updateGradient() {
        this.sortColors();
        const direction =  this.colorbar.direction + 90;
        const colorString = this.sortedColors.map(obj => `${obj.color} ${obj.position}%`).join(", ");
        this.gradientString = `linear-gradient(${direction.toFixed(2)}deg, ${colorString})`;
    }

    // Creates an array of objects containing colors and associated positions on the gradient.
    // The array is sorted by position, so that the order becomes correct in the CSS gradient.
    sortColors() {
        this.sortedColors = Object.values(this.colors);
        this.sortedColors.sort((a, b) => a.position > b.position ? 1 : -1);
    }

    addColor(color, position) {
        this.colors[this.totalNumberOfColors] = {position: position, color: color};
        this.colorbar.addColor(color, this.totalNumberOfColors);
        this.updateGradient();
        this.totalNumberOfColors++;
    }

    getColor(colorId) {
        return(this.colors[colorId].color);
    }

    updateColor(color, colorId) {
        this.colors[colorId].color = color;
        this.colorbar.updateColor(color, colorId);
        this.updateGradient();
    }

    updateColorPosition(position, colorId) {
        this.colors[colorId].position = position;
        this.colorbar.updateSVGPositions();
        this.updateGradient();
    };

    removeColor(colorId) {
        const colorRemoved = this.colorbar.removeColor(colorId);
        if (colorRemoved) {
            delete this.colors[colorId]
            this.updateGradient();
            this.totalNumberOfColors--;
        }
        return(colorRemoved);
    }
}

class Layer {
    constructor(layerId) {
        this.layerId = layerId;
        this.setupLayerHTML();
        this.gradient = new Gradient(this.layerId, DEFAULT_COLORS);
        this.layerContainer;
        this.hiddenColorbar = false; // True only when colorbar has been hidden with button
        this.hiddenLayer = false;
        this.update();
    }

    toggleHidden() {
        this.hiddenLayer = !this.hiddenLayer;
        this.layerContainer.classList.toggle("hidden-layer");
        if (this.hiddenLayer && !this.hiddenColorbar) {
            this.hideColorbar()
        } else if (!this.hiddenLayer && !this.hiddenColorbar) {
            if (this.layerId != currentLayerId) return;
            this.showColorbar();
        }
    }

    hideColorbar() {
        this.gradient.colorbar.colorbarElement.classList.add("hidden");
    }

    hideColorbarManually() {
        this.hideColorbar();
        this.hiddenColorbar = true;
    }

    showColorbar() {
        this.gradient.colorbar.colorbarElement.classList.remove("hidden");
    }

    showColorbarManually() {
        this.showColorbar();
        this.hiddenColorbar = false;
    }

    get gradientString() {
        return(this.gradient.gradientString);
    }

    update() {
        this.gradient.updateGradient();
    }

    focusColorSelector() {
        const colorbar = this.gradient.colorbar;
        const colors = this.gradient.colors;
        const layerId = this.layerId;
        const colorId = colorbar.startColorId;
        currentColorId = colorId;

        const currentColor = colors[colorId].color;
        const colorWithOpacity = stripColorOpacity(currentColor);
        colorButton.style.backgroundColor = colorWithOpacity;
        colorInput.value = colorWithOpacity;
        opacityInput.value = getColorOpacity(currentColor);
    }

    setupLayerHTML() {
        const layerContainer = document.createElement("div");
        layerContainer.classList.add("layer-container");
        layerContainer.setAttribute("layer-id", this.layerId);

        const hideContainer = document.createElement("div");
        hideContainer.classList.add("hide-layer-container");
        const hideButton = document.createElement("div");
        hideButton.classList.add("hide-layer-button");
        hideButton.setAttribute("title", "Toggles the layers visibility");
        hideButton.setAttribute("layer-id", this.layerId);
        hideButton.addEventListener("click", handleLayerHide);

        hideContainer.append(hideButton);
        layerContainer.append(hideContainer);

        const layerTitle = document.createElement("div");
        layerTitle.classList.add("layer-title")
        layerTitle.setAttribute("layer-id", this.layerId);
        const layerText = document.createElement("p");
        layerText.innerText = `Layer ${this.layerId + 1}`;
        layerTitle.append(layerText);
        layerTitle.addEventListener("click", handleTitleClick);
        layerContainer.append(layerTitle);

        const layerButtonContainer = document.createElement("div");
        layerButtonContainer.classList.add("layer-button-container");

        const layerOpacityContainer = document.createElement("div");
        layerOpacityContainer.classList.add("layer-opacity-container");

        const cssButton = document.createElement("button");
        cssButton.classList.add("layer-button", "layer-css-button");
        cssButton.setAttribute("layer-id", this.layerId);
        cssButton.textContent = "Copy CSS";
        cssButton.setAttribute("title", "Copies the CSS code of the layer's gradient to your clipbaord");
        cssButton.addEventListener("click", handleCopyLayerCSS);
        layerButtonContainer.append(cssButton);

        const upButton = document.createElement("button");
        upButton.classList.add("layer-button", "direction-button", "up-button");
        upButton.setAttribute("layer-id", this.layerId);
        upButton.textContent = "▲";
        upButton.setAttribute("title", "Moves the layer up");
        upButton.addEventListener("click", handleMoveLayerUp);
        layerButtonContainer.append(upButton);

        const downButton = document.createElement("button");
        downButton.classList.add("layer-button", "direction-button", "down-button");
        downButton.setAttribute("layer-id", this.layerId);
        downButton.textContent = "▼";
        downButton.setAttribute("title", "Moves the layer down");
        downButton.addEventListener("click", handleMoveLayerDown);
        layerButtonContainer.append(downButton);

        const removeButton = document.createElement("button");
        removeButton.classList.add("layer-button", "direction-button", "remove-button");
        removeButton.setAttribute("layer-id", this.layerId);
        removeButton.textContent = "×";
        removeButton.setAttribute("title", "Removes the layer");
        removeButton.addEventListener("click", handleRemoveLayer);
        layerButtonContainer.append(removeButton);

        layerContainer.append(layerButtonContainer);

        layerList.prepend(layerContainer);
        this.layerContainer = layerContainer;

    }
}

function setCurrentLayer(layerContainer) {
    const oldCurrentLayer = layerList.querySelector(".current-layer");
    if (oldCurrentLayer) {
        oldCurrentLayer.classList.remove("current-layer");
        const oldId = oldCurrentLayer.getAttribute("layer-id");
        layerObjects[oldId].hideColorbar();
    }
    layerContainer.classList.add("current-layer");
    currentLayerContainer = layerContainer;
    currentLayerId = currentLayerContainer.getAttribute("layer-id");
    setWindowButtonClickable(!currentLayerContainer.classList.contains("hidden-layer"));
    if (layerObjects[currentLayerId]) {
        hideButton.textContent = layerObjects[currentLayerId].hiddenColorbar ? 
            "Show colorbar" : "Hide colorbar";
    }
    layerObjects[currentLayerId].focusColorSelector();
    if (!layerObjects[currentLayerId].hiddenColorbar) {

    layerObjects[currentLayerId].showColorbar();
    }
    updatePreviewWindow();
}

function handleHideColorbar() {
    if (!currentLayerContainer) return; 
    if (!currentLayerContainer.classList.contains("hidden-layer")) {
        const layerObject = layerObjects[currentLayerId];
        if (layerObject.hiddenColorbar) {
            layerObject.showColorbarManually();
            hideButton.textContent = "Hide colorbar";
        } else {
            layerObject.hideColorbarManually();
            hideButton.textContent = "Show colorbar";
        }
    }
}

function getRelativePosition(e) {
    const boundRect = previewWindow.getBoundingClientRect();
    return({x: 100*(e.clientX - boundRect.x - boundRect.width / 2)/(boundRect.width / 2),
            y: 100*(e.clientY - boundRect.y - boundRect.height / 2)/(boundRect.width / 2)});
}

function handleStartColorMouseDown() {
    handleColorClick.call(this);
    updatePreviewWindow();
    const layerObject = layerObjects[this.getAttribute("layer-id")];
    function currentHandler(event) {
        handleStartColorMove(event, layerObject);
    } 
    previewWindow.addEventListener("pointermove", currentHandler);
    const eventRemove = () => previewWindow.removeEventListener("pointermove", currentHandler);
    previewWindow.addEventListener("pointerup", eventRemove);
    previewWindow.addEventListener("pointerleave", eventRemove);
}

function handleStartColorMove(e, layerObject) {
    const position = getRelativePosition(e);
    layerObject.gradient.colorbar.updateLineStart(position.x, position.y);
    layerObject.gradient.colorbar.updateSVGPositions();
    layerObject.update();
    updatePreviewWindow();
}

function handleEndColorMouseDown() {
    handleColorClick.call(this);
    updatePreviewWindow();
    const layerObject = layerObjects[this.getAttribute("layer-id")];
    function currentHandler(event) {
        handleEndColorMove(event, layerObject);
    } 
    previewWindow.addEventListener("pointermove", currentHandler);
    const eventRemove = () => previewWindow.removeEventListener("pointermove", currentHandler);
    previewWindow.addEventListener("pointerup", eventRemove);
    previewWindow.addEventListener("pointerleave", eventRemove);
}

function handleEndColorMove(e, layerObject) {
    const position = getRelativePosition(e);
    layerObject.gradient.colorbar.updateLineEnd(position.x, position.y);
    layerObject.gradient.colorbar.updateSVGPositions();
    layerObject.update();
    updatePreviewWindow();
}

function handleColorbarClick(e) {
    const layerObject = layerObjects[this.getAttribute("layer-id")];
    const lineStart = {x: this.getAttribute("x1"), y: this.getAttribute("y1")};
    const lineEnd = {x: this.getAttribute("x2"), y: this.getAttribute("y2")};
    const clickPosition = getRelativePosition(e);
    const colorPosition = 100 * computeWeightOfNearestPointOnLine(clickPosition, lineStart, lineEnd);
    layerObject.gradient.addColor(DEFAULT_NEW_COLOR, colorPosition);
    updatePreviewWindow();
}

function handleColorMouseDown() {
    const layerObject = layerObjects[this.getAttribute("layer-id")];
    const lineStart = layerObject.gradient.colorbar.getLineStart();
    const lineEnd = layerObject.gradient.colorbar.getLineEnd();
    const colorId = this.getAttribute("color-id");
    function currentHandler(event) {
        handleColorMove(event, lineStart, lineEnd, colorId, layerObject);
    } 
    previewWindow.addEventListener("pointermove", currentHandler);
    const eventRemove = () => previewWindow.removeEventListener("pointermove", currentHandler);
    previewWindow.addEventListener("pointerup", eventRemove);
    previewWindow.addEventListener("pointerleave", eventRemove);
    updatePreviewWindow();
}

function handleColorMove(e, lineStart, lineEnd, colorId, layerObject) {
    const clickPosition = getRelativePosition(e);
    const colorPosition = 100 * computeWeightOfNearestPointOnLine(clickPosition, lineStart, lineEnd);
    layerObject.gradient.updateColorPosition(colorPosition, colorId);
    layerObject.update();
    updatePreviewWindow();
}

function handleColorClick() {
    const layerId = this.getAttribute("layer-id");
    const colorId = this.getAttribute("color-id");
    currentColorId = colorId;
    if (layerId !== currentLayerId) {
        const correspondingLayerContainer = layerList.querySelector(`[layer-id="${layerId}"]`);
        setCurrentLayer(correspondingLayerContainer);
    }
    currentColor = this.getAttribute("fill");
    const colorWithOpacity = stripColorOpacity(currentColor);
    colorButton.style.backgroundColor = colorWithOpacity;
    colorInput.value = colorWithOpacity;
    opacityInput.value = getColorOpacity(currentColor);
}

function handleColorChange() {
    const currentColor = this.value;
    colorButton.style.backgroundColor = currentColor;
    const currentOpacity = opacityInput.value;
    const colorWithOpacity = setColorOpacity(currentColor, currentOpacity);
    const currentGradient = layerObjects[currentLayerId].gradient;
    if (currentGradient) {
        currentGradient.updateColor(colorWithOpacity, currentColorId);   
    }
    updatePreviewWindow();
}

function handleOpacityChange() {
    const currentOpacity = this.value;
    const currentColor = colorInput.value;
    const colorWithOpacity = setColorOpacity(currentColor, currentOpacity);
    const currentGradient = layerObjects[currentLayerId].gradient;
    if (currentGradient) {
        currentGradient.updateColor(colorWithOpacity, currentColorId);
    }
    updatePreviewWindow();
}

function handleMoveLayerUp() {
    const layerContainer = this.closest(".layer-container");
    const oldIndex = getIndexOfElementInParent(layerContainer);
    if (!layerContainer.previousSibling) return;
    layerList.insertBefore(layerContainer, layerContainer.previousSibling);
    updatePreviewWindow();
}

function handleMoveLayerDown() {
    const layerContainer = this.closest(".layer-container");
    if (!layerContainer.nextSibling) return;
    layerList.insertBefore(layerContainer, layerContainer.nextSibling.nextSibling);
    updatePreviewWindow();
}

function handleRemoveLayer() {
    const layerContainer = this.closest(".layer-container");
    const layerId = layerContainer.getAttribute("layer-id");
    const isCurrent = layerContainer.classList.contains("current-layer");
    const nextCurrentLayer = layerContainer.previousSibling || layerContainer.nextSibling;
    layerList.removeChild(layerContainer);
    delete layerObjects[layerId];
    if (isCurrent && nextCurrentLayer) {
        nextCurrentLayer.classList.add("current-layer");
        setCurrentLayer(nextCurrentLayer);
    }  else {
        currentLayerContainer = null;
        currentLayerId = null;
    }
    if (!layerList.hasChildNodes()) {
        setWindowButtonClickable(false);
    }
    const remainingElements = document.querySelectorAll(`[layer-id="${layerId}"]`);
    [...remainingElements].forEach(node => node.parentNode.removeChild(node));
    updatePreviewWindow();
}

function handleTitleClick() {
    const layerContainer = this.closest(".layer-container");
    const layerId = layerContainer.getAttribute("layer-id");
    if (layerId !== currentLayerId) {
        setCurrentLayer(layerContainer);
    }
}

function handleLayerHide() {
    const layerId = this.getAttribute("layer-id");
    layerObjects[layerId].toggleHidden();
    if (layerId === currentLayerId) {
        setWindowButtonClickable(!layerObjects[layerId].hiddenLayer);
    }
    updatePreviewWindow();
}

function handleAddLayer() {
    const onlyLayer = Object.keys(layerObjects).length === 0;
    const newLayer = new Layer(numberOfLayers++);
    layerObjects[newLayer.layerId] = newLayer;
    /*layerList.childNodes[0].classList.add("current-layer");*/
    setCurrentLayer(layerList.childNodes[0]);
}

function handleAddRandomLayer() {
    handleAddLayer();
    const numColors = 2 + Math.floor((MAX_RANDOM_COLORS - 1)*Math.random());
    let randomColors = [];
    let randomPositions = [];
    for (let i = 0; i < numColors; i++) {
        randomColors.push(generateRandomColor());
        randomPositions.push(10 + 81*Math.random());
    }
    layerObjects[currentLayerId].gradient.updateColor(randomColors[0], 0);
    layerObjects[currentLayerId].gradient.updateColor(randomColors[1], 1);

    for (let i = 2; i < numColors; i++) {
        layerObjects[currentLayerId].gradient.addColor(randomColors[i], i);
        layerObjects[currentLayerId].gradient.updateColorPosition(randomPositions[i], i);
    }
    updatePreviewWindow();
}

function handleShowCurrentLayer() {
    showAllLayers = false;
    showCurrentButton.classList.add("layer-preview-choice");
    showAllButton.classList.remove("layer-preview-choice");
    updatePreviewWindow();
}

function handleShowAllLayers() {
    showAllLayers = true;
    showAllButton.classList.add("layer-preview-choice");
    showCurrentButton.classList.remove("layer-preview-choice");
    updatePreviewWindow();
}

function handleCopyLayerCSS() {
    const layerId = this.getAttribute("layer-id");
    const gradientString = layerObjects[layerId].gradientString;
    navigator.clipboard.writeText(gradientString);
}

function handleCopyFullCSS() {
    let gradientString = getFullGradientString();
    gradientString = gradientString ? gradientString : "none";
    navigator.clipboard.writeText(gradientString);
}

function handleRemoveColor() {
    if (!currentLayerId || !currentColorId) return;
    layerObjects[currentLayerId].gradient.removeColor(currentColorId);
    updatePreviewWindow();
}

function handleShowMenu() {
    layerPanel.style.display = "flex";
}

function handleCloseMenu() {
    layerPanel.style.display = "none";
}

function handleShowInfo() {
    infoScreen.style.display = "flex";
}

function handleCloseInfo() {
    infoScreen.style.display = "none";
}

function getCurrentGradientString() {
    if (!Object.keys(layerObjects).length) return("");

    if (!layerObjects[currentLayerId].hiddenLayer) {
        return(layerObjects[currentLayerId].gradientString);
    } else {
        return("");
    }
}

function getFullGradientString() {
    if (!Object.keys(layerObjects).length) return;

    let gradientStringArray = [];
    const layerArray = [...layerList.childNodes];
    
    for (const layerIndex in layerArray) {
        const layerContainer = layerArray[layerIndex];
        const layerId = layerContainer.getAttribute("layer-id");
        const layerObject = layerObjects[layerId];
        if (!layerObject.hiddenLayer) {
            gradientStringArray.push(layerObject.gradientString);
        }
    }
    let combinedGradientString = gradientStringArray.join(", ");
    return(combinedGradientString);
}

function updatePreviewWindow() {
    let gradientString;
    if (showAllLayers) {
        gradientString = getFullGradientString();
    } else {
        gradientString = getCurrentGradientString();
    }
    gradientString = gradientString ? gradientString : "none";
    previewWindow.style.backgroundImage = gradientString;
    body.style.backgroundImage = `${BASELINE_BODY_GRADIENT}, ${gradientString}`;
}

function setWindowButtonClickable(clickable) {
    if (clickable) {
        previewWindowButtonContainer.classList.remove("unclickable");
    } else {
        previewWindowButtonContainer.classList.add("unclickable");  
    }
}

addLayerButton.addEventListener("click", handleAddLayer);
addRandomLayerButton.addEventListener("click", handleAddRandomLayer);
// Listen for clicks on color circle, trigger color input
colorButton.addEventListener("click", () => colorInput.click());
// Update after giving input
colorInput.addEventListener("input", handleColorChange);

// Listen for changes in opacity
opacityInput.addEventListener("input", handleOpacityChange);

hideButton.addEventListener("click", handleHideColorbar);

showCurrentButton.addEventListener("click", handleShowCurrentLayer);
showAllButton.addEventListener("click", handleShowAllLayers);

copyTotalCSSButton.addEventListener("click", handleCopyFullCSS);

removeColorButton.addEventListener("click", handleRemoveColor);

showMenuButton.addEventListener("click", handleShowMenu);
closeMenuButton.addEventListener("click", handleCloseMenu);

showInfoButton.addEventListener("click", handleShowInfo);
closeInfoButton.addEventListener("click", handleCloseInfo);

const layerObjects = {};
addLayerButton.click();
showCurrentButton.click();