// Shape parameter for Pareto distribution to be 80/20 rule
const k8020 = Math.log(5) / Math.log(4)

const ParetoMaths = {
    InverseCumulativeDistribution (F, x_m = 1, k = k8020) {
        return x_m / (1 - F) ** (1 / k)
    },
    LorenzCurve (F, k = k8020) {
        return 1 - (1 - F) ** (1 - 1 / k)
    }
}

const NS = {
    SVG: 'http://www.w3.org/2000/svg',
    XLINK: 'http://www.w3.org/1999/xlink'
}

class ParetoChart {
    #svg;
    #graph;
    #divider;
    #axes;
    #selectedArea;

    constructor (svgElem, graphParams) {
        this.#svg = svgElem
        this.#graph = new Graph(graphParams)
        this.#divider = new VerticalDivider(this.#svg, graphParams.defaultPos)
        this.#axes = new Axes()
        this.#selectedArea = new SelectedArea(graphParams.defaultPos)
        this.#divider.onUpdatePos = (newPos) => {
            this.#selectedArea.pos = newPos
        }
        this.#svg.appendChild(this.#graph.elem)
        this.#svg.appendChild(this.#divider.elem)
        this.#svg.appendChild(this.#axes.elem)
        this.#svg.appendChild(this.#selectedArea.elem)
    }

    draw (canvasParams) {
        const { width, height, legendHeight } = canvasParams
        this.#graph.drawElem(canvasParams)
        this.#divider.drawElem(canvasParams)
        this.#axes.drawElem(canvasParams)
        this.#selectedArea.drawElem(canvasParams)
        this.#svg.setAttribute('viewBox', `0 0 ${width} ${height + legendHeight}`);
    }
}

class Graph {
    _elem;
    _startX;
    _endX;
    _precision;

    constructor (graphParams) {
        this._createElem()
        this._startX = graphParams.startX
        this._endX = graphParams.endX
        this._precision = graphParams.precision
    }

    get elem () {
        return this._elem
    }

    drawElem ({ width, height }) {
        const path = this.#getSVGpath(width, height)
        this._elem.setAttribute('d', this.#path2str(path))
    }

    _createElem () {
        this._elem = document.createElementNS(NS.SVG, 'path');
        this._elem.setAttribute('class', 'chart-line')
    }

    #getSVGpath (width, height) {
        let path = []
        let maxY = 0
        for (let curX = this._startX; curX < this._endX; curX += this._precision) {
            const y = ParetoMaths.InverseCumulativeDistribution(curX)
            path.push([curX, y])
            if (y > maxY) maxY = y
        }
        const xScale = width / (this._endX - this._startX)
        return path.map((point) => [
            point[0] * xScale - path[0][0] * xScale,
            (1 - point[1] / maxY) * height
        ])
    }

    #path2str (path) {
        return `M ${path[0][0]} ${path[0][1]} ` +
            path
                .slice(1)
                .map((point) => 'L ' + point[0] + ' ' + point[1])
                .join(' ')
    }
}

class VerticalDivider {
    #pos;
    #svgElem;
    onUpdatePos = () => {};

    constructor (svgElem, defaultPos) {
        this.#pos = defaultPos
        this.#svgElem = svgElem
        this._createElem()
    }

    get elem () {
        return this._elem
    }

    drawElem ({ width, height, legendHeight }) {
        const x = width * this.#pos
        this._elemLine.setAttribute('y2', height)
        this._elemLinePos.setAttribute('y', height + legendHeight)
        this._updateElemsPos(x)
        this._width = width
    }

    _createElem () {
        this._elem = document.createElementNS(NS.SVG, 'g');
        this._elemLine = document.createElementNS(NS.SVG, 'line');
        this._elemLine.setAttribute('class', 'divider')
        this._elemLine.setAttribute('y1', 0)
        this._elemHandle = document.createElementNS(NS.SVG, 'use');
        this._elemHandle.setAttributeNS(NS.XLINK, 'href', '#divider-handle');
        this._elemLinePos = document.createElementNS(NS.SVG, 'text');
        this.elem.appendChild(this._elemLine)
        this.elem.appendChild(this._elemHandle)
        this.elem.appendChild(this._elemLinePos)
        this._addDraggable()
    }

    _addDraggable () {
        let drag = false
        this.#svgElem.addEventListener('mousedown', (e) => {
            drag = true
            this._updatePos(e.offsetX)
        })
        this.#svgElem.addEventListener('mouseup', () => {
            drag = false
        })
        this.#svgElem.addEventListener('mousemove', (e) => {
            if (drag) {
                this._updatePos(e.offsetX)
            }
        })
    }

    _updatePos (x) {
        this._updateElemsPos(x)
        this.#pos = x / this._width
        this.onUpdatePos(this.#pos)
    }

    _updateElemsPos (x) {
        this._elemLine.setAttribute('x1', x)
        this._elemLine.setAttribute('x2', x)
        this._elemHandle.setAttribute('x', x)
        this._elemLinePos.setAttribute('x', x)
        this._elemLinePos.innerHTML = Math.floor(this.#pos * 100) + '%'
    }
}

class Axes {
    constructor () {
        this._createElem()
    }

    get elem () {
        return this._elem
    }

    drawElem ({ width, height }) {
        this._elem.setAttribute('y1', height)
        this._elem.setAttribute('y2', height)
        this._elem.setAttribute('x1', 0)
        this._elem.setAttribute('x2', width)
    }

    _createElem () {
        this._elem = document.createElementNS(NS.SVG, 'line');
        this._elem.setAttribute('class', 'axis')
    }
}

class SelectedArea {
    #pos;
    #canvasParams

    constructor (defaultPos) {
        this._createElem()
        this.#pos = defaultPos
    }

    set pos (val) {
        this.#pos = val
        this._updatePos()
    }

    get elem () {
        return this._elem
    }

    drawElem (canvasParams) {
        this.#canvasParams = canvasParams
        this._elem.setAttribute('y', this.#canvasParams.height)
        this._updatePos()
    }

    _createElem () {
        this._elem = document.createElementNS(NS.SVG, 'text');
    }

    _updatePos () {
        this._elem.setAttribute('x', (this.#pos / 2) * this.#canvasParams.width)
        const area = ParetoMaths.LorenzCurve(this.#pos)
        this._elem.innerHTML = Math.round(area * 100) + '%'
    }
}

let chartWrapper, chart
const legendHeight = 30

function refreshChart () {
    const { height, width } = chartWrapper.getBoundingClientRect();
    chart.draw({
        height: height - legendHeight,
        width,
        legendHeight
    })
}
window.addEventListener('load', function() {
    chartWrapper = document.getElementById('chart')
    chart = new ParetoChart(document.querySelector('#chart > svg'), {
        startX: 0,
        endX: 0.99,
        precision: 0.005,
        defaultPos: 0.8
    })
    refreshChart()
})
window.addEventListener('resize', function() {
    refreshChart()
})
