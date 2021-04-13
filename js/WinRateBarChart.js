class WinRateBarChart {

    constructor(_config, _data, _dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 450,
            containerHeight: _config.containerHeight || 400,
            margin: {top: 55, right: 20, bottom: 20, left: 60}
        }
        this.data = _data;
        this.dispatcher = _dispatcher;
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.xScale = d3.scaleBand()
            .padding(0.1)
            .range([0, vis.width]);

        vis.yScale = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickSize(0)
            .tickFormat(d => d);

        vis.yAxis = d3.axisLeft(vis.yScale)
            // .tickSize(0)
            .tickFormat(d => (d * 100).toFixed(0) + " %");

        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`)

        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${vis.height + vis.config.margin.bottom/4})`)
            .style('font-size', '14px');

        // Append y-axis group
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'y-axis')
            .attr('transform', `translate(0,${-1})`)
            .style('font-size', '12px');

        vis.updateVis();

    }

    updateVis() {
        let vis = this;

        vis.grouped_data = d3.rollup(vis.data, d => d.length/vis.data.length, d => d.winner);

        vis.xScale.domain(['white', 'black', 'draw']);

        vis.yScale.domain([0, Math.ceil(d3.max(vis.grouped_data.values())/.075)*.075])

        vis.renderVis();
    }

    renderVis() {
        let vis = this;
        // add bars
        vis.chart.selectAll('rect')
            .data(vis.grouped_data)
            .join('rect')
            .attr('class', 'win-rate-bar')
            .attr('id', d => d[0])
            .attr('width', function(d) {
                return vis.xScale.bandwidth();
            })
            .attr('height', function(d) {
                return vis.height - vis.yScale(d[1]);
            })
            .attr("x", function(d) {
                return vis.xScale(d[0])
            })
            .attr('y', function (d) {
                return vis.yScale(d[1]);
            })
            .attr("padding", .5)
            .attr("fill", "#bfffc3")
            .attr("opacity", 1)
            .attr("style", "outline: 0.2px solid black;")
            .on("click", function(event, d) {
                // Check if current category is active and toggle class
                const isActive = d3.select(this).classed('active');
                d3.selectAll('.win-rate-bar.active').attr("fill", '#bfffc3')
                d3.selectAll('.win-rate-bar.active').classed('active', false);
                if (!isActive) {
                    d3.select(this).classed('active', !isActive);
                }

                if (isActive) {
                    d3.select(this).attr("fill", "#bfffc3")
                } else {
                    d3.select(this).attr("fill", "#02A031")
                }


                const selectedColor = d3.select(this).attr('id');
                vis.dispatcher.call('filter_color', event, selectedColor, isActive);
            });

        vis.xAxisG
            .call(vis.xAxis)
            .call(g => g.select('.domain').remove());


        vis.yAxisG
            .call(vis.yAxis)
            .call(g => g.select('.domain').remove())

    }
}