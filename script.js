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

    constructor (svgElem) {
        this.#svg = svgElem
        this.#graph = new Graph(ParetoMaths.InverseCumulativeDistribution)
        this.#divider = new VerticalDivider(0.8, this.#svg)
        this.#svg.appendChild(this.#graph.elem)
        this.#svg.appendChild(this.#divider.elem)
    }

    draw (options) {
        const { width, height, legendHeight } = options
        this.#graph.drawElem(options)
        this.#divider.drawElem(options)
        this.#svg.setAttribute('viewBox', `0 0 ${width} ${height + legendHeight}`);
    }
}

class Graph {
    _elem;
    #f;

    constructor (f) {
        this._createElem()
        this.#f = f
    }

    get elem () {
        return this._elem
    }

    drawElem ({ startX, endX, precision, width, height }) {
        const path = this.#getSVGpath(startX, endX, precision, width, height)
        this._elem.setAttribute('d', this.#path2str(path))
    }

    _createElem () {
        this._elem = document.createElementNS(NS.SVG, 'path');
        this._elem.setAttribute('class', 'chart-line')
    }

    #getSVGpath (startX, endX, precision, width, height) {
        let path = []
        let maxY = 0
        for (let curX = startX; curX < endX; curX += precision) {
            const y = this.#f(curX)
            path.push([curX, y])
            if (y > maxY) maxY = y
        }
        const xScale = width / (endX - startX)
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

    constructor (defaultPos, svgElem) {
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
    }

    _updateElemsPos (x) {
        this._elemLine.setAttribute('x1', x)
        this._elemLine.setAttribute('x2', x)
        this._elemHandle.setAttribute('x', x)
        this._elemLinePos.setAttribute('x', x)
        this._elemLinePos.innerHTML = Math.round(this.#pos * 100) + '%'
    }
}

let chartWrapper, chart

function refreshChart () {
    const { height, width } = chartWrapper.getBoundingClientRect();
    const legendHeight = 50
    chart.draw({
        height: height - legendHeight,
        width,
        legendHeight,
        startX: 0,
        endX: 0.99,
        precision: 0.005
    })
}
window.addEventListener('load', function() {
    chartWrapper = document.getElementById('chart')
    chart = new ParetoChart(document.querySelector('#chart > svg'))
    refreshChart()
})
window.addEventListener('resize', function() {
    refreshChart()
})
