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
        this.#selectedArea = new DistributionDisplay(graphParams.defaultPos, this.#graph)
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
    _graphParams;
    _graphCache;

    constructor (graphParams) {
        this._createElem()
        this._graphParams = graphParams
    }

    get elem () {
        return this._elem
    }

    getScaledGraph({ width, height }) {
        const { path, maxY } = this.#getGraph()
        return path.map((point) =>
            this.#scalePoint(point, { width, height, maxY }))
    }

    getScaledPoint({ width, height }, x) {
        const { maxY } = this.#getGraph()
        const point = [x, ParetoMaths.InverseCumulativeDistribution(x)]
        return this.#scalePoint(point, { maxY, width, height })
    }

    drawElem ({ width, height }) {
        const path = this.getScaledGraph({ width, height })
        this._elem.setAttribute('d', this.#path2str(path))
    }

    _createElem () {
        this._elem = document.createElementNS(NS.SVG, 'path');
        this._elem.setAttribute('class', 'chart-line')
    }

    #scalePoint (point, { width, height, maxY }) {
        return [
            (point[0] - this._graphParams.startX) * width / (this._graphParams.endX - this._graphParams.startX),
            (1 - point[1] / maxY) * height
        ]
    }

    #path2str (path) {
        return `M ${path[0][0]} ${path[0][1]} ` +
            path
                .slice(1)
                .map((point) => 'L ' + point[0] + ' ' + point[1])
                .join(' ')
    }

    #getGraph () {
        if (!this._graphCache) {
            let path = []
            let maxY = 0
            const { endX, startX, precision } = this._graphParams
            for (let curX = startX; curX < endX; curX += precision) {
                const y = ParetoMaths.InverseCumulativeDistribution(curX)
                path.push([curX, y])
                if (y > maxY) maxY = y
            }
            this._graphCache = { path, maxY }
        }
        return this._graphCache
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
        this._elemLine.setAttribute('y2', height + legendHeight)
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
        this._elem.appendChild(this._elemLine)
        this._elem.appendChild(this._elemHandle)
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

class DistributionDisplay {
    #pos;
    #canvasParams;
    #graph;

    constructor (defaultPos, graph) {
        this._createElem()
        this.#pos = defaultPos
        this.#graph = graph
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
        this._updatePos()
    }

    _createElem () {
        this._elem = document.createElementNS(NS.SVG, 'g');
        this._elemLeftArea = document.createElementNS(NS.SVG, 'text');
        this._elemRightArea = document.createElementNS(NS.SVG, 'text');
        this._elemLeftX = document.createElementNS(NS.SVG, 'text');
        this._elemRightX = document.createElementNS(NS.SVG, 'text');
        this._elem.appendChild(this._elemLeftArea)
        this._elem.appendChild(this._elemRightArea)
        this._elem.appendChild(this._elemLeftX)
        this._elem.appendChild(this._elemRightX)
    }

    _updatePos () {
        const { width, height, fontHeight, legendHeight } = this.#canvasParams
        const leftX = this.#pos / 2
        const rightX = this.#pos + (1 - this.#pos) / 2
        const leftPoint = this.#graph.getScaledPoint({ width, height }, leftX)
        const rightPoint = this.#graph.getScaledPoint({ width, height }, rightX)
        const area = ParetoMaths.LorenzCurve(this.#pos)


        this._elemLeftX.setAttribute('x', leftPoint[0])
        this._elemRightX.setAttribute('x', rightPoint[0])

        this._elemLeftX.setAttribute('y', height + (legendHeight + fontHeight) / 2)
        this._elemRightX.setAttribute('y', height + (legendHeight + fontHeight) / 2)

        this._elemLeftArea.setAttribute('x', leftPoint[0])
        this._elemRightArea.setAttribute('x', rightPoint[0])

        if (height - leftPoint[1] > fontHeight + 6)
            this._elemLeftArea.setAttribute('y', (leftPoint[1] + height + fontHeight) / 2)
        else
            this._elemLeftArea.setAttribute('y', leftPoint[1] - 5)

        if (height - rightPoint[1] > fontHeight + 6)
            this._elemRightArea.setAttribute('y', (rightPoint[1] + height + fontHeight) / 2)
        else
            this._elemRightArea.setAttribute('y', rightPoint[1] - 5)

        if (this.#pos > 0.05) {
            this._elemLeftX.innerHTML = Math.round(this.#pos * 100) + '%'
            this._elemLeftArea.innerHTML = Math.round(area * 100) + '%'
        } else {
            this._elemLeftX.innerHTML = ''
            this._elemLeftArea.innerHTML = ''
        }

        if (this.#pos < 0.95) {
            this._elemRightX.innerHTML = Math.round((1 - this.#pos) * 100) + '%'
            this._elemRightArea.innerHTML = Math.round((1 - area) * 100) + '%'
        } else {
            this._elemRightX.innerHTML = ''
            this._elemRightArea.innerHTML = ''
        }
    }
}

let chartWrapper, chart
const legendHeight = 30

function refreshChart () {
    const { height, width } = chartWrapper.getBoundingClientRect();
    chart.draw({
        height: height - legendHeight,
        width,
        legendHeight,
        fontHeight: 18
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
