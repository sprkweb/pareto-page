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
    SVG: 'http://www.w3.org/2000/svg'
}

class ParetoChart {
    #svg;
    #graph;

    constructor (svgElem) {
        this.#svg = svgElem
        this.#graph = new Graph(ParetoMaths.InverseCumulativeDistribution)
        this.#svg.appendChild(this.#graph.elem)
    }

    draw (options) {
        const { width, height } = options
        this.#graph.drawElem(options)
        this.#svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
}

class Graph {
    #elem;
    #f;

    constructor (f) {
        this.#f = f
        this.#createElem()
    }

    get elem () {
        return this.#elem
    }

    drawElem ({ startX, endX, precision, width, height }) {
        if (!this.#elem) this.#createElem()
        const path = this.#getSVGpath(startX, endX, precision, width, height)
        this.#elem.setAttribute('d', this.#path2str(path))
    }

    #createElem () {
        this.#elem = document.createElementNS(NS.SVG, 'path');
        this.#elem.setAttribute('class', 'chart-line')
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

const chartWrapper = document.getElementById('chart')
const chart = new ParetoChart(document.querySelector('#chart > svg'))

function refreshChart () {
    const { height, width } = chartWrapper.getBoundingClientRect();
    chart.draw({ height, width, startX: 0, endX: 0.99, precision: 0.005 })
}

refreshChart()
window.addEventListener('resize', function() {
    refreshChart()
})
