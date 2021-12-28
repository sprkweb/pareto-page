// Shape parameter for Pareto distribution to be 80/20 rule
const k8020 = Math.log(5) / Math.log(4)

const ParetoMaths = {
    LorenzCurve (F, k = k8020) {
        return 1 - (1 - F) ** (1 - 1 / k)
    }
}

const NS = {
    SVG: 'http://www.w3.org/2000/svg'
}

class ParetoChart {
    constructor (svgElem) {
        this._svg = svgElem
    }

    draw ({ startX = 1, endX = 10, precision = 0.1, width = 100, height = 100 }) {
        this._svg.innerHTML = ''

        const path = this.#getSVGpath(startX, endX, precision, width, height)
        const pathEl = this._svg.appendChild(document.createElementNS(NS.SVG, 'path'));
        pathEl.setAttribute('class', 'chart-line')
        pathEl.setAttribute('d', this.#path2str(path))

        this._svg.setAttribute('viewBox', `${path[0][0]} 0 ${width} ${height}`);
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
            point[0] * xScale,
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

    #f () {
        return ParetoMaths.LorenzCurve(...arguments)
    }
}

const chartWrapper = document.getElementById('chart')
const chart = new ParetoChart(document.querySelector('#chart > svg'))

function refreshChart () {
    const { height, width } = chartWrapper.getBoundingClientRect();
    chart.draw({ height, width, startX: 0, endX: 1, precision: 0.01 })
}

refreshChart()
window.addEventListener('resize', function(event) {
    refreshChart()
})
